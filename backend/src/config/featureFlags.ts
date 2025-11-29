/**
 * Sistema de Feature Flags para controle de funcionalidades
 * Permite ativar/desativar recursos sem deploy
 */

interface FeatureFlags {
  // Controladores de Providers
  useProvidersSystem: boolean;
  useDualProviders: boolean;
  useDefaultProviderSelection: boolean;
  useProviderFallback: boolean;
  allowProviderMigration: boolean;

  // FlowBuilder e Automação
  useFlowBuilder: boolean;
  useFlowEngine: boolean;
  useFlowTemplates: boolean;
  useAdvancedFlowNodes: boolean;
  allowFlowScheduler: boolean;

  // Notifica-me Hub
  useNotificationHub: boolean;
  useHubChannels: boolean;
  useHubWebhooks: boolean;
  allowHubConfiguration: boolean;

  // Mensagens e Comunicação
  useMessageRouting: boolean;
  useChannelSelection: boolean;
  useAdvancedMediaTypes: boolean;
  allowBulkMessages: boolean;

  // Interface e Usabilidade
  useKanbanView: boolean;
  useAdvancedDashboard: boolean;
  useCustomThemes: boolean;
  allowWidgetConfiguration: boolean;

  // APIs e Integrações
  useAPIv1: boolean;
  useGraphQL: boolean;
  allowWebhookConfiguration: boolean;
  useExternalIntegrations: boolean;

  // Performance e Monitoramento
  useAdvancedCaching: boolean;
  usePerformanceMonitoring: boolean;
  useAdvancedLogging: boolean;
  allowHealthChecks: boolean;

  // Segurança e Autenticação
  useEnhancedSecurity: boolean;
  useAPIKeyAuth: boolean;
  useIPWhitelist: boolean;
  allowAdvancedPermissions: boolean;

  // Analytics e Relatórios
  useAdvancedAnalytics: boolean;
  useCustomReports: boolean;
  allowReportBuilder: boolean;
  useExportIntegration: boolean;

  // Experimentais (mantenha false em produção)
  useBetaFeatures: boolean;
  useExperimentalAI: boolean;
  allowBetaTesting: boolean;
}

/**
 * Configuração de Feature Flags
 * Pode ser sobrescrito por variáveis de ambiente
 */
const defaultFeatureFlags: FeatureFlags = {
  // Controladores de Providers
  useProvidersSystem: process.env.USE_PROVIDERS_SYSTEM !== "false", // true por padrão
  useDualProviders: process.env.USE_DUAL_PROVIDERS === "true",
  useDefaultProviderSelection: process.env.USE_DEFAULT_PROVIDER_SELECTION !== "false", // true por padrão
  useProviderFallback: process.env.USE_PROVIDER_FALLBACK === "true",
  allowProviderMigration: process.env.ALLOW_PROVIDER_MIGRATION === "true",

  // FlowBuilder e Automação
  useFlowBuilder: process.env.USE_FLOWBUILDER === "true",
  useFlowEngine: process.env.USE_FLOW_ENGINE === "true",
  useFlowTemplates: process.env.USE_FLOW_TEMPLATES === "true",
  useAdvancedFlowNodes: process.env.USE_ADVANCED_FLOW_NODES === "true",
  allowFlowScheduler: process.env.ALLOW_FLOW_SCHEDULER === "true",

  // Notifica-me Hub
  useNotificationHub: process.env.USE_NOTIFICATION_HUB === "true",
  useHubChannels: process.env.USE_HUB_CHANNELS === "true",
  useHubWebhooks: process.env.USE_HUB_WEBHOOKS === "true",
  allowHubConfiguration: process.env.ALLOW_HUB_CONFIGURATION === "true",

  // Mensagens e Comunicação
  useMessageRouting: process.env.USE_MESSAGE_ROUTING === "true",
  useChannelSelection: process.env.USE_CHANNEL_SELECTION === "true",
  useAdvancedMediaTypes: process.env.USE_ADVANCED_MEDIA_TYPES === "true",
  allowBulkMessages: process.env.ALLOW_BULK_MESSAGES === "true",

  // Interface e Usabilidade
  useKanbanView: process.env.USE_KANBAN_VIEW === "true",
  useAdvancedDashboard: process.env.USE_ADVANCED_DASHBOARD === "true",
  useCustomThemes: process.env.USE_CUSTOM_THEMES === "true",
  allowWidgetConfiguration: process.env.ALLOW_WIDGET_CONFIGURATION === "true",

  // APIs e Integrações
  useAPIv1: process.env.USE_API_V1 === "true",
  useGraphQL: process.env.USE_GRAPHQL === "true",
  allowWebhookConfiguration: process.env.ALLOW_WEBHOOK_CONFIGURATION === "true",
  useExternalIntegrations: process.env.USE_EXTERNAL_INTEGRATIONS === "true",

  // Performance e Monitoramento
  useAdvancedCaching: process.env.USE_ADVANCED_CACHING === "true",
  usePerformanceMonitoring: process.env.USE_PERFORMANCE_MONITORING === "true",
  useAdvancedLogging: process.env.USE_ADVANCED_LOGGING === "true",
  allowHealthChecks: process.env.ALLOW_HEALTH_CHECKS === "true",

  // Segurança e Autenticação
  useEnhancedSecurity: process.env.USE_ENHANCED_SECURITY === "true",
  useAPIKeyAuth: process.env.USE_API_KEY_AUTH === "true",
  useIPWhitelist: process.env.USE_IP_WHITELIST === "true",
  allowAdvancedPermissions: process.env.ALLOW_ADVANCED_PERMISSIONS === "true",

  // Analytics e Relatórios
  useAdvancedAnalytics: process.env.USE_ADVANCED_ANALYTICS === "true",
  useCustomReports: process.env.USE_CUSTOM_REPORTS === "true",
  allowReportBuilder: process.env.ALLOW_REPORT_BUILDER === "true",
  useExportIntegration: process.env.USE_EXPORT_INTEGRATION === "true",

  // Experimentais
  useBetaFeatures: process.env.USE_BETA_FEATURES === "true",
  useExperimentalAI: process.env.USE_EXPERIMENTAL_AI === "true",
  allowBetaTesting: process.env.ALLOW_BETA_TESTING === "true"
};

