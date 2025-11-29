import { BaseWhatsAppProvider } from './BaseWhatsAppProvider';
import { BaileysProvider } from './BaileysProvider';
import { HubProvider } from './HubProvider';
import { WhatsAppMessage, WhatsAppConnection, WebhookEvent, ProviderConfig, ProviderStats } from '../@types/WhatsAppProvider';
import { Provider as ProviderModel, Whatsapp as WhatsappModel } from '../models';
import logger from '../utils/logger';

export interface SendMessageOptions {
  provider?: 'baileys' | 'hub';
  connectionId?: string;
  forceProvider?: boolean;
}

export interface MigrationOptions {
  dryRun?: boolean;
  percentage?: number;
  skipValidation?: boolean;
}

export class WhatsAppProviderManager {
  private providers: Map<string, BaseWhatsAppProvider> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();
  private companyId: number;
  private defaultProviderId: string | null = null;
  private isInitialized = false;

  constructor(companyId: number) {
    this.companyId = companyId;
  }

  /**
   * Inicializa o manager carregando providers do banco de dados
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Initializing WhatsApp Provider Manager for company ${this.companyId}`);

      // Carregar configurações do banco de dados
      const providers = await this.loadProviderConfigs();

      // Inicializar cada provider
      for (const config of providers) {
        await this.addProvider(config);
      }

      // Configurar provider padrão
      await this.setupDefaultProvider();

      this.isInitialized = true;
      logger.info(`WhatsApp Provider Manager initialized with ${this.providers.size} providers`);

    } catch (error) {
      logger.error(`Failed to initialize WhatsApp Provider Manager for company ${this.companyId}`, error);
      throw error;
    }
  }

  /**
   * Carrega configurações dos providers do banco de dados
   */
  private async loadProviderConfigs(): Promise<ProviderConfig[]> {
    try {
      // Buscar providers no banco
      const providers = await ProviderModel.findAll({
        where: { companyId: this.companyId },
        include: [
          {
            model: WhatsappModel,
            as: 'whatsapp'
          }
        ]
      });

      const configs: ProviderConfig[] = [];

      for (const provider of providers) {
        const config: ProviderConfig = {
          type: provider.type as 'baileys' | 'hub',
          name: provider.name,
          isActive: provider.isActive,
          isDefault: provider.isDefault,
          companyId: provider.companyId
        };

        // Configuração específica por tipo
        if (provider.type === 'baileys') {
          config.baileysConfig = {
            sessionId: provider.sessionId || `${provider.id}_session`,
            deviceName: provider.deviceName
          };
        } else if (provider.type === 'hub') {
          config.hubConfig = {
            connectionId: provider.connectionId,
            apiKey: provider.apiKey,
            instanceId: provider.instanceId,
            webhookUrl: provider.webhookUrl,
            webhookSecret: provider.webhookSecret
          };
        }

        configs.push(config);
      }

      return configs;

    } catch (error) {
      logger.error('Error loading provider configs from database', error);
      // Retornar configuração padrão para compatibilidade
      return [{
        type: 'baileys',
        name: 'Default Baileys',
        isActive: true,
        isDefault: true,
        companyId: this.companyId,
        baileysConfig: {
          sessionId: 'default_session'
        }
      }];
    }
  }

