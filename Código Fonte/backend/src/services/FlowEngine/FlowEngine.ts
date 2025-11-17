import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';
import { Flow, FlowNode, FlowExecution, FlowVariable, FlowExecutionStatus } from '../../models/Flow';
import WhatsAppProviderService from '../WhatsAppProviderService';
import { Ticket } from '../../models/Ticket';

// Types para o motor de fluxo
export interface FlowContext {
  ticketId: number;
  companyId: number;
  contactId: number;
  userId?: number;
  variables: Map<string, any>;
  sessionId: string;
  startTime: Date;
  currentNodeId?: string;
  executionId: string;
  history: FlowExecutionStep[];
}

export interface FlowExecutionStep {
  nodeId: string;
  nodeType: string;
  status: 'running' | 'completed' | 'error' | 'skipped';
  startTime: Date;
  endTime?: Date;
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
}

export interface FlowNodeConfig {
  id: string;
  type: FlowNodeType;
  name: string;
  config: Record<string, any>;
  position?: { x: number, y: number };
  connections?: Array<{
    targetNodeId: string;
    condition?: string;
    label?: string;
  }>;
}

export type FlowNodeType =
  | 'start'
  | 'end'
  | 'sendMessage'
  | 'condition'
  | 'menu'
  | 'delay'
  | 'apiCall'
  | 'webhook'
  | 'variable'
  | 'loop'
  | 'random'
  | 'assignment'
  | 'validation'
  | 'database'
  | 'tag'
  | 'queue'
  | 'humanHandoff'
  | 'analytics'
  | 'integration';

export interface FlowEngineConfig {
  maxExecutionTime: number; // ms
  maxSteps: number;
  debugMode: boolean;
  enablePersistence: boolean;
  retryAttempts: number;
  retryDelay: number; // ms
}

class FlowEngine extends EventEmitter {
  private activeExecutions: Map<string, FlowContext> = new Map();
  private nodeHandlers: Map<FlowNodeType, FlowNodeHandler> = new Map();
  private config: FlowEngineConfig;
  private service: WhatsAppProviderService;

