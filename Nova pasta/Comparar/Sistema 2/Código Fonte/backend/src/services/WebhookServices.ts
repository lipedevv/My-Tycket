import { logger } from '../utils/logger';
import crypto from 'crypto';
import AppError from '../errors/AppError';
import { FlowEngine } from './FlowEngine/FlowEngine';
import WhatsAppMessage from '../models/WhatsAppMessage';
import Ticket from '../models/Ticket';
import { Op } from 'sequelize';

interface HubMessageData {
  instanceId: string;
  messageId: string;
  from: string;
  to: string;
  message: {
    type: string;
    content?: string;
    mediaUrl?: string;
    mimeType?: string;
    caption?: string;
  };
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

interface HubStatusData {
  instanceId: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  reason?: string;
  qrCode?: string;
  timestamp: number;
}

interface HubMessageStatusData {
  instanceId: string;
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  error?: string;
}

class HubWebhookService {
  static async validateSignature(
    payload: any,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      // Implementar validação HMAC SHA256 conforme documentação do Hub
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return `sha256=${expectedSignature}` === signature;
    } catch (error) {
      logger.error('Erro ao validar assinatura do Hub:', error);
      return false;
    }
  }

  static async processMessage(messageData: HubMessageData): Promise<void> {
    try {
      // Buscar instância do Hub
      const hubInstance = await this.getHubInstance(messageData.instanceId);
      if (!hubInstance) {
        logger.warn(`Instância ${messageData.instanceId} não encontrada`);
        return;
      }

      // Processar mensagem recebida
      if (messageData.message.type === 'text' || messageData.message.type === 'chat') {
        await this.processTextMessage(messageData, hubInstance);
      } else if (messageData.message.type === 'media') {
        await this.processMediaMessage(messageData, hubInstance);
      } else if (messageData.message.type === 'document') {
        await this.processDocumentMessage(messageData, hubInstance);
      }

      // Salvar mensagem no banco
      await this.saveMessage(messageData, hubInstance);

      logger.info(`Mensagem do Hub processada: ${messageData.messageId}`);
    } catch (error) {
      logger.error('Erro ao processar mensagem do Hub:', error);
      throw new AppError('Erro ao processar mensagem do Hub', 500);
    }
  }

  static async processStatusUpdate(statusData: HubStatusData): Promise<void> {
    try {
      const hubInstance = await this.getHubInstance(statusData.instanceId);
      if (!hubInstance) {
        return;
      }

      // Atualizar status da instância no banco
      await this.updateInstanceStatus(statusData.instanceId, {
        status: statusData.status,
        statusReason: statusData.reason,
        qrCode: statusData.qrCode,
        lastStatusUpdate: new Date(statusData.timestamp)
      });

      // Se a conexão foi perdida, marcar tickets abertos como pendentes
      if (statusData.status === 'disconnected') {
        await this.handleDisconnection(hubInstance.companyId);
      }

      logger.info(`Status do Hub atualizado: ${statusData.instanceId} -> ${statusData.status}`);
    } catch (error) {
      logger.error('Erro ao processar atualização de status do Hub:', error);
    }
  }

  static async processMessageStatus(messageStatus: HubMessageStatusData): Promise<void> {
    try {
      // Atualizar status da mensagem no banco
      await this.updateMessageStatus(messageStatus.messageId, {
        status: messageStatus.status,
        timestamp: new Date(messageStatus.timestamp),
        error: messageStatus.error
      });

      logger.info(`Status da mensagem atualizado: ${messageStatus.messageId} -> ${messageStatus.status}`);
    } catch (error) {
      logger.error('Erro ao processar status da mensagem:', error);
    }
  }

  private static async getHubInstance(instanceId: string) {
    // Implementar busca da instância no banco
    // return await HubInstance.findOne({ where: { instanceId } });
    return { companyId: '1' }; // Mock
  }

  private static async updateInstanceStatus(instanceId: string, status: any): Promise<void> {
    // Implementar atualização no banco
    // await HubInstance.update({ ...status }, { where: { instanceId } });
  }

