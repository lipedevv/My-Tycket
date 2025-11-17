import axios from 'axios';
import { FlowNodeHandler } from '../FlowEngine';
import { Flow, FlowNode, FlowContext } from '../../../models/Flow';
import WhatsAppProviderService from '../../WhatsAppProviderService';
import { Ticket } from '../../../models/Ticket';
import { Contact } from '../../../models/Contact';
import { Message } from '../../../models/Message';
import logger from '../../../utils/logger';

// Handler para nó de início
export class StartNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    logger.debug('Executing start node', {
      flowId: flow.id,
      executionId: context.executionId
    });

    // Inicializar variáveis do fluxo
    if (node.config.variables) {
      for (const [key, value] of Object.entries(node.config.variables)) {
        this.setVariable(key, value, context);
      }
    }

    return { status: 'started', nodeId: node.id };
  }
}

// Handler para nó de fim
export class EndNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    logger.debug('Executing end node', {
      flowId: flow.id,
      executionId: context.executionId,
      variables: Object.fromEntries(context.variables)
    });

    // Salvar variáveis finais se configurado
    if (node.config.saveVariables) {
      logger.info('Saving flow variables', {
        executionId: context.executionId,
        variables: Object.fromEntries(context.variables)
      });
    }

    return { status: 'completed', nodeId: node.id };
  }
}

// Handler para envio de mensagem
export class SendMessageNodeHandler extends FlowNodeHandler {
  constructor(private whatsappService: WhatsAppProviderService) {
    super();
  }

  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { message, messageType, mediaUrl, quotedMsg } = node.config;

    if (!message) {
      throw new Error('Message content is required');
    }

    // Processar variáveis na mensagem
    const processedMessage = this.parseVariables(message, context);

    logger.info('Sending message via flow', {
      executionId: context.executionId,
      ticketId: context.ticketId,
      messageType: messageType || 'text'
    });

    try {
      let result;

      if (messageType === 'media' && mediaUrl) {
        result = await this.whatsappService.sendMedia({
          ticketId: context.ticketId,
          body: processedMessage,
          mediaUrl,
          mediaType: node.config.mediaType || 'image',
          quotedMsgId: quotedMsg
        });
      } else {
        result = await this.whatsappService.sendMessage({
          ticketId: context.ticketId,
          body: processedMessage,
          quotedMsgId: quotedMsg
        });
      }

      // Salvar mensagem enviada nas variáveis
      this.setVariable('lastMessageId', result.id, context);
      this.setVariable('lastMessageStatus', result.status, context);

      return {
        messageId: result.id,
        status: result.status,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to send message in flow', {
        executionId: context.executionId,
        error: error.message
      });
      throw error;
    }
  }
}

// Handler para condições
export class ConditionNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { conditions } = node.config;

    if (!conditions || conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    logger.debug('Evaluating conditions', {
      executionId: context.executionId,
      conditionsCount: conditions.length
    });

    for (const condition of conditions) {
      const { variable, operator, value, result } = condition;
      const variableValue = this.getVariable(variable, context);

      let conditionMet = false;

      switch (operator) {
        case 'equals':
          conditionMet = variableValue === value;
          break;
        case 'not_equals':
          conditionMet = variableValue !== value;
          break;
        case 'contains':
          conditionMet = String(variableValue).includes(String(value));
          break;
        case 'not_contains':
          conditionMet = !String(variableValue).includes(String(value));
          break;
        case 'greater_than':
          conditionMet = Number(variableValue) > Number(value);
          break;
        case 'less_than':
          conditionMet = Number(variableValue) < Number(value);
          break;
        case 'is_empty':
          conditionMet = !variableValue || variableValue === '';
          break;
        case 'is_not_empty':
          conditionMet = variableValue && variableValue !== '';
          break;
        default:
          throw new Error(`Unknown operator: ${operator}`);
      }

      if (conditionMet) {
        logger.debug('Condition met', {
          executionId: context.executionId,
          variable,
          operator,
          value,
          result
        });

        // Salvar resultado em variável
        if (result.saveToVariable) {
          this.setVariable(result.variableName, result.value, context);
        }

        return { choice: result.choice || condition.id, conditionMet: true };
      }
    }

    return { choice: null, conditionMet: false };
  }
}

