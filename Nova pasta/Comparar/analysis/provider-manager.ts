// src/providers/ProviderManager.ts
// Gerenciador central de providers WhatsApp

import BaseWhatsAppProvider from './BaseWhatsAppProvider';
import { BaileysProvider } from './BaileysProvider';
import { HubProvider } from './HubProvider';
import { WhatsAppConnection, WhatsAppMessage } from './BaseWhatsAppProvider';

export interface WhatsAppConfig {
  type: 'baileys' | 'hub';
  name: string;
  isActive: boolean;
  isDefault: boolean;
  baileysConfig?: {
    sessionId: string;
  };
  hubConfig?: {
    connectionId: string;
    apiKey: string;
    instanceId: string;
    webhookUrl: string;
    webhookSecret: string;
  };
}

export class WhatsAppProviderManager {
  private providers: Map<string, BaseWhatsAppProvider> = new Map();
  private configs: Map<string, WhatsAppConfig> = new Map();
  private companyId: number;

  constructor(companyId: number) {
    this.companyId = companyId;
  }

  /**
   * Adiciona uma nova configuração de provider
   */
  async addProvider(config: WhatsAppConfig): Promise<void> {
    const providerId = `${config.type}_${config.name}`;

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
      provider = new BaileysProvider(this.companyId, config.baileysConfig.sessionId);
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

    console.log(`[ProviderManager] Added ${config.type} provider: ${config.name}`);
  }

  /**
   * Remove um provider
   */
  async removeProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.disconnect();
      this.providers.delete(providerId);
      this.configs.delete(providerId);
    }
  }

  /**
   * Obtém o provider padrão para envio de mensagens
   */
  getDefaultProvider(): BaseWhatsAppProvider | null {
    for (const [providerId, config] of this.configs.entries()) {
      if (config.isDefault && config.isActive) {
        return this.providers.get(providerId) || null;
      }
    }
    return null;
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
    // Remover status de padrão de todos os providers
    for (const [providerId, config] of this.configs.entries()) {
      config.isDefault = false;
    }

    // Definir novo padrão
    const providerId = `${type}_${name}`;
    const config = this.configs.get(providerId);

    if (config) {
      config.isDefault = true;
      console.log(`[ProviderManager] Default provider set to: ${type} - ${name}`);
    } else {
      throw new Error(`Provider not found: ${type} - ${name}`);
    }
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
          console.error(`[ProviderManager] Error getting connection status for ${providerId}:`, error);
        }
      }
    }

    return connections;
  }

  /**
   * Envia mensagem usando o provider padrão
   */
  async sendMessage(message: WhatsAppMessage): Promise<any> {
    const defaultProvider = this.getDefaultProvider();

    if (!defaultProvider) {
      throw new Error('[ProviderManager] No default provider available');
    }

    return await defaultProvider.sendMessage(message);
  }

  /**
   * Envia mídia usando o provider padrão
   */
  async sendMedia(message: WhatsAppMessage): Promise<any> {
    const defaultProvider = this.getDefaultProvider();

    if (!defaultProvider) {
      throw new Error('[ProviderManager] No default provider available');
    }

    return await defaultProvider.sendMedia(message);
  }

  /**
   * Envia mensagem usando um provider específico
   */
  async sendMessageWithProvider(
    message: WhatsAppMessage,
    providerType: 'baileys' | 'hub',
    providerName: string
  ): Promise<any> {
    const provider = this.getProvider(providerType, providerName);

    if (!provider) {
      throw new Error(`[ProviderManager] Provider not found: ${providerType} - ${providerName}`);
    }

    return await provider.sendMessage(message);
  }

  /**
   * Obtém configurações de todos os providers
   */
  getConfigs(): WhatsAppConfig[] {
    return Array.from(this.configs.values());
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

    console.log(`[ProviderManager] Provider ${type} - ${name} ${active ? 'activated' : 'deactivated'}`);
  }

  /**
   * Migra mensagens de um provider para outro
   */
  async migrateProvider(
    fromType: 'baileys' | 'hub',
    fromName: string,
    toType: 'baileys' | 'hub',
    toName: string
  ): Promise<void> {
    const fromProvider = this.getProvider(fromType, fromName);
    const toProvider = this.getProvider(toType, toName);

    if (!fromProvider || !toProvider) {
      throw new Error('Source or destination provider not found');
    }

    console.log(`[ProviderManager] Starting migration from ${fromType}-${fromName} to ${toType}-${toName}`);

    try {
      // 1. Ativar provider de destino
      await this.toggleProvider(toType, toName, true);

      // 2. Esperar conexão estabilizar
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Definir como padrão
      await this.setDefaultProvider(toType, toName);

      // 4. Manter ambos ativos por um período (overlap)
      console.log('[ProviderManager] Migration completed. Keeping both providers active for overlap period.');

    } catch (error) {
      console.error('[ProviderManager] Migration failed:', error);
      throw error;
    }
  }

  /**
   * Desconecta todos os providers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.providers.values()).map(provider =>
      provider.disconnect().catch(error =>
        console.error('[ProviderManager] Error disconnecting provider:', error)
      )
    );

    await Promise.all(disconnectPromises);
    this.providers.clear();
    this.configs.clear();

    console.log('[ProviderManager] All providers disconnected');
  }

  /**
   * Obtém estatísticas de uso
   */
  getStats(): {
    totalProviders: number;
    activeProviders: number;
    defaultProvider: string;
    providersByType: { baileys: number; hub: number };
  } {
    const configs = Array.from(this.configs.values());
    const activeConfigs = configs.filter(config => config.isActive);
    const defaultConfig = configs.find(config => config.isDefault);

    return {
      totalProviders: configs.length,
      activeProviders: activeConfigs.length,
      defaultProvider: defaultConfig ? `${defaultConfig.type}-${defaultConfig.name}` : 'none',
      providersByType: {
        baileys: configs.filter(config => config.type === 'baileys').length,
        hub: configs.filter(config => config.type === 'hub').length
      }
    };
  }
}