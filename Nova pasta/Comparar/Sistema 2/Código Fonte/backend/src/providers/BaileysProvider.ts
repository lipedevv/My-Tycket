import {
  default as makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  PHONENUMBER_MCC,
  PHONENUMBER_MNC
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';
import { BaseWhatsAppProvider, WhatsAppMessage, WhatsAppConnection, WebhookEvent } from './BaseWhatsAppProvider';
import { ProviderStats } from '../@types/WhatsAppProvider';

interface BaileysConfig {
  sessionId: string;
  deviceName?: string;
  pairingCode?: boolean;
  phoneNumber?: string;
}

export class BaileysProvider extends BaseWhatsAppProvider {
  private socket: any = null;
  private config: BaileysConfig;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private sessionPath: string;
  private stats: ProviderStats = {
    messagesSent: 0,
    messagesReceived: 0,
    connectionUptime: 0,
    lastActivity: new Date(),
    deliveryRate: 100,
    errorRate: 0
  };
  private connectionStartTime: Date = new Date();

  constructor(companyId: number, config: BaileysConfig) {
    super(companyId, `baileys_${config.sessionId}`);
    this.providerType = 'baileys';
    this.config = config;
    this.sessionPath = path.join(__dirname, '..', '..', '..', '..', 'sessions', 'baileys', companyId.toString(), config.sessionId);

    // Criar diretório se não existir
    this.ensureSessionDirectory();
  }

  private ensureSessionDirectory(): void {
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  async connect(): Promise<void> {
    try {
      this.log('info', `Connecting Baileys for company ${this.companyId}, session ${this.config.sessionId}`);

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      this.socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, global.logger),
        },
        printQRInTerminal: false,
        browser: this.config.deviceName || ['Chrome (Linux)', '', ''],
        logger: {
          info: (...args: any[]) => console.info('[baileys-info]', ...args),
          warn: (...args: any[]) => console.warn('[baileys-warn]', ...args),
          error: (...args: any[]) => console.error('[baileys-error]', ...args),
        },
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 5000,
        qrTimeout: 60000,
        defaultQueryTimeoutMs: 30000,
        linkPreviewImageThumbnailWidth: 192,
        syncFullHistory: false,
        mobile: false,
        patchMessageBeforeSending: (message) => {
          const requiresPatch = !!(
            message.buttonsMessage ||
            message.listMessage ||
            message.templateMessage
          );
          if (requiresPatch) {
            message = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadataVersion: 2,
                    deviceListMetadata: {},
                  },
                  ...message,
                },
              },
            };
          }
          return message;
        },
      });

      this.setupEventListeners(saveCreds);
      this.startConnectionTimeout();

      this.connectionStartTime = new Date();
      this.emitConnectionStatus('connecting');

    } catch (error) {
      this.handleError(error, 'connect');
      this.emitConnectionStatus('error');
      throw error;
    }
  }

  private setupEventListeners(saveCreds: any): void {
    if (!this.socket) return;

    // Eventos de credenciais
    this.socket.ev.on('creds.update', saveCreds);

    // Eventos de conexão
    this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this));

    // Eventos de mensagens
    this.socket.ev.on('messages.upsert', this.handleMessageUpsert.bind(this));
    this.socket.ev.on('messages.update', this.handleMessageUpdate.bind(this));

    // Eventos de presença
    this.socket.ev.on('presence.update', this.handlePresenceUpdate.bind(this));

    // Eventos de contatos
    this.socket.ev.on('contacts.upsert', this.handleContactsUpsert.bind(this));
  }

  private async handleConnectionUpdate({ connection, lastDisconnect, qr, isNewLogin }: any): Promise<void> {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    // Emitir QR Code se disponível
    if (qr) {
      this.emitQRCode(qr);
      this.log('info', 'QR Code generated');
    }

    // Lidar com estado da conexão
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      this.log('info', `Connection closed. Reconnect: ${shouldReconnect}`, {
        statusCode: (lastDisconnect as Boom)?.output?.statusCode,
        reason: DisconnectReason[(lastDisconnect as Boom)?.output?.statusCode || 0]
      });

      if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.log('info', `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
          this.connect().catch(error => {
            this.handleError(error, 'reconnect');
          });
        }, 5000 * this.reconnectAttempts);
      } else {
        this.log('error', 'Max reconnection attempts reached or logged out');
        this.emitConnectionStatus('disconnected');
      }
    } else if (connection === 'open') {
      this.log('info', 'Connected successfully', {
        user: this.socket.user.id.replace(/:.*$/, ''),
        platform: this.socket.user.platform,
        isBusiness: this.socket.user.isBusiness
      });

      this.reconnectAttempts = 0;
      this.stats.connectionUptime = Date.now() - this.connectionStartTime.getTime();
      this.emitConnectionStatus('connected', {
        number: this.socket.user.id.replace(/:.*$/, ''),
        isBusiness: this.socket.user.isBusiness,
        isNewLogin
      });
    }
  }

  private async handleMessageUpsert({ messages }: any): Promise<void> {
    const message = messages[0];
    if (!message || message.key.fromMe) return;

    this.stats.messagesReceived++;
    this.stats.lastActivity = new Date();

    const webhookEvent: WebhookEvent = {
      type: 'message',
      data: {
        id: message.key.id,
        body: this.extractMessageBody(message),
        from: message.key.remoteJid,
        fromMe: message.key.fromMe,
        timestamp: message.messageTimestamp * 1000,
        mediaType: this.getMediaType(message),
        mediaUrl: this.getMediaUrl(message),
        quotedMsgId: message.message?.extendedTextMessage?.contextInfo?.stanzaId,
        contactName: message.pushName
      },
      source: 'baileys',
      timestamp: Date.now()
    };

    this.emitWebhook(webhookEvent);
  }

  private handleMessageUpdate(messages: any[]): void {
    messages.forEach(message => {
      if (message.update.status) {
        const webhookEvent: WebhookEvent = {
          type: 'ack',
          data: {
            id: message.key.id,
            status: message.update.status,
            timestamp: message.messageTimestamp * 1000,
            fromMe: message.key.fromMe
          },
          source: 'baileys',
          timestamp: Date.now()
        };

        // Atualizar estatísticas de delivery
        if (message.update.status >= 3) {
          this.stats.deliveryRate = Math.min(100, this.stats.deliveryRate + 0.1);
        }

        this.emitWebhook(webhookEvent);
      }
    });
  }

  private handlePresenceUpdate({ id, presences }: any): void {
    const webhookEvent: WebhookEvent = {
      type: 'presence',
      data: {
        id,
        presences
      },
      source: 'baileys',
      timestamp: Date.now()
    };

    this.emitWebhook(webhookEvent);
  }

  private handleContactsUpsert(contacts: any[]): void {
    this.log('info', `Contacts upsert: ${contacts.length} contacts`);
  }

  private extractMessageBody(message: any): string {
    const msg = message.message;
    if (!msg) return '';

    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    if (msg.listMessage?.description) return msg.listMessage.description;

    return '';
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
    if (msg.liveLocationMessage) return 'liveLocation';
    if (msg.productMessage) return 'product';

    return null;
  }

  private getMediaUrl(message: any): string | null {
    // Em implementação real, isso faria upload da mídia e retornaria a URL
    // Por enquanto, retorna null
    return null;
  }

  private startConnectionTimeout(): void {
    this.connectionTimeout = setTimeout(() => {
      if (!this.isConnected()) {
        this.log('error', 'Connection timeout');
        this.emitConnectionStatus('error');
      }
    }, 60000); // 60 segundos timeout
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.ev.removeAllListeners();
      this.socket.ws.close();
      this.socket = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.emitConnectionStatus('disconnected');
    this.log('info', 'Disconnected');
  }

  async sendMessage(message: WhatsAppMessage): Promise<any> {
    if (!this.canSendMessage()) {
      throw new Error('[Baileys] Not connected or not ready to send messages');
    }

    try {
      const jid = this.validateNumber(message.number);
      const formatted = this.formatMessage(message);

      const result = await this.socket.sendMessage(jid, {
        text: formatted.body,
        ...(message.quotedMsg && {
          quoted: {
            key: {
              remoteJid: jid,
              id: message.quotedMsg,
              fromMe: false
            },
            message: { conversation: '' }
          }
        })
      });

      this.stats.messagesSent++;
      this.stats.lastActivity = new Date();

      this.log('info', 'Message sent successfully', {
        id: result.key.id,
        number: message.number
      });

      return {
        id: result.key.id,
        fromMe: true,
        status: 'sent',
        timestamp: Date.now(),
        provider: 'baileys'
      };
    } catch (error) {
      this.stats.errorRate = Math.min(100, this.stats.errorRate + 0.5);
      this.handleError(error, 'sendMessage');
      throw error;
    }
  }

  async sendMedia(message: WhatsAppMessage): Promise<any> {
    if (!this.canSendMessage()) {
      throw new Error('[Baileys] Not connected or not ready to send messages');
    }

    try {
      const jid = this.validateNumber(message.number);
      const formatted = this.formatMessage(message);

      let mediaMessage: any = {};

      switch (message.mediaType) {
        case 'image':
          mediaMessage = {
            image: { url: message.mediaUrl },
            caption: formatted.body
          };
          break;
        case 'video':
          mediaMessage = {
            video: { url: message.mediaUrl },
            caption: formatted.body
          };
          break;
        case 'audio':
          mediaMessage = {
            audio: { url: message.mediaUrl }
          };
          break;
        case 'document':
          mediaMessage = {
            document: { url: message.mediaUrl },
            fileName: formatted.body || 'Document',
            caption: formatted.body
          };
          break;
        default:
          throw new Error(`Unsupported media type: ${message.mediaType}`);
      }

      const result = await this.socket.sendMessage(jid, mediaMessage);

      this.stats.messagesSent++;
      this.stats.lastActivity = new Date();

      return {
        id: result.key.id,
        fromMe: true,
        status: 'sent',
        timestamp: Date.now(),
        provider: 'baileys'
      };
    } catch (error) {
      this.stats.errorRate = Math.min(100, this.stats.errorRate + 0.5);
      this.handleError(error, 'sendMedia');
      throw error;
    }
  }

  async getConnectionStatus(): Promise<WhatsAppConnection> {
    const status = this.isConnected() ? 'connected' : 'disconnected';
    const number = this.socket?.user?.id.replace(/:.*$/, '') || undefined;

    return {
      id: this.connectionId,
      name: `Baileys - ${this.config.sessionId}`,
      status,
      provider: 'baileys',
      qrcode: status === 'connected' ? undefined : await this.generateQRCode(),
      number,
      messagesCount: this.stats.messagesSent,
      lastMessage: this.stats.lastActivity.toISOString()
    };
  }

  async generateQRCode(): Promise<string> {
    return new Promise((resolve) => {
      if (this.socket) {
        const qrListener = (qr: string) => {
          this.socket?.ev.off('connection.update', qrListener);
          resolve(qr);
        };
        this.socket.ev.on('connection.update', qrListener);

        // Timeout se não gerar QR em 30 segundos
        setTimeout(() => {
          this.socket?.ev.off('connection.update', qrListener);
          resolve('');
        }, 30000);
      } else {
        resolve('');
      }
    });
  }

  async getProfilePicture(number: string): Promise<string> {
    if (!this.isConnected()) {
      return '';
    }

    try {
      const jid = this.validateNumber(number);
      const url = await this.socket.profilePictureUrl(jid);
      return url || '';
    } catch (error) {
      this.log('warn', 'Error getting profile picture', { number, error: error.message });
      return '';
    }
  }

  isConnected(): boolean {
    return this.socket?.user !== undefined && this.socket.ws.readyState === 1;
  }

  getConnectionInfo(): any {
    if (!this.socket) {
      return null;
    }

    return {
      user: {
        id: this.socket.user.id,
        name: this.socket.user.name,
        verified: this.socket.user.verified,
        isBusiness: this.socket.user.isBusiness,
        platform: this.socket.user.platform
      },
      waVersion: this.socket.ws.recv?.closed ? null : this.socket.ws.recv?.closed,
      connectionState: this.socket.ws.readyState
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

  // Métodos adicionais para compatibilidade
  async generatePairingCode(phoneNumber: string): Promise<string> {
    if (!this.socket) {
      throw new Error('[Baileys] Socket not initialized');
    }

    const cleanedNumber = this.validateNumber(phoneNumber).replace(/@s.whatsapp.net$/, '');
    const code = await this.socket.requestPairingCode(cleanedNumber);

    this.log('info', 'Pairing code generated', { phoneNumber });

    return code;
  }

  async logout(): Promise<void> {
    if (!this.socket) {
      return;
    }

    try {
      await this.socket.logout();
      this.log('info', 'Logged out successfully');
    } catch (error) {
      this.handleError(error, 'logout');
      throw error;
    }
  }
}