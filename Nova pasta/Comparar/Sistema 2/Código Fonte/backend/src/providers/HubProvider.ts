import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { BaseWhatsAppProvider, WhatsAppMessage, WhatsAppConnection, WebhookEvent } from './BaseWhatsAppProvider';
import { ProviderStats } from '../@types/WhatsAppProvider';

interface HubConfig {
  connectionId: string;
  apiKey: string;
  instanceId: string;
  webhookUrl: string;
  webhookSecret: string;
  baseUrl?: string;
}

interface HubConnectionStatus {
  status: 'CONNECTED' | 'CONNECTING' | 'QRCODE' | 'QRCODE_READ' | 'DISCONNECTED' | 'ERROR';
  number?: string;
  qrcode?: string;
  device?: {
    id: string;
    device_manufacturer: string;
    device_model: string;
    os_version: string;
    wa_version: string;
  };
  isBusiness?: boolean;
}

interface HubMessage {
  id: string;
  body: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaUrl?: string;
  quotedMsgId?: string;
  contactName?: string;
}

interface HubSendMessageResponse {
  id: string;
  from: string;
  to: string;
  timestamp: number;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
}

export class HubProvider extends BaseWhatsAppProvider {
  private config: HubConfig;
  private httpClient: AxiosInstance;
  private connectionStatus: HubConnectionStatus | null = null;
  private stats: ProviderStats = {
    messagesSent: 0,
    messagesReceived: 0,
    connectionUptime: 0,
    lastActivity: new Date(),
    deliveryRate: 100,
    errorRate: 0
  };
  private connectionStartTime: Date = new Date();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(companyId: number, config: HubConfig) {
    super(companyId, `hub_${config.connectionId}`);
    this.providerType = 'hub';
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.notificame.com.br'
    };

