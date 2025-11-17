import { WhatsAppProviderManager } from '../providers/WhatsAppProviderManager';
import { Provider } from '../models/Provider';
import logger from '../utils/logger';
import featureFlags from '../config/featureFlags';

interface SendMessageParams {
  body: string;
  number: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  quotedMsg?: string;
  messageId?: string;
  ticketId?: number;
  companyId: number;
  providerType?: 'baileys' | 'hub';
  connectionId?: string;
}

interface ProviderConfig {
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

class WhatsAppProviderService {
  private static instance: WhatsAppProviderService;
  private providerManagers: Map<number, WhatsAppProviderManager> = new Map();

  private constructor() {}

  static getInstance(): WhatsAppProviderService {
    if (!WhatsAppProviderService.instance) {
      WhatsAppProviderService.instance = new WhatsAppProviderService();
    }
    return WhatsAppProviderService.instance;
  }

  /**
   * Inicializa o gerenciador de providers para uma empresa
   */
  async initializeProviderManager(companyId: number): Promise<void> {
    try {
      if (!featureFlags.isEnabled('useProvidersSystem')) {
        logger.warn(`WhatsApp Provider System is disabled for company ${companyId}`);
        return;
      }

      if (this.providerManagers.has(companyId)) {
        logger.info(`Provider Manager already initialized for company ${companyId}`);
        return;
      }

      const manager = new WhatsAppProviderManager(companyId);
      await manager.initialize();

      this.providerManagers.set(companyId, manager);

      logger.info(`WhatsApp Provider Manager initialized for company ${companyId}`);

    } catch (error) {
      logger.error(`Failed to initialize WhatsApp Provider Manager for company ${companyId}`, error);
      throw error;
    }
  }

  /**
   * Obtém o gerenciador de providers para uma empresa
   */
  getProviderManager(companyId: number): WhatsAppProviderManager {
    const manager = this.providerManagers.get(companyId);

    if (!manager) {
      throw new Error(`WhatsApp Provider Manager not found for company ${companyId}`);
    }

    return manager;
  }

