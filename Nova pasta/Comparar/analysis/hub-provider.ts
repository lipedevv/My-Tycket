// src/providers/HubProvider.ts
// Implementação do Provider Notifica-me Hub (WhatsApp Oficial - Pago)

import { Client } from 'notificamehubsdk';
import BaseWhatsAppProvider, { WhatsAppMessage, WhatsAppConnection, WebhookEvent } from './BaseWhatsAppProvider';

export class HubProvider extends BaseWhatsAppProvider {
  private client: Client | null = null;
  private connectionId: string;
  private apiKey: string;
  private webhookSecret: string;

  constructor(
    companyId: number,
    private connectionConfig: {
      connectionId: string;
      apiKey: string;
      instanceId: string;
      webhookUrl: string;
      webhookSecret: string;
    }
  ) {
    super(companyId);
    this.providerType = 'hub';
    this.connectionId = connectionConfig.connectionId;
    this.apiKey = connectionConfig.apiKey;
    this.webhookSecret = connectionConfig.webhookSecret;
  }

  getProviderType(): 'hub' {
    return 'hub';
  }

  async connect(): Promise<void> {
    try {
      this.client = new Client({
        apiKey: this.apiKey,
        instanceId: this.connectionConfig.instanceId,
        baseUrl: 'https://api.notificame.com.br'
      });

      // Verificar status da conexão
      const status = await this.getConnectionStatus();

      if (status.status === 'connected') {
        console.log(`[Hub] Connected successfully for company ${this.companyId}`);
        this.emitConnectionStatus('connected');
      } else {
        console.log(`[Hub] Connection status: ${status.status}`);
        this.emitConnectionStatus(status.status);
      }

      // Configurar webhook se necessário
      await this.setupWebhook();
    } catch (error) {
      console.error('[Hub] Connection error:', error);
      this.emitConnectionStatus('error');
      throw error;
    }
  }

  private async setupWebhook(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.setWebhook({
        url: this.connectionConfig.webhookUrl,
        secret: this.webhookSecret,
        events: ['message', 'ack', 'connection_update']
      });

      console.log(`[Hub] Webhook configured: ${this.connectionConfig.webhookUrl}`);
    } catch (error) {
      console.error('[Hub] Webhook setup error:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.error('[Hub] Disconnect error:', error);
      }
      this.client = null;
    }

    this.emitConnectionStatus('disconnected');
  }

  async sendMessage(message: WhatsAppMessage): Promise<any> {
    if (!this.client) {
      throw new Error('[Hub] Client not initialized');
    }

    try {
      const result = await this.client.sendMessage({
        number: message.number,
        message: message.body,
        quotedMsgId: message.quotedMsgId
      });

      return {
        id: result.id,
        fromMe: true,
        status: 'sent',
        timestamp: Date.now(),
        provider: 'hub'
      };
    } catch (error) {
      console.error('[Hub] Send message error:', error);
      throw error;
    }
  }

  async sendMedia(message: WhatsAppMessage): Promise<any> {
    if (!this.client) {
      throw new Error('[Hub] Client not initialized');
    }

    try {
      const result = await this.client.sendMedia({
        number: message.number,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        caption: message.body
      });

      return {
        id: result.id,
        fromMe: true,
        status: 'sent',
        timestamp: Date.now(),
        provider: 'hub'
      };
    } catch (error) {
      console.error('[Hub] Send media error:', error);
      throw error;
    }
  }

  async getConnectionStatus(): Promise<WhatsAppConnection> {
    if (!this.client) {
      return {
        id: this.connectionId,
        name: `Hub - ${this.connectionId}`,
        status: 'disconnected',
        provider: 'hub'
      };
    }

    try {
      const hubStatus = await this.client.getConnectionStatus();

      return {
        id: this.connectionId,
        name: `Hub - ${this.connectionId}`,
        status: this.mapHubStatus(hubStatus.status),
        provider: 'hub',
        number: hubStatus.number
      };
    } catch (error) {
      console.error('[Hub] Get connection status error:', error);
      return {
        id: this.connectionId,
        name: `Hub - ${this.connectionId}`,
        status: 'error',
        provider: 'hub'
      };
    }
  }

  async generateQRCode(): Promise<string> {
    if (!this.client) {
      throw new Error('[Hub] Client not initialized');
    }

    try {
      const qrData = await this.client.getQRCode();
      return qrData.qrCode || '';
    } catch (error) {
      console.error('[Hub] Generate QR code error:', error);
      return '';
    }
  }

  async getProfilePicture(number: string): Promise<string> {
    if (!this.client) {
      throw new Error('[Hub] Client not initialized');
    }

    try {
      const profilePic = await this.client.getProfilePicture(number);
      return profilePic.url || '';
    } catch (error) {
      console.error('[Hub] Get profile picture error:', error);
      return '';
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private mapHubStatus(hubStatus: string): 'connected' | 'connecting' | 'disconnected' | 'error' {
    switch (hubStatus) {
      case 'CONNECTED':
      case 'QRCODE_READ':
        return 'connected';
      case 'QRCODE':
      case 'CONNECTING':
        return 'connecting';
      case 'DISCONNECTED':
        return 'disconnected';
      case 'ERROR':
      default:
        return 'error';
    }
  }

  private emitConnectionStatus(status: string): void {
    global.io?.to(`company_${this.companyId}`).emit('whatsapp_status', {
      status,
      connectionId: this.connectionId,
      provider: 'hub'
    });
  }

  // Método estático para processar webhooks do Hub
  static processWebhook(body: any, signature: string, secret: string): WebhookEvent | null {
    try {
      // Validar assinatura do webhook
      if (!HubProvider.validateWebhookSignature(body, signature, secret)) {
        console.error('[Hub] Invalid webhook signature');
        return null;
      }

      // Processar diferentes tipos de eventos
      switch (body.event) {
        case 'message':
          return {
            type: 'message',
            data: {
              id: body.message.id,
              body: body.message.body,
              from: body.message.from,
              fromMe: body.message.fromMe,
              timestamp: body.message.timestamp,
              mediaType: body.message.mediaType,
              mediaUrl: body.message.mediaUrl,
              quotedMsgId: body.message.quotedMsgId,
              connectionId: body.connectionId
            },
            source: 'hub'
          };

        case 'ack':
          return {
            type: 'ack',
            data: {
              id: body.messageId,
              status: body.status,
              timestamp: body.timestamp,
              connectionId: body.connectionId
            },
            source: 'hub'
          };

        case 'connection_update':
          return {
            type: 'connection_update',
            data: {
              connectionId: body.connectionId,
              status: body.status,
              qrcode: body.qrcode,
              number: body.number
            },
            source: 'hub'
          };

        default:
          console.log(`[Hub] Unhandled webhook event: ${body.event}`);
          return null;
      }
    } catch (error) {
      console.error('[Hub] Webhook processing error:', error);
      return null;
    }
  }

  private static validateWebhookSignature(body: any, signature: string, secret: string): boolean {
    // Implementar validação HMAC SHA256
    // Assinatura vem no header: X-Hub-Signature-256
    // Ex: sha256=c2f6bdf1b78a16f71a2c5a754412886c5a1b7e5e4c4c3b2a1a0f9e8d7c6b5a4
    const crypto = require('crypto');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    return `sha256=${expectedSignature}` === signature;
  }
}