    // Configurar cliente HTTP com autenticação
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Interceptor para logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.log('debug', `Hub API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.log('error', 'Hub API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.log('debug', `Hub API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.log('error', 'Hub API Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  async connect(): Promise<void> {
    try {
      this.log('info', 'Connecting to Notifica-me Hub', {
        instanceId: this.config.instanceId,
        connectionId: this.config.connectionId
      });

      // 1. Verificar status atual da conexão
      const status = await this.getConnectionStatus();
      this.log('info', 'Current Hub connection status', status);

      // 2. Configurar webhook
      await this.setupWebhook();

      // 3. Iniciar health check
      this.startHealthCheck();

      // 4. Se não estiver conectado, tentar obter QR code
      if (status.status === 'DISCONNECTED' || status.status === 'ERROR') {
        this.log('info', 'Getting QR code for connection');
        const qrData = await this.getQRCode();
        if (qrData) {
          this.emitQRCode(qrData);
        }
      }

      this.connectionStartTime = new Date();
      this.emitConnectionStatus('connected', {
        number: status.number,
        isBusiness: status.isBusiness
      });

      this.log('info', 'Hub connection established successfully');

    } catch (error) {
      this.handleError(error, 'connect');
      this.emitConnectionStatus('error');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Parar health check
      this.stopHealthCheck();

      // Desconectar da instância
      await this.httpClient.post(`/disconnect/${this.config.instanceId}`);

      this.emitConnectionStatus('disconnected');
      this.log('info', 'Hub connection closed');

    } catch (error) {
      this.handleError(error, 'disconnect');
      throw error;
    }
  }

  private async setupWebhook(): Promise<void> {
    try {
      await this.httpClient.post(`/webhook/${this.config.instanceId}`, {
        url: this.config.webhookUrl,
        secret: this.config.webhookSecret,
        events: ['message', 'ack', 'connection_update', 'presence_update'],
        enabled: true
      });

      this.log('info', 'Webhook configured successfully', {
        url: this.config.webhookUrl
      });

    } catch (error) {
      this.log('warn', 'Failed to configure webhook', { error: error.message });
      // Não falhar a conexão se webhook não puder ser configurado
    }
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkConnectionHealth();
      } catch (error) {
        this.log('error', 'Health check failed', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async checkConnectionHealth(): Promise<void> {
    try {
      const response = await this.httpClient.get(`/status/${this.config.instanceId}`);
      const newStatus = response.data;

      if (this.connectionStatus?.status !== newStatus.status) {
        this.connectionStatus = newStatus;
        this.emitConnectionStatus(newStatus.status.toLowerCase(), {
          number: newStatus.number,
          qrcode: newStatus.qrcode,
          isBusiness: newStatus.isBusiness
        });
      }

      // Atualizar uptime
      if (newStatus.status === 'CONNECTED') {
        this.stats.connectionUptime = Date.now() - this.connectionStartTime.getTime();
      }

    } catch (error) {
      this.log('warn', 'Health check failed', error);
      this.stats.errorRate = Math.min(100, this.stats.errorRate + 0.1);
    }
  }

  async sendMessage(message: WhatsAppMessage): Promise<HubSendMessageResponse> {
    if (!this.isConnected()) {
      throw new Error('[Hub] Not connected to Notifica-me Hub');
    }

    try {
      const jid = this.validateNumber(message.number);
      const formatted = this.formatMessage(message);

      const payload = {
        instanceId: this.config.instanceId,
        number: jid.replace(/@s.whatsapp.net$/, ''),
        message: formatted.body,
        ...(message.quotedMsg && {
          quotedMessageId: message.quotedMsg
        })
      };

      const response = await this.httpClient.post<HubSendMessageResponse>('/send', payload);

      this.stats.messagesSent++;
      this.stats.lastActivity = new Date();

      this.log('info', 'Message sent successfully via Hub', {
        id: response.data.id,
        number: message.number,
        status: response.data.status
      });

      return {
        ...response.data,
        provider: 'hub',
        timestamp: Date.now()
      };

    } catch (error) {
      this.stats.errorRate = Math.min(100, this.stats.errorRate + 0.5);
      this.handleError(error, 'sendMessage');
      throw error;
    }
  }

  async sendMedia(message: WhatsAppMessage): Promise<HubSendMessageResponse> {
    if (!this.isConnected()) {
      throw new Error('[Hub] Not connected to Notifica-me Hub');
    }

    try {
      const jid = this.validateNumber(message.number);
      const formatted = this.formatMessage(message);

      const payload = {
        instanceId: this.config.instanceId,
        number: jid.replace(/@s.whatsapp.net$/, ''),
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        caption: formatted.body,
        ...(message.quotedMsg && {
          quotedMessageId: message.quotedMsg
        })
      };

      const response = await this.httpClient.post<HubSendMessageResponse>('/sendMedia', payload);

      this.stats.messagesSent++;
      this.stats.lastActivity = new Date();

      this.log('info', 'Media sent successfully via Hub', {
        id: response.data.id,
        number: message.number,
        mediaType: message.mediaType,
        status: response.data.status
      });

      return {
        ...response.data,
        provider: 'hub',
        timestamp: Date.now()
      };

    } catch (error) {
      this.stats.errorRate = Math.min(100, this.stats.errorRate + 0.5);
      this.handleError(error, 'sendMedia');
      throw error;
    }
  }

  async getConnectionStatus(): Promise<WhatsAppConnection> {
    try {
      const response = await this.httpClient.get<HubConnectionStatus>(`/status/${this.config.instanceId}`);
      const hubStatus = response.data;

      this.connectionStatus = hubStatus;

      return {
        id: this.connectionId,
        name: `Hub - ${this.config.connectionId}`,
        status: this.mapHubStatus(hubStatus.status),
        provider: 'hub',
        qrcode: hubStatus.qrcode,
        number: hubStatus.number,
        messagesCount: this.stats.messagesSent,
        lastMessage: this.stats.lastActivity.toISOString()
      };

    } catch (error) {
      this.log('error', 'Failed to get connection status', error);
      return {
        id: this.connectionId,
        name: `Hub - ${this.config.connectionId}`,
        status: 'error',
        provider: 'hub'
      };
    }
  }

  async generateQRCode(): Promise<string> {
    try {
      const response = await this.httpClient.get(`/qrcode/${this.config.instanceId}`);
      const qrData = response.data;

      if (qrData.qrcode) {
        this.log('info', 'QR Code generated successfully');
        return qrData.qrcode;
      }

      return '';

    } catch (error) {
      this.log('error', 'Failed to generate QR code', error);
      return '';
    }
  }

  async getProfilePicture(number: string): Promise<string> {
    if (!this.isConnected()) {
      return '';
    }

    try {
      const jid = this.validateNumber(number);
      const response = await this.httpClient.get(`/profilePicture/${this.config.instanceId}`, {
        params: { number: jid.replace(/@s.whatsapp.net$/, '') }
      });

      return response.data.url || '';

    } catch (error) {
      this.log('warn', 'Error getting profile picture', { number, error: error.message });
      return '';
    }
  }

  isConnected(): boolean {
    return this.connectionStatus?.status === 'CONNECTED' || this.connectionStatus?.status === 'QRCODE_READ';
  }

  getConnectionInfo(): any {
    return {
      instanceId: this.config.instanceId,
      connectionId: this.config.connectionId,
      status: this.connectionStatus,
      stats: this.stats
    };
  }

  async getStats(): Promise<ProviderStats> {
    const uptime = this.isConnected() ?
      Date.now() - this.connectionStartTime.getTime() :
      this.stats.connectionUptime;

    return {
      ...this.stats,
      connectionUptime: uptime,
      lastActivity: this.stats.lastActivity
    };
  }

  private mapHubStatus(hubStatus: string): 'connected' | 'connecting' | 'disconnected' | 'error' {
    switch (hubStatus) {
      case 'CONNECTED':
      case 'QRCODE_READ':
        return 'connected';
      case 'CONNECTING':
      case 'QRCODE':
        return 'connecting';
      case 'DISCONNECTED':
        return 'disconnected';
      case 'ERROR':
      default:
        return 'error';
    }
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
              timestamp: body.message.timestamp * 1000,
              mediaType: body.message.mediaType,
              mediaUrl: body.message.mediaUrl,
              quotedMsgId: body.message.quotedMsgId,
              contactName: body.message.contactName,
              connectionId: body.connectionId
            },
            source: 'hub',
            timestamp: Date.now()
          };

        case 'ack':
          return {
            type: 'ack',
            data: {
              id: body.messageId,
              status: body.status,
              timestamp: body.timestamp * 1000,
              fromMe: body.fromMe,
              connectionId: body.connectionId
            },
            source: 'hub',
            timestamp: Date.now()
          };

        case 'connection_update':
          return {
            type: 'connection_update',
            data: {
              connectionId: body.connectionId,
              status: body.status.toLowerCase(),
              qrcode: body.qrcode,
              number: body.number,
              isBusiness: body.isBusiness
            },
            source: 'hub',
            timestamp: Date.now()
          };

        case 'presence_update':
          return {
            type: 'presence',
            data: {
              connectionId: body.connectionId,
              presence: body.presence
            },
            source: 'hub',
            timestamp: Date.now()
          };

        default:
          this.log('info', `Unhandled webhook event: ${body.event}`);
          return null;
      }
    } catch (error) {
      console.error('[Hub] Webhook processing error:', error);
      return null;
    }
  }

  private static validateWebhookSignature(body: any, signature: string, secret: string): boolean {
    try {
      // Assinatura vem no header: X-Hub-Signature-256
      // Ex: sha256=c2f6bdf1b78a16f71a2c5a754412886c5a1b7e5e4c4c3b2a1a0f9e8d7c6b5a4
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');

      return `sha256=${expectedSignature}` === signature;
    } catch (error) {
      console.error('[Hub] Signature validation error:', error);
      return false;
    }
  }

  // Métodos de canais adicionais
  async sendMessageToChannel(channel: string, message: WhatsAppMessage): Promise<any> {
    try {
      const payload = {
        instanceId: this.config.instanceId,
        channel,
        number: this.validateNumber(message.number).replace(/@s.whatsapp.net$/, ''),
        message: message.body,
        ...(message.mediaUrl && {
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType
        })
      };

      const response = await this.httpClient.post(`/send/${channel}`, payload);

      this.log('info', `Message sent via ${channel}`, {
        id: response.data.id,
        number: message.number
      });

      return {
        ...response.data,
        provider: 'hub',
        channel,
        timestamp: Date.now()
      };

    } catch (error) {
      this.handleError(error, `sendMessageToChannel:${channel}`);
      throw error;
    }
  }

  // Listar canais disponíveis
  async getAvailableChannels(): Promise<string[]> {
    try {
      const response = await this.httpClient.get(`/channels/${this.config.instanceId}`);
      return response.data.channels || [];
    } catch (error) {
      this.log('error', 'Failed to get available channels', error);
      return [];
    }
  }

  // Limpar recursos
  cleanup(): void {
    this.stopHealthCheck();
    this.log('info', 'Hub provider cleaned up');
  }
}