// Handler para menu interativo
export class MenuNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { title, options, waitForResponse, timeout } = node.config;

    if (!options || options.length === 0) {
      throw new Error('Menu options are required');
    }

    logger.debug('Creating menu', {
      executionId: context.executionId,
      optionsCount: options.length,
      waitForResponse
    });

    // Montar mensagem do menu
    let menuMessage = title ? `${this.parseVariables(title, context)}\n\n` : '';

    options.forEach((option, index) => {
      const optionText = this.parseVariables(option.text, context);
      menuMessage += `${index + 1}. ${optionText}\n`;
    });

    // Enviar mensagem do menu
    const whatsappService = new WhatsAppProviderService();
    await whatsappService.sendMessage({
      ticketId: context.ticketId,
      body: menuMessage
    });

    // Salvar opções em variável
    this.setVariable('menuOptions', options, context);
    this.setVariable('menuTitle', title, context);

    if (waitForResponse) {
      // Aguardar resposta do usuário (implementar lógica de espera)
      this.setVariable('awaitingMenuResponse', true, context);

      // Aqui você implementaria a lógica para aguardar a resposta
      // Poderia usar WebSocket, callbacks, etc.

      return {
        menuSent: true,
        awaitingResponse: true,
        timeout: timeout || 30000
      };
    }

    return { menuSent: true, awaitingResponse: false };
  }
}

// Handler para delay/pausa
export class DelayNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { delay, delayUnit } = node.config;

    if (!delay) {
      return { delayed: false };
    }

    let delayMs = delay;
    switch (delayUnit) {
      case 'seconds':
        delayMs = delay * 1000;
        break;
      case 'minutes':
        delayMs = delay * 60 * 1000;
        break;
      case 'hours':
        delayMs = delay * 60 * 60 * 1000;
        break;
    }

    logger.debug('Delaying execution', {
      executionId: context.executionId,
      delayMs
    });

    await new Promise(resolve => setTimeout(resolve, delayMs));

    return { delayed: true, delayMs };
  }
}

// Handler para chamadas de API
export class ApiCallNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { url, method, headers, body, saveResponse } = node.config;

    if (!url) {
      throw new Error('URL is required for API call');
    }

    // Processar variáveis na URL e body
    const processedUrl = this.parseVariables(url, context);
    const processedBody = body ? this.parseVariables(body, context) : undefined;

    logger.debug('Making API call', {
      executionId: context.executionId,
      method: method || 'GET',
      url: processedUrl
    });

    try {
      const response = await axios({
        method: method || 'GET',
        url: processedUrl,
        headers: headers || {},
        data: processedBody,
        timeout: node.config.timeout || 10000
      });

      // Salvar resposta em variável
      if (saveResponse) {
        this.setVariable(saveResponse.variableName, response.data, context);
      }

      return {
        status: 'success',
        statusCode: response.status,
        data: response.data
      };

    } catch (error) {
      logger.error('API call failed', {
        executionId: context.executionId,
        url: processedUrl,
        error: error.message
      });

      if (node.config.errorHandling === 'continue') {
        if (saveResponse) {
          this.setVariable(saveResponse.variableName, { error: error.message }, context);
        }
        return { status: 'error', error: error.message };
      }

      throw error;
    }
  }
}

