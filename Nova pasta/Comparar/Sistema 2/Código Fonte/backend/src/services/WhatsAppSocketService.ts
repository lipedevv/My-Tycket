import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import AppError from '../errors/AppError';
import User from '../models/User';
import WhatsAppProviderService from './WhatsAppProviderService';
import { Ticket } from '../models/Ticket';
import { Message } from '../models/Message';
import { Contact } from '../models/Contact';
import logger from '../utils/logger';
import featureFlags from '../config/featureFlags';

interface AuthenticatedSocket {
  userId: number;
  companyId: number;
  userEmail: string;
  user: User;
}

interface WhatsAppSocketData {
  ticketId?: number;
  providerType?: 'baileys' | 'hub';
  connectionId?: string;
  action?: string;
  data?: any;
}

class WhatsAppSocketService {
  private io: Server;
  private providerService: WhatsAppProviderService;
  private connectedSockets: Map<string, AuthenticatedSocket> = new Map();
  private userSockets: Map<number, Set<string>> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL?.split(',') || ["http://localhost:3000"],
        methods: ['GET', 'POST']
      },
      transports: ['websocket'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.providerService = WhatsAppProviderService.getInstance();
    this.setupMiddlewares();
    this.setupEventHandlers();
  }

  /**
   * Configura middlewares do Socket.io
   */
  private setupMiddlewares(): void {
    // Middleware de autenticação
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error('Authentication token is required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
          id: number;
          email: string;
          companyId: number;
          iat: number;
          exp: number;
        };

        // Validar se o token não expirou
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now || decoded.iat > now) {
          return next(new Error('Token expired'));
        }

        // Buscar usuário no banco
        const user = await User.findByPk(decoded.id, {
          include: ['company']
        });

        if (!user || user.companyId !== decoded.companyId || user.companyId === null) {
          return next(new Error('Invalid user'));
        }

        if (user.company?.status !== 'active') {
          return next(new Error('Company is not active'));
        }

        // Anexar informações de autenticação ao socket
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        socket.companyId = decoded.companyId;
        socket.user = user;

        return next();
      } catch (error) {
          logger.error('Socket authentication error:', error);
          return next(new Error('Authentication failed'));
        }
      });
    });
  }

  /**
   * Configura event handlers do Socket.io
   */
  private setupEventHandlers(): void {
    this.io.on('connection', this.handleConnection.bind(this));
    this.io.on('disconnect', this.handleDisconnect.bind(this));
  }

  /**
   * Manipula nova conexão
   */
  private async handleConnection(socket: any): Promise<void> {
    try {
      const socketId = socket.id;
      const userId = socket.userId;
      const companyId = socket.companyId;

      logger.info(`Socket connected`, {
        socketId,
        userId,
        userEmail: socket.userEmail,
        companyId
      });

      // Registrar socket conectado
      this.connectedSockets.set(socketId, {
        userId,
        companyId,
        userEmail: socket.userEmail,
        user: socket.user
      });

      // Adicionar socket à lista do usuário
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socketId);

      // Inicializar provider manager para a empresa
      try {
        if (featureFlags.isEnabled('useProvidersSystem')) {
          await this.providerService.initializeProviderManager(companyId);
        }
      } catch (error) {
        logger.error('Error initializing provider manager for socket:', error);
      }

      // Entrar no room da empresa
      socket.join(`company_${companyId}`);

      // Enviar informações de inicialização
      socket.emit('connected', {
        message: 'Successfully connected to WhatsApp service',
        userId,
        companyId,
        timestamp: new Date()
      });

      // Enviar status inicial dos providers se habilitado
      if (featureFlags.isEnabled('useProvidersSystem')) {
        try {
          const connections = await this.providerService.getAllConnections(companyId);
          socket.emit('providers_status', connections);
        } catch (error) {
          logger.error('Error getting providers status for socket:', error);
        }
      }

    } catch (error) {
      logger.error('Error handling socket connection:', error);
      socket.disconnect();
    }
  }

  /**
   * Manipula desconexão
   */
  private handleDisconnect(socket: any, reason: string): void {
    try {
      const socketId = socket.id;
      const userId = socket.userId;
      const companyId = socket.companyId;

      logger.info(`Socket disconnected`, {
        socketId,
        userId,
        companyId,
        reason
      });

      // Remover socket dos registros
      this.connectedSockets.delete(socketId);

      // Remover socket da lista do usuário
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }

    } catch (error) {
      logger.error('Error handling socket disconnection:', error);
    }
  }

  /**
   * Emite evento para todos os sockets de uma empresa
   */
  emitToCompany(companyId: number, event: string, data: any): void {
    try {
      this.io.to(`company_${companyId}`).emit(event, {
        ...data,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error emitting to company:', error);
    }
  }

  /**
   * Emite evento para todos os sockets de um usuário
   */
  emitToUser(userId: number, event: string, data: any): void {
    try {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          this.io.to(socketId).emit(event, {
            ...data,
            timestamp: new Date()
          });
        });
      }
    } catch (error) {
      logger.error('Error emitting to user:', error);
    }
  }

  /**
   * Envia status de conexão para empresa
   */
  sendConnectionStatus(companyId: number, connectionStatus: any): void {
    this.emitToCompany(companyId, 'whatsapp_status', {
      connectionStatus,
      source: 'provider_manager'
    });
  }

  /**
   * Envia QR Code para usuário específico
   */
  sendQRCode(userId: number, providerId: string, qrcode: string): void {
    this.emitToUser(userId, 'whatsapp_qrcode', {
      qrcode,
      providerId,
      source: 'baileys'
    });
  }

  /**
   * Envia status de mensagem para empresa
   */
  sendMessageStatus(companyId: number, messageId: string, status: string, ticketId?: number): void {
    this.emitToCompany(companyId, 'whatsapp_message_status', {
      messageId,
      status,
      ticketId,
      source: 'provider_manager',
      timestamp: new Date()
    });
  }

  /**
   * Envia webhook processado para empresa
   */
  sendWebhook(companyId: number, webhookData: any): void {
    this.emitToCompany(companyId, 'whatsapp_webhook', {
      ...webhookData,
      timestamp: new Date()
    });
  }

  /**
   * Envia erro para usuário específico
   */
  sendError(userId: number, error: any, ticketId?: number): void {
    this.emitToUser(userId, 'whatsapp_error', {
      ...error,
      ticketId,
      timestamp: new Date()
    });
  }

  /**
   * Envia erro para empresa
   */
  sendCompanyError(companyId: number, error: any): void {
    this.emitToCompany(companyId, 'whatsapp_error', {
      ...error,
      timestamp: new Date()
    });
  }

  /**
   * Envia notificação de provider
   */
  sendProviderNotification(companyId: number, notification: any): void {
    this.emitToCompany(companyId, 'whatsapp_provider_notification', {
      ...notification,
      timestamp: new Date()
    });
  }

  /**
   * Envia evento de FlowBuilder
   */
  sendFlowBuilderEvent(companyId: number, event: string, data: any): void {
    this.emitToCompany(companyId, 'flowbuilder_event', {
      ...data,
      event,
      timestamp: new Date()
    });
  }

  /**
   * Envia evento de migration de provider
   */
  sendProviderMigrationEvent(companyId: number, event: string, data: any): void {
    this.emitToCompany(companyId, 'provider_migration_event', {
      ...data,
      event,
      timestamp: new Date()
    });
  }

  /**
   * Envia atualização de stats em tempo real
   */
  sendStatsUpdate(companyId: number, stats: any): void {
    this.emitToCompany(companyId, 'stats_update', {
      ...stats,
      timestamp: new Date()
    });
  }

  /**
   * Envia atualização de tickets
   */
  sendTicketUpdate(companyId: number, ticket: any, action: string): void {
    this.emitToCompany(companyId, 'ticket_update', {
      ticket,
      action,
      timestamp: new Date()
    });
  }

  /**
   * Envia atualização de contato
   */
  sendContactUpdate(companyId: number, contact: any): void {
    this.emitToCompany(companyId, 'contact_update', {
      contact,
      timestamp: new Date()
    });
  }

  /**
   * Envia atualização de usuário
   */
  sendUserUpdate(userId: number, user: any): void {
    this.emitToUser(userId, 'user_update', {
      user,
      timestamp: new Date()
    });
  }

  /**
   * Envia evento de heartbeat para todos os clientes
   */
  sendHeartbeat(): void {
    try {
      this.io.emit('heartbeat', {
        timestamp: new Date(),
        connectedSockets: this.connectedSockets.size,
        connectedUsers: this.userSockets.size
      });
    } catch (error) {
      logger.error('Error sending heartbeat:', error);
    }
  }

  /**
   * Inicia heartbeat periódico
   */
  startHeartbeat(): void {
    // Enviar heartbeat a cada 30 segundos
    setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    logger.info('WhatsApp socket heartbeat started');
  }

  /**
   * Obtém informações sobre conexões ativas
   */
  getConnectionStats(): any {
    return {
      totalConnections: this.connectedSockets.size,
      connectedUsers: this.userSockets.size,
      connectedCompanies: new Set(
        Array.from(this.connectedSockets.values()).map(socket => socket.companyId)
      ).size
    };
  }

  /**
   * Obtém informações de um socket específico
   */
  getSocketInfo(socketId: string): AuthenticatedSocket | null {
    return this.connectedSockets.get(socketId) || null;
  }

  /**
   * Obtém todos os sockets de um usuário
   */
  getUserSockets(userId: number): Set<string> {
    return this.userSockets.get(userId) || new Set();
  }

  /**
   * Desconecta todos os sockets de uma empresa
   */
  disconnectCompany(companyId: number): void {
    const socketsToDisconnect: string[] = [];

    // Encontrar todos os sockets da empresa
    this.connectedSockets.forEach((socket, socketId) => {
      if (socket.companyId === companyId) {
        socketsToDisconnect.push(socketId);
      }
    });

    // Desconectar sockets
    socketsToDisconnect.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });

    logger.info(`Disconnected ${socketsToDisconnect.length} sockets for company ${companyId}`);
  }

  /**
   * Desconecta todos os sockets de um usuário
   */
  disconnectUser(userId: number): void {
    const socketsToDisconnect: string[] = [];

    // Encontrar todos os sockets do usuário
    this.userSockets.get(userId)?.forEach(socketId => {
      socketsToDisconnect.push(socketId);
    });

    // Desconectar sockets
    socketsToDisconnect.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });

    logger.info(`Disconnected ${socketsToDisconnect.length} sockets for user ${userId}`);
  }

  /**
   * Obtém servidor Socket.io
   */
  getServer(): Server {
    return this.io;
  }
}

export default WhatsAppSocketService;