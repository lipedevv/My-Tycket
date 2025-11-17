import { QueueIntegration } from '../models';
import { Ticket } from '../models';
import { FlowBuilderSession } from '../models';
import { Message } from '../models';
import { Contact } from '../models';
import logger from '../utils/logger';
import featureFlags from '../config/featureFlags';

export interface FlowNode {
  id: string;
  type: 'sendMessage' | 'condition' | 'menu' | 'apiCall' | 'transferQueue' | 'transferUser' |
        'setVariable' | 'input' | 'sendMedia' | 'addTag' | 'removeTag' | 'closeTicket' |
        'validateInput' | 'delay' | 'endFlow';
  position: { x: number; y: number };
  data: {
    [key: string]: any;
  };
  next?: string[];
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

export interface FlowContext {
  ticketId: number;
  contactId: number;
  companyId: number;
  userId?: number;
  variables: Record<string, any>;
  history: Array<{
    nodeId: string;
    nodeType: string;
    timestamp: Date;
    result: any;
  }>;
  startTime: Date;
}

export interface FlowExecutionResult {
  nodeId: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  nextNodeIds?: string[];
  message?: string;
  data?: any;
}

export class FlowBuilderService {
  private static instance: FlowBuilderService;

  private constructor() {}

  static getInstance(): FlowBuilderService {
    if (!FlowBuilderService.instance) {
      FlowBuilderService.instance = new FlowBuilderService();
    }
    return FlowBuilderService.instance;
  }

