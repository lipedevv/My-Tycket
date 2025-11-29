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

export interface ProviderConfig {
  type: 'baileys' | 'hub';
  name: string;
  isActive: boolean;
  isDefault: boolean;
  companyId: number;
  baileysConfig?: {
    sessionId: string;
    deviceName?: string;
  };
  hubConfig?: {
    connectionId: string;
    apiKey: string;
    instanceId: string;
    webhookUrl: string;
    webhookSecret: string;
  };
}

export interface ProviderStats {
  messagesSent: number;
  messagesReceived: number;
  connectionUptime: number;
  lastActivity: Date;
  deliveryRate: number;
  errorRate: number;
}