// Handler para webhook
export class WebhookNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { url, method, headers, body, secret } = node.config;

    if (!url) {
      throw new Error('Webhook URL is required');
    }

    // Processar variáveis
    const processedUrl = this.parseVariables(url, context);
    const processedBody = {
      ...JSON.parse(this.parseVariables(JSON.stringify(body || {}), context)),
      executionId: context.executionId,
      ticketId: context.ticketId,
      contactId: context.contactId,
      companyId: context.companyId,
      timestamp: new Date().toISOString()
    };

    // Assinar webhook se secret fornecido
    let signature = '';
    if (secret) {
      const crypto = require('crypto');
      signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(processedBody))
        .digest('hex');
    }

    logger.debug('Sending webhook', {
      executionId: context.executionId,
      url: processedUrl
    });

    try {
      const response = await axios({
        method: method || 'POST',
        url: processedUrl,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          ...(headers || {})
        },
        data: processedBody,
        timeout: node.config.timeout || 10000
      });

      return {
        status: 'success',
        statusCode: response.status,
        data: response.data
      };

    } catch (error) {
      logger.error('Webhook failed', {
        executionId: context.executionId,
        url: processedUrl,
        error: error.message
      });
      throw error;
    }
  }
}

// Handler para variáveis
export class VariableNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { operation, variableName, value } = node.config;

    if (!variableName) {
      throw new Error('Variable name is required');
    }

    const processedValue = value ? this.parseVariables(value, context) : undefined;

    switch (operation) {
      case 'set':
        this.setVariable(variableName, processedValue, context);
        break;
      case 'increment':
        const currentValue = this.getVariable(variableName, context) || 0;
        this.setVariable(variableName, Number(currentValue) + 1, context);
        break;
      case 'decrement':
        const decValue = this.getVariable(variableName, context) || 0;
        this.setVariable(variableName, Number(decValue) - 1, context);
        break;
      case 'append':
        const existing = this.getVariable(variableName, context) || '';
        this.setVariable(variableName, String(existing) + String(processedValue), context);
        break;
      case 'delete':
        context.variables.delete(variableName);
        break;
      default:
        throw new Error(`Unknown variable operation: ${operation}`);
    }

    return {
      operation,
      variableName,
      newValue: this.getVariable(variableName, context)
    };
  }
}

// Handler para laços
export class LoopNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { loopType, iterations, condition, arrayVariable } = node.config;

    let loopCount = 0;
    const loopVariable = node.config.loopVariable || 'loopIndex';

    switch (loopType) {
      case 'fixed':
        loopCount = iterations || 1;
        break;
      case 'conditional':
        // Avaliar condição
        const conditionMet = this.evaluateCondition(condition, context);
        loopCount = conditionMet ? 1 : 0;
        break;
      case 'array':
        const array = this.getVariable(arrayVariable, context) || [];
        loopCount = array.length;
        break;
      default:
        throw new Error(`Unknown loop type: ${loopType}`);
    }

    // Salvar informações do loop
    this.setVariable(loopVariable, 0, context);
    this.setVariable(`${loopVariable}Total`, loopCount, context);
    this.setVariable(`${loopVariable}Type`, loopType, context);

    logger.debug('Starting loop', {
      executionId: context.executionId,
      loopType,
      iterations: loopCount
    });

    return {
      loopStarted: true,
      loopType,
      iterations: loopCount,
      loopVariable
    };
  }

  private evaluateCondition(condition: string, context: FlowContext): boolean {
    // Implementar avaliação segura de condição
    try {
      const safeEval = new Function('context', `
        const { variables } = context;
        return ${condition};
      `);
      return safeEval(context);
    } catch (error) {
      return false;
    }
  }
}

// Handler para seleção aleatória
export class RandomNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { options, weights, saveToVariable } = node.config;

    if (!options || options.length === 0) {
      throw new Error('Random options are required');
    }

    let selectedIndex: number;

    if (weights && weights.length === options.length) {
      // Seleção ponderada
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      let random = Math.random() * totalWeight;
      let cumulativeWeight = 0;

      for (let i = 0; i < options.length; i++) {
        cumulativeWeight += weights[i];
        if (random <= cumulativeWeight) {
          selectedIndex = i;
          break;
        }
      }
    } else {
      // Seleção uniforme
      selectedIndex = Math.floor(Math.random() * options.length);
    }

    const selectedOption = options[selectedIndex];

    logger.debug('Random selection', {
      executionId: context.executionId,
      selectedIndex,
      selectedOption
    });

    if (saveToVariable) {
      this.setVariable(saveToVariable, selectedOption, context);
    }

    return {
      selectedIndex,
      selectedOption,
      optionsCount: options.length
    };
  }
}