  /**
   * Adiciona uma nova configuração de provider
   */
  async addProvider(config: ProviderConfig): Promise<void> {
    const providerId = `${config.type}_${config.name}`;

    try {
      // Remover provider existente com mesmo ID
      if (this.providers.has(providerId)) {
        await this.removeProvider(providerId);
      }

      // Criar provider baseado no tipo
      let provider: BaseWhatsAppProvider;

      if (config.type === 'baileys') {
        if (!config.baileysConfig) {
          throw new Error('Baileys config is required for Baileys provider');
        }
        provider = new BaileysProvider(this.companyId, config.baileysConfig);
      } else if (config.type === 'hub') {
        if (!config.hubConfig) {
          throw new Error('Hub config is required for Hub provider');
        }
        provider = new HubProvider(this.companyId, config.hubConfig);
      } else {
        throw new Error(`Unsupported provider type: ${config.type}`);
      }

      // Salvar configuração e provider
      this.configs.set(providerId, config);
      this.providers.set(providerId, provider);

      // Conectar se estiver ativo
      if (config.isActive) {
        await provider.connect();
      }

      // Definir como padrão se marcado
      if (config.isDefault) {
        this.defaultProviderId = providerId;
      }

      logger.info(`Added ${config.type} provider: ${config.name}`, {
        providerId,
        isActive: config.isActive,
        isDefault: config.isDefault
      });

    } catch (error) {
      logger.error(`Failed to add provider ${providerId}`, error);
      throw error;
    }
  }

  /**
   * Remove um provider
   */
  async removeProvider(providerId: string): Promise<void> {
    try {
      const provider = this.providers.get(providerId);
      if (provider) {
        await provider.disconnect();
        this.providers.delete(providerId);
        this.configs.delete(providerId);

        // Se era o provider padrão, limpar referência
        if (this.defaultProviderId === providerId) {
          this.defaultProviderId = null;
        }
      }

      logger.info(`Removed provider: ${providerId}`);

    } catch (error) {
      logger.error(`Failed to remove provider ${providerId}`, error);
      throw error;
    }
  }

  /**
   * Configura o provider padrão baseado nas configurações
   */
  private async setupDefaultProvider(): Promise<void> {
    for (const [providerId, config] of this.configs.entries()) {
      if (config.isDefault && config.isActive) {
        this.defaultProviderId = providerId;
        logger.info(`Default provider set to: ${providerId}`);
        return;
      }
    }

    // Se não houver provider padrão, usar o primeiro ativo
    for (const [providerId, config] of this.configs.entries()) {
      if (config.isActive) {
        this.defaultProviderId = providerId;
        logger.info(`Fallback default provider set to: ${providerId}`);
        return;
      }
    }

    logger.warn('No active providers found');
  }

  /**
   * Obtém o provider padrão para envio de mensagens
   */
  getDefaultProvider(): BaseWhatsAppProvider | null {
    if (!this.defaultProviderId) {
      return null;
    }
    return this.providers.get(this.defaultProviderId) || null;
  }

  /**
   * Obtém um provider específico
   */
  getProvider(type: 'baileys' | 'hub', name: string): BaseWhatsAppProvider | null {
    const providerId = `${type}_${name}`;
    return this.providers.get(providerId) || null;
  }

  /**
   * Define o provider padrão
   */
  async setDefaultProvider(type: 'baileys' | 'hub', name: string): Promise<void> {
    const providerId = `${type}_${name}`;
    const provider = this.providers.get(providerId);
    const config = this.configs.get(providerId);

    if (!provider || !config) {
      throw new Error(`Provider not found: ${type} - ${name}`);
    }

    if (!config.isActive) {
      throw new Error(`Provider is not active: ${type} - ${name}`);
    }

    // Remover status de padrão de todos os providers
    for (const [id, cfg] of this.configs.entries()) {
      cfg.isDefault = false;
    }

    // Definir novo padrão
    config.isDefault = true;
    this.defaultProviderId = providerId;

    // Atualizar no banco de dados
    await ProviderModel.update(
      { isDefault: true },
      { where: { type, name, companyId: this.companyId } }
    );

    await ProviderModel.update(
      { isDefault: false },
      {
        where: {
          companyId: this.companyId,
          id: { [require('sequelize').Op.ne]: provider.id }
        }
      }
    );

    logger.info(`Default provider set to: ${type} - ${name}`);
  }

  /**
   * Obtém todas as conexões ativas
   */
  async getAllConnections(): Promise<WhatsAppConnection[]> {
    const connections: WhatsAppConnection[] = [];

    for (const [providerId, provider] of this.providers.entries()) {
      const config = this.configs.get(providerId);
      if (config && config.isActive) {
        try {
          const connection = await provider.getConnectionStatus();
          connections.push(connection);
        } catch (error) {
          logger.error(`Error getting connection status for ${providerId}`, error);
        }
      }
    }

    return connections;
  }

