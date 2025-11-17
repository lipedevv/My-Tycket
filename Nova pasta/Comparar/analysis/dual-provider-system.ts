// src/providers/BaseWhatsAppProvider.ts
// Interface base para todos os providers WhatsApp

export interface WhatsAppMessage {
  body: string;
  number: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  quotedMsg?: string;
  messageId?: string;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  profilePicUrl?: string;
}

export interface WhatsAppConnection {
  id: number | string;
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  qrcode?: string;
  number?: string;
  provider: 'baileys' | 'hub';
}

export interface WebhookEvent {
  type: 'message' | 'ack' | 'presence' | 'connection_update';
  data: any;
  source: 'baileys' | 'hub';
}

export abstract class BaseWhatsAppProvider {
  protected providerType: 'baileys' | 'hub';
  protected companyId: number;

  constructor(companyId: number) {
    this.companyId = companyId;
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

  // Métodos comuns a todos os providers
  abstract getProviderType(): 'baileys' | 'hub';

  // Validação de número (comum a todos)
  protected validateNumber(number: string): string {
    // Remove caracteres não numéricos
    const cleanNumber = number.replace(/\D/g, '');

    // Adiciona @s.whatsapp.net se não tiver sufixo
    if (!cleanNumber.includes('@')) {
      return `${cleanNumber}@s.whatsapp.net`;
    }

    return cleanNumber;
  }

  // Formatação de mensagem (comum)
  protected formatMessage(message: WhatsAppMessage): any {
    return {
      ...message,
      number: this.validateNumber(message.number),
      timestamp: new Date().toISOString()
    };
  }
}