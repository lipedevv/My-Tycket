import {
  WhatsAppMessage as IWhatsAppMessage,
  WhatsAppContact as IWhatsAppContact,
  WhatsAppConnection as IWhatsAppConnection,
  WebhookEvent as IWebhookEvent
} from '../@types/WhatsAppProvider';

export interface WhatsAppMessage {
  body: string;
  number: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  quotedMsg?: string;
  messageId?: string;
  ticketId?: number;
  companyId?: number;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  profilePicUrl?: string;
  isGroup?: boolean;
}

export interface WhatsAppConnection {
  id: number | string;
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  qrcode?: string;
  number?: string;
  provider: 'baileys' | 'hub';
  lastMessage?: string;
  messagesCount?: number;
}

export interface WebhookEvent {
  type: 'message' | 'ack' | 'presence' | 'connection_update';
  data: any;
  source: 'baileys' | 'hub';
  timestamp?: number;
}

export abstract class BaseWhatsAppProvider {
  protected providerType: 'baileys' | 'hub';
  protected companyId: number;
  protected connectionId: string;

  constructor(companyId: number, connectionId: string) {
    this.companyId = companyId;
    this.connectionId = connectionId;
  }

  // Métodos abstratos que cada provider deve implementar
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendMessage(message: WhatsAppMessage): Promise<any>;
  abstract sendMedia(message: WhatsAppMessage): Promise<any>;
  abstract getConnectionStatus(): Promise<WhatsAppConnection>;
  abstract generateQRCode(): Promise<string>;
  abstract getProfilePicture(number: string): Promise<string>;
  abstract isConnected(): boolean;
  abstract getConnectionInfo(): any;

  // Métodos comuns a todos os providers
  getProviderType(): 'baileys' | 'hub' {
    return this.providerType;
  }

  getCompanyId(): number {
    return this.companyId;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  // Validação de número (comum a todos)
  protected validateNumber(number: string): string {
    if (!number) return '';

    // Remove caracteres não numéricos
    let cleanNumber = number.replace(/\D/g, '');

    // Remove @s.whatsapp.net se existir para limpar
    cleanNumber = cleanNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');

    // Garante que tenha o código do país Brasil (55)
    if (cleanNumber.length === 11 && !cleanNumber.startsWith('55')) {
      cleanNumber = '55' + cleanNumber;
    }

    // Remove 55 extra se tiver 13 dígitos (problema comum)
    if (cleanNumber.length === 13 && cleanNumber.startsWith('5555')) {
      cleanNumber = '55' + cleanNumber.substring(2);
    }

    // Adiciona @s.whatsapp.net se não tiver sufixo
    if (!cleanNumber.includes('@')) {
      cleanNumber = `${cleanNumber}@s.whatsapp.net`;
    }

    return cleanNumber;
  }

  // Formatação de mensagem (comum)
  protected formatMessage(message: WhatsAppMessage): any {
    return {
      ...message,
      number: this.validateNumber(message.number),
      timestamp: new Date().toISOString(),
      provider: this.providerType,
      companyId: this.companyId
    };
  }

  // Emitir eventos via Socket.io (comum)
  protected emitSocket(event: string, data: any): void {
    try {
      if (global.io) {
        global.io.to(`company_${this.companyId}`).emit(event, {
          ...data,
          provider: this.providerType,
          connectionId: this.connectionId,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`[${this.providerType}] Error emitting socket event:`, error);
    }
  }

  // Emitir QR Code
  protected emitQRCode(qr: string): void {
    this.emitSocket('whatsapp_qrcode', {
      qrcode: qr,
      connectionId: this.connectionId
    });
  }

  // Emitir status da conexão
  protected emitConnectionStatus(status: string, extra?: any): void {
    this.emitSocket('whatsapp_status', {
      status,
      connectionId: this.connectionId,
      ...extra
    });
  }

  // Emitir webhook para o sistema
  protected emitWebhook(event: WebhookEvent): void {
    this.emitSocket('whatsapp_webhook', event);
  }

  // Validar se o provider pode enviar mensagens
  protected canSendMessage(): boolean {
    return this.isConnected();
  }

  // Tratamento de erro genérico
  protected handleError(error: any, operation: string): void {
    console.error(`[${this.providerType}] ${operation} error:`, error);

    // Emitir evento de erro via Socket
    this.emitSocket('whatsapp_error', {
      error: error.message || 'Unknown error',
      operation,
      connectionId: this.connectionId,
      timestamp: new Date()
    });
  }

  // Logging estruturado
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      provider: this.providerType,
      companyId: this.companyId,
      connectionId: this.connectionId,
      message,
      ...(data && { data })
    };

    switch (level) {
      case 'info':
        console.info(`[${this.providerType}] ${message}`, logData);
        break;
      case 'warn':
        console.warn(`[${this.providerType}] ${message}`, logData);
        break;
      case 'error':
        console.error(`[${this.providerType}] ${message}`, logData);
        break;
    }
  }

  // Obter estatísticas básicas
  abstract getStats(): Promise<{
    messagesSent: number;
    messagesReceived: number;
    connectionUptime: number;
    lastActivity: Date;
  }>;
}