  /**
   * Envia mensagem usando regras de roteamento
   */
  async sendMessage(message: WhatsAppMessage, options: SendMessageOptions = {}): Promise<any> {
    await this.ensureInitialized();

    let provider: BaseWhatsAppProvider | null = null;

    // Se provider específico foi solicitado
    if (options.provider && options.connectionId) {
      provider = this.getProvider(options.provider, options.connectionId);
    } else if (options.provider) {
      // Buscar primeiro provider do tipo solicitado
      for (const [providerId, config] of this.configs.entries()) {
        if (config.type === options.provider && config.isActive) {
          provider = this.providers.get(providerId);
          break;
        }
      }
    } else {
      // Usar provider padrão
      provider = this.getDefaultProvider();
    }

    if (!provider) {
      throw new Error('No suitable provider available for sending message');
    }

    // Se não for forçado e provider não estiver conectado, tentar fallback
    if (!options.forceProvider && !provider.isConnected()) {
      const fallbackProvider = await this.getFallbackProvider(provider);
      if (fallbackProvider) {
        logger.warn(`Primary provider not connected, using fallback`);
        provider = fallbackProvider;
      }
    }

    if (!provider.isConnected()) {
      throw new Error(`Provider ${provider.getProviderType()} is not connected`);
    }

    return await provider.sendMessage(message);
  }

  /**
   * Envia mídia usando regras de roteamento
   */
  async sendMedia(message: WhatsAppMessage, options: SendMessageOptions = {}): Promise<any> {
    await this.ensureInitialized();

    let provider: BaseWhatsAppProvider | null = null;

    if (options.provider && options.connectionId) {
      provider = this.getProvider(options.provider, options.connectionId);
    } else {
      provider = this.getDefaultProvider();
    }

    if (!provider) {
      throw new Error('No suitable provider available for sending media');
    }

    return await provider.sendMedia(message);
  }