// Handler para atribuição
export class AssignmentNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { assignments } = node.config;

    if (!assignments || assignments.length === 0) {
      return { assignments: [] };
    }

    const results = [];

    for (const assignment of assignments) {
      const { targetVariable, sourceVariable, expression, transform } = assignment;

      let value: any;

      if (sourceVariable) {
        value = this.getVariable(sourceVariable, context);
      } else if (expression) {
        // Avaliar expressão
        value = this.evaluateExpression(expression, context);
      } else {
        value = assignment.value;
      }

      // Aplicar transformação
      if (transform) {
        value = this.applyTransform(value, transform);
      }

      this.setVariable(targetVariable, value, context);
      results.push({ targetVariable, value });
    }

    logger.debug('Assignments completed', {
      executionId: context.executionId,
      assignmentsCount: results.length
    });

    return { assignments: results };
  }

  private evaluateExpression(expression: string, context: FlowContext): any {
    try {
      const safeEval = new Function('context', `
        const { variables } = context;
        return ${expression};
      `);
      return safeEval(context);
    } catch (error) {
      logger.error('Expression evaluation failed', { expression, error: error.message });
      return null;
    }
  }

  private applyTransform(value: any, transform: string): any {
    switch (transform) {
      case 'upper':
        return String(value).toUpperCase();
      case 'lower':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }
}

// Handler para validação
export class ValidationNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    const { validations } = node.config;

    if (!validations || validations.length === 0) {
      return { allValid: true, results: [] };
    }

    const results = [];
    let allValid = true;

    for (const validation of validations) {
      const { variable, type, params } = validation;
      const value = this.getVariable(variable, context);

      let isValid = false;
      let error = '';

      switch (type) {
        case 'required':
          isValid = value !== null && value !== undefined && value !== '';
          error = `${variable} is required`;
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          isValid = emailRegex.test(String(value));
          error = `${variable} must be a valid email`;
          break;
        case 'phone':
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          isValid = phoneRegex.test(String(value).replace(/\D/g, ''));
          error = `${variable} must be a valid phone number`;
          break;
        case 'minLength':
          isValid = String(value).length >= params.min;
          error = `${variable} must have at least ${params.min} characters`;
          break;
        case 'maxLength':
          isValid = String(value).length <= params.max;
          error = `${variable} must have at most ${params.max} characters`;
          break;
        case 'regex':
          const regex = new RegExp(params.pattern);
          isValid = regex.test(String(value));
          error = params.error || `${variable} format is invalid`;
          break;
        default:
          throw new Error(`Unknown validation type: ${type}`);
      }

      results.push({
        variable,
        type,
        value,
        isValid,
        error
      });

      if (!isValid) {
        allValid = false;
        if (validation.stopOnInvalid) {
          break;
        }
      }
    }

    // Salvar resultados em variáveis
    this.setVariable('validationResults', results, context);
    this.setVariable('validationPassed', allValid, context);

    if (!allValid && node.config.errorMessage) {
      throw new Error(node.config.errorMessage);
    }

    return { allValid, results };
  }
}

// Handlers adicionais (placeholders que podem ser implementados)
export class DatabaseNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    // Implementar operações de banco de dados
    return { status: 'not_implemented' };
  }
}

export class TagNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    // Implementar manipulação de tags
    return { status: 'not_implemented' };
  }
}

export class QueueNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    // Implementar operações de fila
    return { status: 'not_implemented' };
  }
}

export class HumanHandoffNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    // Implementar transferência para atendente humano
    return { status: 'not_implemented' };
  }
}

export class AnalyticsNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    // Implementar analytics
    return { status: 'not_implemented' };
  }
}

export class IntegrationNodeHandler extends FlowNodeHandler {
  async execute(flow: Flow, node: FlowNode, context: FlowContext): Promise<any> {
    // Implementar integrações externas
    return { status: 'not_implemented' };
  }
}