  private static async updateMessageStatus(messageId: string, status: any): Promise<void> {
    // Implementar atualização no banco
    // await WhatsAppMessage.update({ ...status }, { where: { messageId } });
  }

  private static async processTextMessage(messageData: HubMessageData, instance: any): Promise<void> {
    // Verificar se existe um ticket aberto para este contato
    let ticket = await Ticket.findOne({
      where: {
        contactNumber: messageData.from,
        companyId: instance.companyId,
        status: { [Op.ne]: 'closed' }
      }
    });

    if (!ticket) {
      // Criar novo ticket se não existir
      ticket = await Ticket.create({
        contactNumber: messageData.from,
        companyId: instance.companyId,
        status: 'open',
        lastMessage: messageData.message.content?.substring(0, 100),
        lastMessageAt: new Date(messageData.timestamp)
      });
    } else {
      // Atualizar ticket existente
      await ticket.update({
        lastMessage: messageData.message.content?.substring(0, 100),
        lastMessageAt: new Date(messageData.timestamp)
      });
    }
  }

  private static async processMediaMessage(messageData: HubMessageData, instance: any): Promise<void> {
    // Processar mensagens de mídia (imagens, vídeos, áudios)
    const mediaType = messageData.message.mimeType?.split('/')[0] || 'unknown';

    await this.processTextMessage(messageData, instance);
  }

  private static async processDocumentMessage(messageData: HubMessageData, instance: any): Promise<void> {
    // Processar documentos
    await this.processTextMessage(messageData, instance);
  }

  private static async saveMessage(messageData: HubMessageData, instance: any): Promise<void> {
    // Salvar mensagem no banco de dados
    await WhatsAppMessage.create({
      messageId: messageData.messageId,
      instanceId: messageData.instanceId,
      from: messageData.from,
      to: messageData.to,
      message: JSON.stringify(messageData.message),
      timestamp: new Date(messageData.timestamp),
      companyId: instance.companyId,
      direction: 'in'
    });
  }

  private static async handleDisconnection(companyId: string): Promise<void> {
    // Marcar tickets como pendentes quando a conexão é perdida
    await Ticket.update(
      { status: 'pending' },
      {
        where: {
          companyId,
          status: 'open',
          channel: 'whatsapp'
        }
      }
    );
  }
}

class FlowWebhookService {
  private flowEngine: FlowEngine;

  constructor() {
    this.flowEngine = new FlowEngine();
  }

  static async validateToken(flowId: string, token: string): Promise<boolean> {
    try {
      // Validar token do webhook do FlowBuilder
      // Implementar lógica de validação segura
      const expectedToken = this.generateWebhookToken(flowId);
      return token === expectedToken;
    } catch (error) {
      logger.error('Erro ao validar token do webhook do Flow:', error);
      return false;
    }
  }

  static async processApiResponse(
    flowId: string,
    executionId: string,
    response: any
  ): Promise<any> {
    try {
      const flowEngine = new FlowEngine();

      // Continuar execução do flow com a resposta da API
      const execution = await flowEngine.continueExecution(
        executionId,
        {
          type: 'webhook_response',
          data: response
        }
      );

      return execution;
    } catch (error) {
      logger.error('Erro ao processar resposta de API do Flow:', error);
      throw new AppError('Erro ao processar resposta da API', 500);
    }
  }

  static async processUserInput(
    flowId: string,
    executionId: string,
    input: any
  ): Promise<any> {
    try {
      const flowEngine = new FlowEngine();

      // Continuar execução do flow com input do usuário
      const execution = await flowEngine.continueExecution(
        executionId,
        {
          type: 'user_input',
          data: input
        }
      );

      return execution;
    } catch (error) {
      logger.error('Erro ao processar input do usuário do Flow:', error);
      throw new AppError('Erro ao processar input do usuário', 500);
    }
  }

  static async processGenericWebhook(
    flowId: string,
    executionId: string,
    webhookData: any
  ): Promise<any> {
    try {
      const flowEngine = new FlowEngine();

      // Processar webhook genérico
      const execution = await flowEngine.continueExecution(
        executionId,
        {
          type: 'generic_webhook',
          data: webhookData
        }
      );

      return execution;
    } catch (error) {
      logger.error('Erro ao processar webhook genérico do Flow:', error);
      throw new AppError('Erro ao processar webhook', 500);
    }
  }