  /**
   * Obtém provider de fallback
   */
  private async getFallbackProvider(excludeProvider: BaseWhatsAppProvider): Promise<BaseWhatsAppProvider | null> {
    for (const [providerId, provider] of this.providers.entries()) {
      const config = this.configs.get(providerId);
      if (
        config &&
        config.isActive &&
        provider !== excludeProvider &&
        provider.isConnected()
      ) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Ativa/desativa um provider
   */
  async toggleProvider(type: 'baileys' | 'hub', name: string, active: boolean): Promise<void> {
    const providerId = `${type}_${name}`;
    const provider = this.providers.get(providerId);
    const config = this.configs.get(providerId);

    if (!provider || !config) {
      throw new Error(`Provider not found: ${type} - ${name}`);
    }

    if (active && !config.isActive) {
      await provider.connect();
      config.isActive = true;
    } else if (!active && config.isActive) {
      await provider.disconnect();
      config.isActive = false;
    }

    // Atualizar no banco de dados
    await ProviderModel.update(
      { isActive: active },
      { where: { type, name, companyId: this.companyId } }
    );

    logger.info(`Provider ${type} - ${name} ${active ? 'activated' : 'deactivated'}`);
  }

  /**
   * Migra mensagens de um provider para outro
   */
  async migrateProvider(
    fromType: 'baileys' | 'hub',
    fromName: string,
    toType: 'baileys' | 'hub',
    toName: string,
    options: MigrationOptions = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const fromProvider = this.getProvider(fromType, fromName);
    const toProvider = this.getProvider(toType, toName);

    if (!fromProvider || !toProvider) {
      throw new Error('Source or destination provider not found');
    }

    logger.info(`Starting migration from ${fromType}-${fromName} to ${toType}-${toName}`, options);

    try {
      // 1. Ativar provider de destino
      await this.toggleProvider(toType, toName, true);

      // 2. Esperar conexão estabilizar
      if (!toProvider.isConnected()) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // 3. Em dry run, apenas validar
      if (options.dryRun) {
        logger.info('Dry run migration completed');
        return;
      }

      // 4. Definir como padrão
      await this.setDefaultProvider(toType, toName);

      // 5. Manter ambos ativos por período de overlap (opcional)
      if (options.percentage && options.percentage > 0) {
        logger.info(`Migration completed with ${options.percentage}% overlap period`);
        // Implementar lógica de distribuição percentual aqui
      } else {
        logger.info('Migration completed');
      }

    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }

  /**
   * Processa webhook de um provider específico
   */
  async processWebhook(providerType: 'baileys' | 'hub', event: any, signature?: string, secret?: string): Promise<void> {
    if (providerType === 'hub') {
      // Validar e processar webhook do Hub
      const hubEvent = HubProvider.processWebhook(event, signature, secret);
      if (hubEvent) {
        this.emitWebhookEvent(hubEvent);
      }
    } else {
      // Para Baileys, o evento já vem formatado
      const baileysEvent: WebhookEvent = {
        ...event,
        source: 'baileys',
        timestamp: Date.now()
      };
      this.emitWebhookEvent(baileysEvent);
    }
  }

  /**
   * Emite evento de webhook para o sistema
   */
  private emitWebhookEvent(event: WebhookEvent): void {
    try {
      if (global.io) {
        global.io.to(`company_${this.companyId}`).emit('whatsapp_webhook', event);
      }

      // Aqui você pode adicionar lógica adicional para processar eventos
      // como criar tickets, atualizar status, etc.

    } catch (error) {
      logger.error('Error emitting webhook event', error);
    }
  }

  /**
   * Obtém estatísticas de todos os providers
   */
  async getAllStats(): Promise<{ [providerId: string]: ProviderStats }> {
    const stats: { [providerId: string]: ProviderStats } = {};

    for (const [providerId, provider] of this.providers.entries()) {
      try {
        stats[providerId] = await provider.getStats();
      } catch (error) {
        logger.error(`Error getting stats for ${providerId}`, error);
      }
    }

    return stats;
  }

  /**
   * Obtém estatísticas gerais
   */
  async getGeneralStats(): Promise<{
    totalProviders: number;
    activeProviders: number;
    connectedProviders: number;
    defaultProvider: string;
    providersByType: { baileys: number; hub: number };
  }> {
    const configs = Array.from(this.configs.values());
    const activeConfigs = configs.filter(config => config.isActive);

    let connectedProviders = 0;
    for (const [providerId, provider] of this.providers.entries()) {
      if (this.configs.get(providerId)?.isActive && provider.isConnected()) {
        connectedProviders++;
      }
    }

    const defaultConfig = configs.find(config => config.isDefault);

    return {
      totalProviders: configs.length,
      activeProviders: activeConfigs.length,
      connectedProviders,
      defaultProvider: defaultConfig ? `${defaultConfig.type}-${defaultConfig.name}` : 'none',
      providersByType: {
        baileys: configs.filter(config => config.type === 'baileys').length,
        hub: configs.filter(config => config.type === 'hub').length
      }
    };
  }

  /**
   * Realiza health check em todos os providers
   */
  async healthCheck(): Promise<{ [providerId: string]: boolean }> {
    const results: { [providerId: string]: boolean } = {};

    for (const [providerId, provider] of this.providers.entries()) {
      try {
        results[providerId] = provider.isConnected();
      } catch (error) {
        results[providerId] = false;
        logger.error(`Health check failed for ${providerId}`, error);
      }
    }

    return results;
  }

  /**
   * Limpa todos os providers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.providers.values()).map(provider =>
      provider.disconnect().catch(error =>
        logger.error('Error disconnecting provider', error)
      )
    );

    await Promise.all(disconnectPromises);
    this.providers.clear();
    this.configs.clear();
    this.defaultProviderId = null;
    this.isInitialized = false;

    logger.info('All providers disconnected');
  }

  /**
   * Garante que o manager está inicializado
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}