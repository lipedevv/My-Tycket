// src/providers/BaileysProvider.ts
// Implementação do Provider Baileys (WhatsApp Web - Grátis)

import { makeWASocket, WASocket, DisconnectReason } from '@whiskeysockets/baileys';
import { useMultiFileAuthState } from 'baileys/lib/multi-file-auth-state';
import { Boom } from '@hapi/boom';
import BaseWhatsAppProvider, { WhatsAppMessage, WhatsAppConnection, WebhookEvent } from './BaseWhatsAppProvider';

export class BaileysProvider extends BaseWhatsAppProvider {
  private socket: WASocket | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(companyId: number, private sessionId: string) {
    super(companyId);
    this.providerType = 'baileys';
  }

  getProviderType(): 'baileys' {
    return 'baileys';
  }

  async connect(): Promise<void> {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(
        `./sessions/baileys/${this.companyId}/${this.sessionId}`
      );

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: console,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 5000,
        qrTimeout: 60000,
        defaultQueryTimeoutMs: 30000,
        version: [2, 3000, 1015901307]
      });

      this.setupEventListeners(saveCreds);
      this.startConnectionTimeout();

      console.log(`[Baileys] Connecting for company ${this.companyId}, session ${this.sessionId}`);
    } catch (error) {
      console.error('[Baileys] Connection error:', error);
      throw error;
    }
  }

  private setupEventListeners(saveCreds: any): void {
    if (!this.socket) return;

    this.socket.ev.on('creds.update', saveCreds);
    this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
    this.socket.ev.on('messages.upsert', this.handleMessageUpsert.bind(this));
    this.socket.ev.on('messages.update', this.handleMessageUpdate.bind(this));
  }

  private handleConnectionUpdate({ connection, lastDisconnect, qr }: any): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    if (qr) {
      this.emitQRCode(qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log(`[Baileys] Connection closed. Reconnect: ${shouldReconnect}`);

      if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 5000 * this.reconnectAttempts);
      } else {
        this.emitConnectionStatus('disconnected');
      }
    } else if (connection === 'open') {
      console.log(`[Baileys] Connected successfully for company ${this.companyId}`);
      this.reconnectAttempts = 0;
      this.emitConnectionStatus('connected');
    }
  }

  private handleMessageUpsert({ messages }: any): void {
    const message = messages[0];
    if (!message || message.key.fromMe) return;

    const event: WebhookEvent = {
      type: 'message',
      data: {
        id: message.key.id,
        body: message.message?.conversation || message.message?.extendedTextMessage?.text,
        from: message.key.remoteJid,
        fromMe: message.key.fromMe,
        timestamp: message.messageTimestamp,
        mediaType: this.getMediaType(message),
        mediaUrl: this.getMediaUrl(message),
        quotedMsgId: message.message?.extendedTextMessage?.contextInfo?.stanzaId
      },
      source: 'baileys'
    };

    this.emitWebhook(event);
  }

  private handleMessageUpdate(messages: any[]): void {
    messages.forEach(message => {
      if (message.update.status) {
        const event: WebhookEvent = {
          type: 'ack',
          data: {
            id: message.key.id,
            status: message.update.status,
            timestamp: message.messageTimestamp
          },
          source: 'baileys'
        };

        this.emitWebhook(event);
      }
    });
  }

  private getMediaType(message: any): string | null {
    const msg = message.message;
    if (!msg) return null;

    if (msg.imageMessage) return 'image';
    if (msg.videoMessage) return 'video';
    if (msg.audioMessage) return 'audio';
    if (msg.documentMessage) return 'document';
    if (msg.stickerMessage) return 'sticker';
    if (msg.contactMessage) return 'contact';
    if (msg.locationMessage) return 'location';
    if (msg.liveLocationMessage) return 'live_location';

    return null;
  }

  private getMediaUrl(message: any): string | null {
    // Implementar lógica para obter URL da mídia
    return null;
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.ev.removeAllListeners();
      this.socket.ws.close();
      this.socket = null;
    }

    this.emitConnectionStatus('disconnected');
  }

  async sendMessage(message: WhatsAppMessage): Promise<any> {
    if (!this.socket || !this.isConnected()) {
      throw new Error('[Baileys] Not connected');
    }

    try {
      const jid = this.validateNumber(message.number);
      const formatted = this.formatMessage(message);

      const result = await this.socket.sendMessage(jid, {
        text: formatted.body
      });

      return {
        id: result.key.id,
        fromMe: true,
        status: 'sent',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[Baileys] Send message error:', error);
      throw error;
    }
  }

  async sendMedia(message: WhatsAppMessage): Promise<any> {
    if (!this.socket || !this.isConnected()) {
      throw new Error('[Baileys] Not connected');
    }

    try {
      const jid = this.validateNumber(message.number);
      let mediaMessage: any = {};

      switch (message.mediaType) {
        case 'image':
          mediaMessage = { image: { url: message.mediaUrl }, caption: message.body };
          break;
        case 'video':
          mediaMessage = { video: { url: message.mediaUrl }, caption: message.body };
          break;
        case 'audio':
          mediaMessage = { audio: { url: message.mediaUrl } };
          break;
        case 'document':
          mediaMessage = { document: { url: message.mediaUrl }, fileName: message.body };
          break;
        default:
          throw new Error(`Unsupported media type: ${message.mediaType}`);
      }

      const result = await this.socket.sendMessage(jid, mediaMessage);
      return {
        id: result.key.id,
        fromMe: true,
        status: 'sent',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[Baileys] Send media error:', error);
      throw error;
    }
  }

  async getConnectionStatus(): Promise<WhatsAppConnection> {
    return {
      id: `baileys_${this.companyId}_${this.sessionId}`,
      name: `Baileys - ${this.sessionId}`,
      status: this.isConnected() ? 'connected' : 'disconnected',
      provider: 'baileys',
      qrcode: this.isConnected() ? undefined : await this.generateQRCode(),
      number: this.socket?.user?.id.replace(/:.*$/, '') || undefined
    };
  }

  async generateQRCode(): Promise<string> {
    // O QR code será gerado através do evento de connection update
    // Aqui retornamos o último QR code gerado ou null
    return new Promise((resolve) => {
      if (this.socket) {
        const qrListener = (qr: string) => {
          this.socket?.ev.off('connection.update', qrListener);
          resolve(qr);
        };
        this.socket.ev.on('connection.update', qrListener);
      } else {
        resolve('');
      }
    });
  }

  async getProfilePicture(number: string): Promise<string> {
    if (!this.socket || !this.isConnected()) {
      return '';
    }

    try {
      const jid = this.validateNumber(number);
      const url = await this.socket.profilePictureUrl(jid);
      return url || '';
    } catch (error) {
      console.error('[Baileys] Get profile picture error:', error);
      return '';
    }
  }

  isConnected(): boolean {
    return this.socket?.user !== undefined && this.socket.ws.readyState === 1;
  }

  private startConnectionTimeout(): void {
    this.connectionTimeout = setTimeout(() => {
      if (!this.isConnected()) {
        this.emitConnectionStatus('error');
      }
    }, 60000); // 60 segundos timeout
  }

  // Métodos de emissão de eventos
  private emitQRCode(qr: string): void {
    // Emitir evento para frontend via Socket.io
    global.io?.to(`company_${this.companyId}`).emit('whatsapp_qrcode', {
      qrcode: qr,
      sessionId: this.sessionId,
      provider: 'baileys'
    });
  }

  private emitConnectionStatus(status: string): void {
    global.io?.to(`company_${this.companyId}`).emit('whatsapp_status', {
      status,
      sessionId: this.sessionId,
      provider: 'baileys'
    });
  }

  private emitWebhook(event: WebhookEvent): void {
    global.io?.to(`company_${this.companyId}`).emit('whatsapp_webhook', event);
  }
}