  constructor(config: Partial<FlowEngineConfig> = {}) {
    super();

    this.config = {
      maxExecutionTime: 5 * 60 * 1000, // 5 minutos
      maxSteps: 100,
      debugMode: process.env.NODE_ENV === 'development',
      enablePersistence: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.service = WhatsAppProviderService.getInstance();
    this.initializeHandlers();
    this.startCleanupInterval();
  }

  // Inicializa os handlers para cada tipo de nó
  private initializeHandlers(): void {
    this.nodeHandlers.set('start', new StartNodeHandler());
    this.nodeHandlers.set('end', new EndNodeHandler());
    this.nodeHandlers.set('sendMessage', new SendMessageNodeHandler(this.service));
    this.nodeHandlers.set('condition', new ConditionNodeHandler());
    this.nodeHandlers.set('menu', new MenuNodeHandler());
    this.nodeHandlers.set('delay', new DelayNodeHandler());
    this.nodeHandlers.set('apiCall', new ApiCallNodeHandler());
    this.nodeHandlers.set('webhook', new WebhookNodeHandler());
    this.nodeHandlers.set('variable', new VariableNodeHandler());
    this.nodeHandlers.set('loop', new LoopNodeHandler());
    this.nodeHandlers.set('random', new RandomNodeHandler());
    this.nodeHandlers.set('assignment', new AssignmentNodeHandler());
    this.nodeHandlers.set('validation', new ValidationNodeHandler());
    this.nodeHandlers.set('database', new DatabaseNodeHandler());
    this.nodeHandlers.set('tag', new TagNodeHandler());
    this.nodeHandlers.set('queue', new QueueNodeHandler());
    this.nodeHandlers.set('humanHandoff', new HumanHandoffNodeHandler());
    this.nodeHandlers.set('analytics', new AnalyticsNodeHandler());
    this.nodeHandlers.set('integration', new IntegrationNodeHandler());
  }

  // Executa um fluxo
  async executeFlow(flow: Flow, initialContext: Partial<FlowContext>): Promise<FlowExecution> {
    const executionId = uuidv4();
    const sessionId = initialContext.sessionId || uuidv4();

    const context: FlowContext = {
      ticketId: initialContext.ticketId!,
      companyId: initialContext.companyId!,
      contactId: initialContext.contactId!,
      userId: initialContext.userId,
      variables: new Map(),
      sessionId,
      startTime: new Date(),
      executionId,
      history: [],
      ...initialContext
    };

    try {
      // Salvar execução no banco se habilitado
      if (this.config.enablePersistence) {
        await this.saveExecution(executionId, flow.id, context, 'running');
      }

      // Adicionar às execuções ativas
      this.activeExecutions.set(executionId, context);

      logger.info('Starting flow execution', {
        executionId,
        flowId: flow.id,
        flowName: flow.name,
        ticketId: context.ticketId,
        sessionId
      });

      // Encontrar nó inicial
      const startNode = flow.nodes.find(node => node.type === 'start');
      if (!startNode) {
        throw new Error('Flow must have a start node');
      }

      // Executar fluxo
      const result = await this.executeNode(flow, startNode, context);

      // Finalizar execução
      await this.finalizeExecution(executionId, flow.id, context, 'completed', result);

      logger.info('Flow execution completed successfully', {
        executionId,
        flowId: flow.id,
        duration: Date.now() - context.startTime.getTime(),
        steps: context.history.length
      });

      return result;

    } catch (error) {
      logger.error('Flow execution failed', {
        executionId,
        flowId: flow.id,
        error: error.message,
        duration: Date.now() - context.startTime.getTime()
      });

      await this.finalizeExecution(executionId, flow.id, context, 'error', { error: error.message });

      throw error;
    } finally {
      // Remover das execuções ativas
      this.activeExecutions.delete(executionId);
    }
  }

  // Executa um nó específico
  private async executeNode(flow: Flow, node: FlowNode, context: FlowContext): Promise<FlowExecution> {
    // Verificar limite de tempo
    if (Date.now() - context.startTime.getTime() > this.config.maxExecutionTime) {
      throw new Error('Flow execution timeout');
    }

    // Verificar limite de passos
    if (context.history.length >= this.config.maxSteps) {
      throw new Error('Maximum steps exceeded');
    }

    // Criar step de execução
    const step: FlowExecutionStep = {
      nodeId: node.id,
      nodeType: node.type,
      status: 'running',
      startTime: new Date(),
      input: { config: node.config }
    };

    context.history.push(step);
    context.currentNodeId = node.id;

    this.emit('nodeStarted', { executionId: context.executionId, nodeId: node.id, nodeType: node.type });

    try {
      const handler = this.nodeHandlers.get(node.type as FlowNodeType);
      if (!handler) {
        throw new Error(`No handler found for node type: ${node.type}`);
      }

      // Executar handler com retry
      const result = await this.executeWithRetry(
        () => handler.execute(flow, node, context),
        node.config.retryAttempts || this.config.retryAttempts
      );

      step.status = 'completed';
      step.endTime = new Date();
      step.output = result;
      step.duration = step.endTime.getTime() - step.startTime.getTime();

      this.emit('nodeCompleted', {
        executionId: context.executionId,
        nodeId: node.id,
        nodeType: node.type,
        result,
        duration: step.duration
      });

      // Determinar próximo nó
      const nextNode = await this.getNextNode(flow, node, context, result);

      if (nextNode) {
        return await this.executeNode(flow, nextNode, context);
      } else {
        // Fim do fluxo
        return {
          id: context.executionId,
          flowId: flow.id,
          status: 'completed',
          startTime: context.startTime,
          endTime: new Date(),
          context: this.serializeContext(context),
          steps: context.history,
          result
        };
      }

    } catch (error) {
      step.status = 'error';
      step.endTime = new Date();
      step.error = error.message;
      step.duration = step.endTime.getTime() - step.startTime.getTime();

      this.emit('nodeError', {
        executionId: context.executionId,
        nodeId: node.id,
        nodeType: node.type,
        error: error.message
      });

      // Se houver nó de erro configurado, tentar executá-lo
      const errorNode = this.findErrorNode(flow, node);
      if (errorNode) {
        logger.warn('Executing error node', {
          nodeId: errorNode.id,
          originalError: error.message
        });
        return await this.executeNode(flow, errorNode, context);
      }

      throw error;
    }
  }

  // Encontra o próximo nó a ser executado
  private async getNextNode(flow: Flow, currentNode: FlowNode, context: FlowContext, result: any): Promise<FlowNode | null> {
    if (currentNode.type === 'end') {
      return null;
    }

    // Se não tiver conexões, tentar encontrar o primeiro nó após o atual
    if (!currentNode.connections || currentNode.connections.length === 0) {
      const currentIndex = flow.nodes.findIndex(n => n.id === currentNode.id);
      return flow.nodes[currentIndex + 1] || null;
    }

    // Para nós condicionais, avaliar condições
    if (currentNode.type === 'condition') {
      for (const connection of currentNode.connections) {
        if (connection.condition) {
          const conditionMet = await this.evaluateCondition(connection.condition, context, result);
          if (conditionMet) {
            return flow.nodes.find(n => n.id === connection.targetNodeId) || null;
          }
        }
      }
      // Se nenhuma condição for atendida, seguir a primeira conexão sem condição
      const defaultConnection = currentNode.connections.find(c => !c.condition);
      if (defaultConnection) {
        return flow.nodes.find(n => n.id === defaultConnection.targetNodeId) || null;
      }
      return null;
    }

    // Para menu, seguir a conexão correspondente à escolha
    if (currentNode.type === 'menu') {
      const choice = result.choice;
      const connection = currentNode.connections.find(c =>
        c.condition === choice || c.label === choice
      );
      if (connection) {
        return flow.nodes.find(n => n.id === connection.targetNodeId) || null;
      }
    }

    // Para outros tipos, seguir a primeira conexão
    const firstConnection = currentNode.connections[0];
    if (firstConnection) {
      return flow.nodes.find(n => n.id === firstConnection.targetNodeId) || null;
    }

    return null;
  }

  // Encontra nó de erro
  private findErrorNode(flow: Flow, currentNode: FlowNode): FlowNode | null {
    // Implementar lógica para encontrar nó de erro global ou específico
    return flow.nodes.find(n => n.type === 'error' || n.config?.isErrorHandler) || null;
  }

  // Avalia condição
  private async evaluateCondition(condition: string, context: FlowContext, result: any): Promise<boolean> {
    try {
      // Implementar avaliação segura de condições
      const safeEval = new Function('context', 'result', `
        const { variables } = context;
        return ${condition};
      `);

      return safeEval(context, result);
    } catch (error) {
      logger.error('Condition evaluation failed', {
        condition,
        error: error.message
      });
      return false;
    }
  }

  // Executa com retry
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          logger.warn(`Operation failed, retrying in ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Finaliza execução
  private async finalizeExecution(
    executionId: string,
    flowId: string,
    context: FlowContext,
    status: FlowExecutionStatus,
    result?: any
  ): Promise<void> {
    try {
      if (this.config.enablePersistence) {
        await this.saveExecution(executionId, flowId, context, status, result);
      }

      this.emit('executionCompleted', {
        executionId,
        flowId,
        status,
        duration: Date.now() - context.startTime.getTime(),
        steps: context.history.length,
        context: this.serializeContext(context),
        result
      });

    } catch (error) {
      logger.error('Failed to finalize execution', {
        executionId,
        error: error.message
      });
    }
  }

  // Serializa contexto para salvar no banco
  private serializeContext(context: FlowContext): any {
    return {
      ticketId: context.ticketId,
      companyId: context.companyId,
      contactId: context.contactId,
      userId: context.userId,
      variables: Object.fromEntries(context.variables),
      sessionId: context.sessionId,
      startTime: context.startTime,
      currentNodeId: context.currentNodeId,
      executionId: context.executionId,
      history: context.history
    };
  }

  // Salva execução no banco
  private async saveExecution(
    executionId: string,
    flowId: string,
    context: FlowContext,
    status: FlowExecutionStatus,
    result?: any
  ): Promise<void> {
    try {
      await FlowExecution.upsert({
        id: executionId,
        flowId,
        ticketId: context.ticketId,
        companyId: context.companyId,
        contactId: context.contactId,
        userId: context.userId,
        sessionId: context.sessionId,
        status,
        startTime: context.startTime,
        endTime: status !== 'running' ? new Date() : undefined,
        variables: JSON.stringify(Object.fromEntries(context.variables)),
        currentNodeId: context.currentNodeId,
        steps: JSON.stringify(context.history),
        result: result ? JSON.stringify(result) : undefined
      });
    } catch (error) {
      logger.error('Failed to save execution', {
        executionId,
        error: error.message
      });
    }
  }

  // Para uma execução
  async stopExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }

    await this.finalizeExecution(executionId, '', context, 'stopped');
    this.activeExecutions.delete(executionId);

    logger.info('Flow execution stopped', { executionId });
  }

  // Obtém status de execução
  getExecutionStatus(executionId: string): FlowContext | null {
    return this.activeExecutions.get(executionId) || null;
  }

  // Obtém todas as execuções ativas
  getActiveExecutions(): Map<string, FlowContext> {
    return new Map(this.activeExecutions);
  }

  // Limpa execuções antigas
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldExecutions();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  private async cleanupOldExecutions(): Promise<void> {
    const now = Date.now();
    for (const [executionId, context] of this.activeExecutions) {
      if (now - context.startTime.getTime() > this.config.maxExecutionTime * 2) {
        logger.warn('Cleaning up stuck execution', { executionId });
        this.activeExecutions.delete(executionId);
      }
    }
  }

  // Estatísticas do motor
  getStats(): any {
    return {
      activeExecutions: this.activeExecutions.size,
      supportedNodes: this.nodeHandlers.size,
      config: this.config
    };
  }

  // Shutdown gracioso
  async shutdown(): Promise<void> {
    logger.info('Shutting down Flow Engine...');

    // Parar todas as execuções ativas
    const executions = Array.from(this.activeExecutions.keys());
    for (const executionId of executions) {
      try {
        await this.stopExecution(executionId);
      } catch (error) {
        logger.error('Failed to stop execution during shutdown', {
          executionId,
          error: error.message
        });
      }
    }

    this.removeAllListeners();
    logger.info('Flow Engine shutdown completed');
  }
}

// Interface base para handlers de nós
export abstract class FlowNodeHandler {
  abstract execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any>;

  protected parseVariables(text: string, context: FlowContext): string {
    if (!text) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = context.variables.get(varName);
      return value !== undefined ? String(value) : match;
    });
  }

  protected setVariable(name: string, value: any, context: FlowContext): void {
    context.variables.set(name, value);
  }

  protected getVariable(name: string, context: FlowContext): any {
    return context.variables.get(name);
  }
}

export default FlowEngine;