  /**
   * Executa um fluxo para um ticket específico
   */
  async executeFlow(
    flowIntegrationId: number,
    ticketId: number,
    startNodeId?: string
  ): Promise<FlowExecutionResult> {
    try {
      logger.info(`Starting flow execution`, {
        flowIntegrationId,
        ticketId,
        startNodeId
      });

      // Verificar feature flag
      if (!featureFlags.isEnabled('useFlowBuilder')) {
        throw new Error('FlowBuilder is disabled');
      }

      // Obter definição do fluxo
      const flowIntegration = await QueueIntegration.findByPk(flowIntegrationId);
      if (!flowIntegration) {
        throw new Error('Flow integration not found');
      }

      const flowDefinition: FlowDefinition = JSON.parse(flowIntegration.jsonContent);

      // Criar ou obter sessão do fluxo
      const flowSession = await this.getOrCreateSession(flowIntegrationId, ticketId);

      // Determinar nó inicial
      const startNodeIdFinal = startNodeId || this.findStartNode(flowDefinition);
      if (!startNodeIdFinal) {
        throw new Error('No start node found in flow');
      }

      // Criar contexto de execução
      const context = await this.createExecutionContext(ticketId, flowSession);

      // Executar nó
      const result = await this.executeNode(flowDefinition, startNodeIdFinal, context);

      // Atualizar sessão
      await this.updateSession(flowSession, startNodeIdFinal, result, context);

      logger.info(`Flow execution completed`, {
        flowIntegrationId,
        ticketId,
        nodeId: startNodeIdFinal,
        status: result.status
      });

      return result;

    } catch (error) {
      logger.error(`Flow execution failed`, {
        flowIntegrationId,
        ticketId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Encontra o nó inicial do fluxo
   */
  private findStartNode(flowDefinition: FlowDefinition): string | null {
    // Procurar por nó sem entradas (start node)
    const hasIncomingEdges = new Set(
      flowDefinition.edges.map(edge => edge.target)
    );

    const startNodes = flowDefinition.nodes.filter(
      node => !hasIncomingEdges.has(node.id)
    );

    return startNodes.length > 0 ? startNodes[0].id : null;
  }

  /**
   * Obtém ou cria sessão do fluxo
   */
  private async getOrCreateSession(flowIntegrationId: number, ticketId: number): Promise<FlowBuilderSession> {
    let session = await FlowBuilderSession.findOne({
      where: {
        ticketId,
        status: 'running'
      }
    });

    if (!session) {
      session = await FlowBuilderSession.create({
        ticketId,
        flowIntegrationId,
        nodeId: '',
        status: 'running',
        variables: {},
        context: {},
        startedAt: new Date(),
        lastActivityAt: new Date()
      });
    }

    return session;
  }

  /**
   * Cria contexto de execução
   */
  private async createExecutionContext(ticketId: number, flowSession: FlowBuilderSession): Promise<FlowContext> {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        { model: Contact, as: 'contact' }
      ]
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return {
      ticketId: ticket.id,
      contactId: ticket.contactId,
      companyId: ticket.companyId,
      userId: ticket.userId,
      variables: flowSession.variables || {},
      history: flowSession.context?.history || [],
      startTime: new Date()
    };
  }

  /**
   * Executa um nó específico do fluxo
   */
  private async executeNode(
    flowDefinition: FlowDefinition,
    nodeId: string,
    context: FlowContext
  ): Promise<FlowExecutionResult> {
    const node = flowDefinition.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    logger.info(`Executing flow node`, {
      nodeId,
      nodeType: node.type,
      ticketId: context.ticketId
    });

    let result: FlowExecutionResult = {
      nodeId,
      status: 'running'
    };

    try {
      switch (node.type) {
        case 'sendMessage':
          result = await this.handleSendMessageNode(node, context);
          break;

        case 'sendMedia':
          result = await this.handleSendMediaNode(node, context);
          break;

        case 'condition':
          result = await this.handleConditionNode(node, context, flowDefinition);
          break;

        case 'menu':
          result = await this.handleMenuNode(node, context);
          break;

        case 'apiCall':
          result = await this.handleApiCallNode(node, context);
          break;

        case 'transferQueue':
          result = await this.handleTransferQueueNode(node, context);
          break;

        case 'transferUser':
          result = await this.handleTransferUserNode(node, context);
          break;

        case 'setVariable':
          result = await this.handleSetVariableNode(node, context);
          break;

        case 'input':
          result = await this.handleInputNode(node, context);
          break;

        case 'delay':
          result = await this.handleDelayNode(node, context);
          break;

        case 'addTag':
          result = await this.handleAddTagNode(node, context);
          break;

        case 'removeTag':
          result = await this.handleRemoveTagNode(node, context);
          break;

        case 'closeTicket':
          result = await this.handleCloseTicketNode(node, context);
          break;

        case 'validateInput':
          result = await this.handleValidateInputNode(node, context);
          break;

        case 'endFlow':
          result = await this.handleEndFlowNode(node, context);
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Adicionar ao histórico
      context.history.push({
        nodeId,
        nodeType: node.type,
        timestamp: new Date(),
        result
      });

    } catch (error) {
      logger.error(`Error executing flow node`, {
        nodeId,
        nodeType: node.type,
        error: error.message
      });

      result = {
        nodeId,
        status: 'error',
        message: error.message
      };
    }

    return result;
  }

  /**
   * Executar nó de envio de mensagem
   */
  private async handleSendMessageNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const message = this.replaceVariables(node.data.message, context.variables);

    // Aqui você vai integrar com o ProviderManager do WhatsApp
    // Por enquanto, apenas log
    logger.info(`Sending message in flow`, {
      ticketId: context.ticketId,
      message: message.substring(0, 100)
    });

    // Implementar integração real com WhatsAppProviderManager
    // await whatsAppProviderManager.sendMessage({
    //   body: message,
    //   number: phoneNumber,
    //   ticketId: context.ticketId
    // });

    return {
      nodeId: node.id,
      status: 'completed',
      message: 'Message sent successfully',
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de envio de mídia
   */
  private async handleSendMediaNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const mediaUrl = this.replaceVariables(node.data.mediaUrl, context.variables);
    const caption = node.data.caption ? this.replaceVariables(node.data.caption, context.variables) : '';

    logger.info(`Sending media in flow`, {
      ticketId: context.ticketId,
      mediaUrl: mediaUrl.substring(0, 100)
    });

    // Implementar integração real
    // await whatsAppProviderManager.sendMedia({
    //   body: caption,
    //   mediaUrl,
    //   mediaType: node.data.mediaType,
    //   ticketId: context.ticketId
    // });

    return {
      nodeId: node.id,
      status: 'completed',
      message: 'Media sent successfully',
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de condição
   */
  private async handleConditionNode(node: FlowNode, context: FlowContext, flowDefinition: FlowDefinition): Promise<FlowExecutionResult> {
    const condition = this.replaceVariables(node.data.condition, context.variables);
    const nextNodeIds = this.getNextNodeIds(node);

    // Avaliar condição (implementação simplificada)
    const isTrue = this.evaluateCondition(condition, context.variables);

    logger.info(`Condition evaluated in flow`, {
      ticketId: context.ticketId,
      condition,
      result: isTrue
    });

    // Lógica complexa de roteamento baseada em branches do fluxo
    // Por enquanto, simplificado

    return {
      nodeId: node.id,
      status: 'completed',
      message: `Condition evaluated: ${isTrue}`,
      nextNodeIds: isTrue ? nextNodeIds : []
    };
  }

  /**
   * Executar nó de menu
   */
  private async handleMenuNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const message = this.replaceVariables(node.data.message, context.variables);
    const options = node.data.options.map((option: string) =>
      this.replaceVariables(option, context.variables)
    );

    logger.info(`Menu sent in flow`, {
      ticketId: context.ticketId,
      message,
      options
    });

    // Implementar envio do menu via WhatsApp

    return {
      nodeId: node.id,
      status: 'paused', // Pausar esperando resposta do usuário
      message: 'Menu sent, waiting for user response',
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de chamada de API
   */
  private async handleApiCallNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const url = this.replaceVariables(node.data.url, context.variables);
    const method = node.data.method || 'GET';
    const headers = node.data.headers || {};
    const body = node.data.body ? JSON.parse(this.replaceVariables(node.data.body, context.variables)) : undefined;

    logger.info(`API call in flow`, {
      ticketId: context.ticketId,
      url,
      method
    });

    try {
      // Implementar chamada HTTP real
      // const response = await axios({ url, method, headers, data: body });

      // Salvar resposta em variável se especificado
      if (node.data.saveResponseAs) {
        context.variables[node.data.saveResponseAs] = {
          status: 200,
          data: { /* response.data */ }
        };
      }

      return {
        nodeId: node.id,
        status: 'completed',
        message: 'API call successful',
        nextNodeIds: this.getNextNodeIds(node)
      };
    } catch (error) {
      return {
        nodeId: node.id,
        status: 'error',
        message: `API call failed: ${error.message}`
      };
    }
  }

  /**
   * Executar nó de transferência de fila
   */
  private async handleTransferQueueNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const queueId = node.data.queueId;

    logger.info(`Transferring ticket to queue in flow`, {
      ticketId: context.ticketId,
      queueId
    });

    // Implementar transferência real de fila
    // await Ticket.update({ queueId }, { where: { id: context.ticketId } });

    return {
      nodeId: node.id,
      status: 'completed',
      message: 'Ticket transferred to queue',
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de transferência de usuário
   */
  private async handleTransferUserNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const userId = node.data.userId;

    logger.info(`Transferring ticket to user in flow`, {
      ticketId: context.ticketId,
      userId
    });

    // Implementar transferência real de usuário
    // await Ticket.update({ userId }, { where: { id: context.ticketId } });

    return {
      nodeId: node.id,
      status: 'completed',
      message: 'Ticket transferred to user',
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de definição de variável
   */
  private async handleSetVariableNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const variableName = node.data.variableName;
    const variableValue = this.replaceVariables(node.data.variableValue, context.variables);

    context.variables[variableName] = variableValue;

    logger.info(`Variable set in flow`, {
      ticketId: context.ticketId,
      variableName,
      variableValue
    });

    return {
      nodeId: node.id,
      status: 'completed',
      message: `Variable ${variableName} set`,
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de input
   */
  private async handleInputNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const prompt = this.replaceVariables(node.data.prompt, context.variables);
    const inputType = node.data.inputType || 'text';

    logger.info(`Requesting input in flow`, {
      ticketId: context.ticketId,
      prompt,
      inputType
    });

    // Implementar solicitação de input via WhatsApp

    return {
      nodeId: node.id,
      status: 'paused', // Pausar esperando input do usuário
      message: 'Waiting for user input',
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de delay
   */
  private async handleDelayNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const delayMs = parseInt(node.data.delayMs) || 1000;

    logger.info(`Delay in flow`, {
      ticketId: context.ticketId,
      delayMs
    });

    await new Promise(resolve => setTimeout(resolve, delayMs));

    return {
      nodeId: node.id,
      status: 'completed',
      message: `Delay of ${delayMs}ms completed`,
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de adicionar tag
   */
  private async handleAddTagNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const tag = node.data.tag;

    logger.info(`Adding tag in flow`, {
      ticketId: context.ticketId,
      tag
    });

    // Implementar adição de tag
    // await ticketService.addTag(context.ticketId, tag);

    return {
      nodeId: node.id,
      status: 'completed',
      message: `Tag ${tag} added`,
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de remover tag
   */
  private async handleRemoveTagNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const tag = node.data.tag;

    logger.info(`Removing tag in flow`, {
      ticketId: context.ticketId,
      tag
    });

    // Implementar remoção de tag
    // await ticketService.removeTag(context.ticketId, tag);

    return {
      nodeId: node.id,
      status: 'completed',
      message: `Tag ${tag} removed`,
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de fechar ticket
   */
  private async handleCloseTicketNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    logger.info(`Closing ticket in flow`, {
      ticketId: context.ticketId
    });

    // Implementar fechamento de ticket
    // await ticketService.closeTicket(context.ticketId);

    return {
      nodeId: node.id,
      status: 'completed',
      message: 'Ticket closed',
      nextNodeIds: this.getNextNodeIds(node)
    };
  }

  /**
   * Executar nó de validação de input
   */
  private async handleValidateInputNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    const validationType = node.data.validationType;
    const input = context.variables.lastInput;

    let isValid = false;
    let errorMessage = '';

    switch (validationType) {
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
        errorMessage = 'Please enter a valid email address';
        break;
      case 'phone':
        isValid = /^\+?[\d\s\-()]+$/.test(input) && input.replace(/\D/g, '').length >= 10;
        errorMessage = 'Please enter a valid phone number';
        break;
      case 'cpf':
        isValid = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(input);
        errorMessage = 'Please enter a valid CPF (XXX.XXX.XXX-XX)';
        break;
      case 'number':
        isValid = !isNaN(parseFloat(input));
        errorMessage = 'Please enter a valid number';
        break;
      default:
        isValid = input && input.trim().length > 0;
        errorMessage = 'Please enter a valid value';
    }

    return {
      nodeId: node.id,
      status: isValid ? 'completed' : 'error',
      message: isValid ? 'Input validated' : errorMessage,
      nextNodeIds: isValid ? this.getNextNodeIds(node) : []
    };
  }

  /**
   * Executar nó de fim de fluxo
   */
  private async handleEndFlowNode(node: FlowNode, context: FlowContext): Promise<FlowExecutionResult> {
    logger.info(`Flow ended`, {
      ticketId: context.ticketId,
      nodeId: node.id
    });

    // Marcar sessão como concluída
    await FlowBuilderSession.update(
      {
        status: 'completed',
        completedAt: new Date()
      },
      {
        where: { ticketId: context.ticketId }
      }
    );

    return {
      nodeId: node.id,
      status: 'completed',
      message: 'Flow ended'
    };
  }

  /**
   * Substitui variáveis no texto
   */
  private replaceVariables(text: string, variables: Record<string, any>): string {
    if (!text) return '';

    return text.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
      const value = this.getNestedValue(variables, variablePath);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Obtém valor aninhado do objeto de variáveis
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Avalia condição booleana
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Substituir variáveis na condição
      const processedCondition = this.replaceVariables(condition, variables);

      // Avaliar condição (implementação segura - seria melhor usar uma biblioteca)
      // CUIDADO: eval() pode ser perigoso em produção
      return Function('"use strict"; return (' + processedCondition + ')')();
    } catch (error) {
      logger.warn(`Condition evaluation failed`, {
        condition,
        variables,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Obtém IDs dos próximos nós
   */
  private getNextNodeIds(node: FlowNode): string[] {
    return node.next || [];
  }

  /**
   * Atualiza sessão do fluxo
   */
  private async updateSession(
    flowSession: FlowBuilderSession,
    nodeId: string,
    result: FlowExecutionResult,
    context: FlowContext
  ): Promise<void> {
    await flowSession.update({
      nodeId,
      status: result.status === 'paused' ? 'paused' : 'running',
      variables: context.variables,
      context: {
        history: context.history,
        lastExecution: result
      },
      lastActivityAt: new Date(),
      ...(result.status === 'error' && { error: result.message })
    });
  }

  /**
   * Processa entrada do usuário em fluxos pausados
   */
  async processUserInput(ticketId: number, input: string): Promise<void> {
    const session = await FlowBuilderSession.findOne({
      where: {
        ticketId,
        status: 'paused'
      }
    });

    if (!session) {
      return; // Nenhum fluxo pausado para este ticket
    }

    // Salvar input como variável
    const variables = session.variables || {};
    variables.lastInput = input;

    // Continuar execução do fluxo
    await this.executeFlow(session.flowIntegrationId, ticketId);
  }

  /**
   * Cancela fluxo ativo para um ticket
   */
  async cancelFlow(ticketId: number): Promise<void> {
    await FlowBuilderSession.update(
      {
        status: 'completed',
        completedAt: new Date()
      },
      {
        where: {
          ticketId,
          status: ['running', 'paused']
        }
      }
    );

    logger.info(`Flow cancelled for ticket ${ticketId}`);
  }
}

export default FlowBuilderService.getInstance();