/**
 * Classe para gerenciamento de Feature Flags
 */
export class FeatureFlagsManager {
  private flags: FeatureFlags;
  private static instance: FeatureFlagsManager;

  private constructor() {
    this.flags = { ...defaultFeatureFlags };
    this.loadFromEnvironment();
    this.logFeatureFlags();
  }

  /**
   * Singleton pattern
   */
  static getInstance(): FeatureFlagsManager {
    if (!FeatureFlagsManager.instance) {
      FeatureFlagsManager.instance = new FeatureFlagsManager();
    }
    return FeatureFlagsManager.instance;
  }

  /**
   * Carrega flags do ambiente (pode incluir banco de dados no futuro)
   */
  private loadFromEnvironment(): void {
    try {
      // Tentar carregar de variável JSON
      const envFlags = process.env.FEATURE_FLAGS;
      if (envFlags) {
        const parsedFlags = JSON.parse(envFlags);
        this.flags = { ...this.flags, ...parsedFlags };
      }
    } catch (error) {
      console.warn('[FeatureFlags] Error loading flags from environment:', error);
    }
  }

  /**
   * Verifica se uma feature está ativa
   */
  isEnabled<K extends keyof FeatureFlags>(flag: K): boolean {
    return !!this.flags[flag];
  }

  /**
   * Ativa/desativa uma feature
   */
  setFlag<K extends keyof FeatureFlags>(flag: K, value: boolean): void {
    this.flags[flag] = value;
    console.log(`[FeatureFlags] ${flag} set to ${value}`);
  }

  /**
   * Obtém todas as flags
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Ativa/desativa múltiplas flags
   */
  setFlags(flags: Partial<FeatureFlags>): void {
    Object.entries(flags).forEach(([key, value]) => {
      this.setFlag(key as keyof FeatureFlags, Boolean(value));
    });
  }

  /**
   * Verifica se alguma de múltiplas flags está ativa
   */
  isAnyEnabled(flags: (keyof FeatureFlags)[]): boolean {
    return flags.some(flag => this.isEnabled(flag));
  }

  /**
   * Verifica se todas as flags estão ativas
   */
  areAllEnabled(flags: (keyof FeatureFlags)[]): boolean {
    return flags.every(flag => this.isEnabled(flag));
  }

  /**
   * Executa função se feature estiver ativa
   */
  async ifEnabled<K extends keyof FeatureFlags>(
    flag: K,
    callback: () => Promise<void> | void,
    elseCallback?: () => Promise<void> | void
  ): Promise<void> {
    if (this.isEnabled(flag)) {
      await callback();
    } else if (elseCallback) {
      await elseCallback();
    }
  }

  /**
   * Executa função se feature estiver desativada
   */
  async ifDisabled<K extends keyof FeatureFlags>(
    flag: K,
    callback: () => Promise<void> | void,
    elseCallback?: () => Promise<void> | void
  ): Promise<void> {
    return this.ifEnabled(flag, elseCallback, callback);
  }

  /**
   * Obtém valor de uma flag
   */
  getFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
    return this.flags[flag];
  }

  /**
   * Retorna apenas flags ativas
   */
  getActiveFlags(): Partial<FeatureFlags> {
    const active: Partial<FeatureFlags> = {};
    Object.entries(this.flags).forEach(([key, value]) => {
      if (value) {
        (active as any)[key] = value;
      }
    });
    return active;
  }

  /**
   * Log das flags ativas
   */
  private logFeatureFlags(): void {
    const activeFlags = this.getActiveFlags();
    console.log('[FeatureFlags] Active features:', Object.keys(activeFlags));
  }

  /**
   * Reload flags (útil para reload dinâmico)
   */
  reload(): void {
    this.loadFromEnvironment();
    this.logFeatureFlags();
  }
}

/**
 * Exportar instância singleton e funções de conveniência
 */
export const featureFlags = FeatureFlagsManager.getInstance();

/**
 * Funções de conveniência para uso direto
 */
export const isEnabled = (flag: keyof FeatureFlags): boolean => featureFlags.isEnabled(flag);
export const ifEnabled = (flag: keyof FeatureFlags, callback: () => void, elseCallback?: () => void) =>
  featureFlags.ifEnabled(flag, callback, elseCallback);
export const isDisabled = (flag: keyof FeatureFlags): boolean => !featureFlags.isEnabled(flag);

/**
 * Middleware para Express para verificar feature flags
 */
export const requireFeature = (flag: keyof FeatureFlags) => {
  return (req: any, res: any, next: any) => {
    if (featureFlags.isEnabled(flag)) {
      next();
    } else {
      res.status(403).json({
        error: 'Feature disabled',
        message: `The feature "${flag}" is currently disabled`,
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Decorator para verificar feature flags em controllers
 */
export const RequireFeature = (flag: keyof FeatureFlags) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!featureFlags.isEnabled(flag)) {
        throw new Error(`Feature "${flag}" is disabled`);
      }
      return method.apply(this, args);
    };

    return descriptor;
  };
};

export default featureFlags;