  private static generateWebhookToken(flowId: string): string {
    const secret = process.env.FLOW_WEBHOOK_SECRET || 'default_flow_secret';
    return crypto.createHmac('sha256', secret).update(flowId).digest('hex');
  }
}

class WhatsAppWebhookService {
  static async processMessage(message: any, companyId: string): Promise<void> {
    try {
      const messageData = {
        from: message.key.remoteJid,
        body: message.message?.conversation ||
               message.message?.extendedTextMessage?.text ||
               message.message?.imageMessage?.caption,
        timestamp: message.messageTimestamp,
        messageId: message.key.id,
        type: this.getMessageType(message)
      };

      // Processar mensagem similar ao Hub
      let ticket = await Ticket.findOne({
        where: {
          contactNumber: messageData.from,
          companyId,
          status: { [Op.ne]: 'closed' }
        }
      });

      if (!ticket) {
        ticket = await Ticket.create({
          contactNumber: messageData.from,
          companyId,
          status: 'open',
          lastMessage: messageData.body?.substring(0, 100) || '',
          lastMessageAt: new Date(messageData.timestamp * 1000)
        });
      } else {
        await ticket.update({
          lastMessage: messageData.body?.substring(0, 100) || '',
          lastMessageAt: new Date(messageData.timestamp * 1000)
        });
      }

      // Salvar mensagem no banco
      await WhatsAppMessage.create({
        messageId: messageData.messageId,
        instanceId: 'baileys', // Identificador para Baileys
        from: messageData.from,
        to: 'me', // Para o bot
        message: JSON.stringify(messageData),
        timestamp: new Date(messageData.timestamp * 1000),
        companyId,
        direction: 'in',
        messageType: messageData.type
      });

      logger.info(`Mensagem do WhatsApp (Baileys) processada: ${messageData.messageId}`);
    } catch (error) {
      logger.error('Erro ao processar mensagem do WhatsApp:', error);
      throw new AppError('Erro ao processar mensagem do WhatsApp', 500);
    }
  }

  static async processConnectionUpdate(connectionState: any, companyId: string): Promise<void> {
    try {
      const status = connectionState.connection === 'open' ? 'connected' :
                    connectionState.connection === 'close' ? 'disconnected' :
                    connectionState.connection === 'connecting' ? 'connecting' : 'error';

      // Atualizar status da conexão Baileys no banco
      await this.updateBaileysStatus(companyId, {
        status,
        lastStatusUpdate: new Date(),
        reason: connectionState.lastDisconnect?.reason
      });

      // Se a conexão foi perdida, marcar tickets como pendentes
      if (status === 'disconnected') {
        await Ticket.update(
          { status: 'pending' },
          {
            where: {
              companyId,
              status: 'open',
              channel: 'whatsapp'
            }
          }
        );
      }

      logger.info(`Status do WhatsApp (Baileys) atualizado: ${status}`);
    } catch (error) {
      logger.error('Erro ao processar atualização de status do WhatsApp:', error);
    }
  }

  private static getMessageType(message: any): string {
    if (message.message?.conversation) return 'text';
    if (message.message?.extendedTextMessage) return 'text';
    if (message.message?.imageMessage) return 'image';
    if (message.message?.videoMessage) return 'video';
    if (message.message?.audioMessage) return 'audio';
    if (message.message?.documentMessage) return 'document';
    if (message.message?.locationMessage) return 'location';
    if (message.message?.contactMessage) return 'contact';
    return 'unknown';
  }

  private static async updateBaileysStatus(companyId: string, status: any): Promise<void> {
    // Implementar atualização no banco para conexão Baileys
    // await WhatsAppConnection.update({ ...status }, { where: { companyId, provider: 'baileys' } });
  }
}

export {
  HubWebhookService,
  FlowWebhookService,
  WhatsAppWebhookService
};