  /**
   * Envia mensagem de texto
   */
  async sendMessage(params: SendMessageParams): Promise<any> {
    try {
      const manager = this.getProviderManager(params.companyId);

      const options = {
        provider: params.providerType,
        connectionId: params.connectionId
      };

      const message = {
        body: params.body,
        number: params.number,
        ...(params.quotedMsg && { quotedMsg: params.quotedMsg }),
        ...(params.messageId && { messageId: params.messageId }),
        ...(params.ticketId && { ticketId: params.ticketId }),
        companyId: params.companyId
      };

      const result = await manager.sendMessage(message, options);

      // Atualizar estatísticas do provider
      if (result.provider) {
        await this.updateProviderStats(result.provider, params.companyId, 'sent');
      }

      return result;

    } catch (error) {
      logger.error(`Error sending WhatsApp message`, {
        companyId: params.companyId,
        number: params.number,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Envia mensagem de mídia
   */
  async sendMedia(params: SendMessageParams): Promise<any> {
    try {
      const manager = this.getProviderManager(params.companyId);

      if (!params.mediaUrl || !params.mediaType) {
        throw new Error('Media URL and type are required for media messages');
      }

      const options = {
        provider: params.providerType,
        connectionId: params.connectionId
      };

      const message = {
        body: params.body,
        number: params.number,
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
        ...(params.quotedMsg && { quotedMsg: params.quotedMsg }),
        ...(params.messageId && { messageId: params.messageId }),
        ...(params.ticketId && { ticketId: params.ticketId }),
        companyId: params.companyId
      };

      const result = await manager.sendMedia(message, options);

      // Atualizar estatísticas do provider
      if (result.provider) {
        await this.updateProviderStats(result.provider, params.companyId, 'sent');
      }

      return result;

    } catch (error) {
      logger.error(`Error sending WhatsApp media`, {
        companyId: params.companyId,
        number: params.number,
        mediaType: params.mediaType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Adiciona novo provider
   */
  async addProvider(config: ProviderConfig, companyId: number): Promise<void> {
    try {
      // Salvar no banco de dados
      const providerData: any = {
        name: config.name,
        type: config.type,
        companyId,
        isActive: config.isActive,
        isDefault: config.isDefault,
        priority: 0
      };

      if (config.type === 'baileys' && config.baileysConfig) {
        providerData.sessionId = config.baileysConfig.sessionId;
        providerData.deviceName = config.baileysConfig.deviceName;
      } else if (config.type === 'hub' && config.hubConfig) {
        providerData.connectionId = config.hubConfig.connectionId;
        providerData.apiKey = config.hubConfig.apiKey;
        providerData.instanceId = config.hubConfig.instanceId;
        providerData.webhookUrl = config.hubConfig.webhookUrl;
        providerData.webhookSecret = config.hubConfig.webhookSecret;
      }

      await Provider.create(providerData);

      // Inicializar ou atualizar manager
      let manager = this.providerManagers.get(companyId);
      if (!manager) {
        await this.initializeProviderManager(companyId);
        manager = this.getProviderManager(companyId);
      } else {
        await manager.addProvider(config);
      }

      logger.info(`WhatsApp provider added: ${config.type} - ${config.name}`, {
        companyId,
        isActive: config.isActive,
        isDefault: config.isDefault
      });

    } catch (error) {
      logger.error(`Error adding WhatsApp provider`, {
        companyId,
        providerType: config.type,
        providerName: config.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove provider
   */
  async removeProvider(type: 'baileys' | 'hub', name: string, companyId: number): Promise<void> {
    try {
      // Remover do banco de dados
      await Provider.destroy({
        where: {
          type,
          name,
          companyId
        }
      });

      // Remover do manager
      const manager = this.getProviderManager(companyId);
      await manager.removeProvider(`${type}_${name}`);

      logger.info(`WhatsApp provider removed: ${type} - ${name}`, { companyId });

    } catch (error) {
      logger.error(`Error removing WhatsApp provider`, {
        companyId,
        providerType: type,
        providerName: name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Ativa/desativa provider
   */
  async toggleProvider(type: 'baileys' | 'hub', name: string, companyId: number, active: boolean): Promise<void> {
    try {
      // Atualizar no banco de dados
      await Provider.update(
        { isActive: active },
        {
          where: {
            type,
            name,
            companyId
          }
        }
      );

      // Atualizar no manager
      const manager = this.getProviderManager(companyId);
      await manager.toggleProvider(type, name, active);

      logger.info(`WhatsApp provider ${active ? 'activated' : 'deactivated'}: ${type} - ${name}`, {
        companyId
      });

    } catch (error) {
      logger.error(`Error toggling WhatsApp provider`, {
        companyId,
        providerType: type,
        providerName: name,
        active,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Define provider padrão
   */
  async setDefaultProvider(type: 'baileys' | 'hub', name: string, companyId: number): Promise<void> {
    try {
      // Atualizar no banco de dados
      await Provider.update(
        { isDefault: true },
        {
          where: {
            type,
            name,
            companyId
          }
        }
      );

      // Remover default de outros providers
      await Provider.update(
        { isDefault: false },
        {
          where: {
            companyId,
            type: { [require('sequelize').Op.ne]: type },
            name: { [require('sequelize').Op.ne]: name }
          }
        }
      );

      // Atualizar no manager
      const manager = this.getProviderManager(companyId);
      await manager.setDefaultProvider(type, name);

      logger.info(`Default WhatsApp provider set: ${type} - ${name}`, { companyId });

    } catch (error) {
      logger.error(`Error setting default WhatsApp provider`, {
        companyId,
        providerType: type,
        providerName: name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Migra providers
   */
  async migrateProvider(
    fromType: 'baileys' | 'hub',
    fromName: string,
    toType: 'baileys' | 'hub',
    toName: string,
    companyId: number,
    options: { dryRun?: boolean; percentage?: number } = {}
  ): Promise<void> {
    try {
      const manager = this.getProviderManager(companyId);
      await manager.migrateProvider(fromType, fromName, toType, toName, options);

      logger.info(`WhatsApp provider migration completed: ${fromType}-${fromName} → ${toType}-${toName}`, {
        companyId,
        options
      });

    } catch (error) {
      logger.error(`Error migrating WhatsApp provider`, {
        companyId,
        fromType,
        fromName,
        toType,
        toName,
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtém todas as conexões
   */
  async getAllConnections(companyId: number): Promise<any[]> {
    try {
      const manager = this.getProviderManager(companyId);
      return await manager.getAllConnections();

    } catch (error) {
      logger.error(`Error getting WhatsApp connections`, {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtém estatísticas gerais
   */
  async getGeneralStats(companyId: number): Promise<any> {
    try {
      const manager = this.getProviderManager(companyId);
      return await manager.getGeneralStats();

    } catch (error) {
      logger.error(`Error getting WhatsApp provider stats`, {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Processa webhook
   */
  async processWebhook(
    providerType: 'baileys' | 'hub',
    companyId: number,
    event: any,
    signature?: string,
    secret?: string
  ): Promise<void> {
    try {
      const manager = this.getProviderManager(companyId);
      await manager.processWebhook(providerType, event, signature, secret);

      // Atualizar estatísticas
      if (event.type === 'message' && !event.data.fromMe) {
        await this.updateProviderStats(providerType, companyId, 'received');
      }

    } catch (error) {
      logger.error(`Error processing WhatsApp webhook`, {
        companyId,
        providerType,
        eventType: event.type,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Realiza health check
   */
  async healthCheck(companyId: number): Promise<{ [providerId: string]: boolean }> {
    try {
      const manager = this.getProviderManager(companyId);
      return await manager.healthCheck();

    } catch (error) {
      logger.error(`Error performing WhatsApp provider health check`, {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Atualiza estatísticas do provider
   */
  private async updateProviderStats(providerType: 'baileys' | 'hub', companyId: number, action: 'sent' | 'received'): Promise<void> {
    try {
      const incrementField = action === 'sent' ? 'messagesSent' : 'messagesReceived';

      await Provider.increment(incrementField, {
        where: {
          type: providerType,
          companyId,
          isActive: true
        }
      });

    } catch (error) {
      logger.error(`Error updating provider stats`, {
        companyId,
        providerType,
        action,
        error: error.message
      });
      // Não propagar erro para não afetar o envio da mensagem
    }
  }

  /**
   * Limpa gerenciadores (para shutdown)
   */
  async cleanup(): Promise<void> {
    for (const [companyId, manager] of this.providerManagers.entries()) {
      try {
        await manager.disconnectAll();
        logger.info(`WhatsApp Provider Manager cleaned up for company ${companyId}`);
      } catch (error) {
        logger.error(`Error cleaning up WhatsApp Provider Manager for company ${companyId}`, error);
      }
    }
    this.providerManagers.clear();
  }

  /**
   * Obtém todos os providers ativos de uma empresa
   */
  async getActiveProviders(companyId: number): Promise<Provider[]> {
    try {
      return await Provider.scope('active').findAll({
        where: { companyId },
        order: [['isDefault', 'DESC'], ['priority', 'DESC'], ['createdAt', 'ASC']]
      });

    } catch (error) {
      logger.error(`Error getting active WhatsApp providers`, {
        companyId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verifica se empresa tem providers configurados
   */
  async hasProviders(companyId: number): Promise<boolean> {
    try {
      const count = await Provider.scope('active').count({
        where: { companyId }
      });
      return count > 0;

    } catch (error) {
      logger.error(`Error checking if company has WhatsApp providers`, {
        companyId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Obtém provider padrão de uma empresa
   */
  async getDefaultProvider(companyId: number): Promise<Provider | null> {
    try {
      return await Provider.scope('default').findOne({
        where: { companyId }
      });

    } catch (error) {
      logger.error(`Error getting default WhatsApp provider`, {
        companyId,
        error: error.message
      });
      return null;
    }
  }
}

export default WhatsAppProviderService.getInstance();