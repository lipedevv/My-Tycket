import { Op } from 'sequelize';
import FeatureFlag from '../models/FeatureFlag';
import FeatureFlagUsage from '../models/FeatureFlagUsage';
import { logger } from '../utils/logger';
import { getIO } from '../libs/socket';

interface CheckFlagOptions {
  companyId?: string;
  userId?: string;
  context?: Record<string, any>;
  forceCheck?: boolean;
}

interface CreateFlagData {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  targetCompanies?: string[];
  targetUsers?: string[];
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  createdBy: string;
}

interface UpdateFlagData {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  targetCompanies?: string[];
  targetUsers?: string[];
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

class FeatureFlagService {
  private cache: Map<string, { value: boolean; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor() {
    // Limpar cache periodicamente
    setInterval(() => {
      this.cleanCache();
    }, 60 * 1000); // 1 minuto
  }

  // Feature Flag Operations
  async create(data: CreateFlagData): Promise<FeatureFlag> {
    const {
      key,
      name,
      description,
      isEnabled = false,
      rolloutPercentage = 0,
      targetCompanies = [],
      targetUsers = [],
      conditions = {},
      metadata = {},
      createdBy
    } = data;

    // Validar key único
    const existingFlag = await FeatureFlag.findOne({
      where: { key }
    });

    if (existingFlag) {
      throw new Error('Já existe uma feature flag com esta key');
    }

    // Validar rollout percentage
    if (rolloutPercentage < 0 || rolloutPercentage > 100) {
      throw new Error('Rollout percentage deve estar entre 0 e 100');
    }

    const flag = await FeatureFlag.create({
      key,
      name,
      description,
      isEnabled,
      rolloutPercentage,
      targetCompanies,
      targetUsers,
      conditions,
      metadata,
      createdBy
    });

    // Limpar cache
    this.clearCache();

    // Notificar criação
    this.notifyFlagChange('flag_created', flag);

    logger.info(`Feature flag criada: ${key} (${name})`);
    return flag;
  }

  async findById(id: string): Promise<FeatureFlag> {
    const flag = await FeatureFlag.findByPk(id);

    if (!flag) {
      throw new Error('Feature flag não encontrada');
    }

    return flag;
  }

  async findByKey(key: string): Promise<FeatureFlag | null> {
    return await FeatureFlag.findOne({
      where: { key, isActive: true }
    });
  }

  async findAll(options?: {
    isEnabled?: boolean;
    isActive?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ flags: FeatureFlag[]; total: number; page: number; limit: number }> {
    const where: any = {};

    if (options?.isEnabled !== undefined) {
      where.isEnabled = options.isEnabled;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.category) {
      where['metadata.category'] = options.category;
    }

    if (options?.search) {
      where[Op.or] = [
        { key: { [Op.iLike]: `%${options.search}%` } },
        { name: { [Op.iLike]: `%${options.search}%` } },
        { description: { [Op.iLike]: `%${options.search}%` } }
      ];
    }

    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await FeatureFlag.findAndCountAll({
      where,
      limit,
      offset,
      order: [['key', 'ASC']]
    });

    return {
      flags: rows,
      total: count,
      page,
      limit
    };
  }

  async update(id: string, data: UpdateFlagData): Promise<FeatureFlag> {
    const flag = await this.findById(id);

    // Validar rollout percentage
    if (data.rolloutPercentage !== undefined && (data.rolloutPercentage < 0 || data.rolloutPercentage > 100)) {
      throw new Error('Rollout percentage deve estar entre 0 e 100');
    }

    await flag.update(data);

    // Limpar cache
    this.clearCache();

    // Notificar atualização
    this.notifyFlagChange('flag_updated', flag);

    logger.info(`Feature flag atualizada: ${flag.key}`);
    return flag;
  }

  async delete(id: string): Promise<void> {
    const flag = await this.findById(id);

    await flag.destroy();

    // Limpar cache
    this.clearCache();

    // Notificar deleção
    this.notifyFlagChange('flag_deleted', flag);

    logger.info(`Feature flag excluída: ${flag.key}`);
  }

  async archive(id: string): Promise<FeatureFlag> {
    const flag = await this.findById(id);

    await flag.update({ isActive: false });

    // Limpar cache
    this.clearCache();

    // Notificar arquivamento
    this.notifyFlagChange('flag_archived', flag);

    logger.info(`Feature flag arquivada: ${flag.key}`);
    return flag;
  }

  async enable(id: string): Promise<FeatureFlag> {
    return await this.update(id, { isEnabled: true });
  }

  async disable(id: string): Promise<FeatureFlag> {
    return await this.update(id, { isEnabled: false });
  }

  // Feature Flag Checking
  async isEnabled(key: string, options: CheckFlagOptions = {}): Promise<boolean> {
    const cacheKey = this.getCacheKey(key, options);

    // Verificar cache
    if (!options.forceCheck) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.recordUsage(key, options, cached.value);
        return cached.value;
      }
    }

    try {
      // Buscar flag no banco
      const flag = await this.findByKey(key);

      if (!flag || !flag.isActive || !flag.isEnabled) {
        this.setCache(cacheKey, false);
        this.recordUsage(key, options, false);
        return false;
      }

      // Verificar condições
      let isEnabled = this.evaluateConditions(flag, options);

      // Aplicar rollout percentage se não for target explícito
      if (isEnabled && !this.isExplicitTarget(flag, options)) {
        isEnabled = this.evaluateRollout(flag);
      }

      // Salvar no cache
      this.setCache(cacheKey, isEnabled);

      // Registrar uso
      this.recordUsage(key, options, isEnabled);

      return isEnabled;
    } catch (error) {
      logger.error(`Erro ao verificar feature flag ${key}:`, error);
      // Em caso de erro, retorna false (safe default)
      return false;
    }
  }

  async checkMultiple(keys: string[], options: CheckFlagOptions = {}): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Buscar todas as flags de uma vez
    const flags = await FeatureFlag.findAll({
      where: {
        key: keys,
        isActive: true
      }
    });

    const flagsMap = new Map(flags.map(flag => [flag.key, flag]));

    for (const key of keys) {
      const flag = flagsMap.get(key);

      if (!flag || !flag.isActive || !flag.isEnabled) {
        results[key] = false;
        continue;
      }

      // Verificar condições
      let isEnabled = this.evaluateConditions(flag, options);

      // Aplicar rollout percentage se não for target explícito
      if (isEnabled && !this.isExplicitTarget(flag, options)) {
        isEnabled = this.evaluateRollout(flag);
      }

      results[key] = isEnabled;
    }

    return results;
  }

  async getUsageStats(key: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const where: any = { featureFlagKey: key };

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) {
        where.createdAt[Op.gte] = options.startDate;
      }
      if (options?.endDate) {
        where.createdAt[Op.lte] = options.endDate;
      }
    }

    const usage = await FeatureFlagUsage.findAll({
      where,
      attributes: [
        'wasEnabled',
        [FeatureFlagUsage.sequelize.fn('COUNT', FeatureFlagUsage.sequelize.col('id')), 'count']
      ],
      group: ['wasEnabled'],
      raw: true
    });

    const totalChecks = usage.reduce((sum, item) => sum + parseInt(item.count), 0);
    const enabledChecks = usage.find(item => item.wasEnabled)?.count || 0;

    return {
      totalChecks,
      enabledChecks,
      disabledChecks: totalChecks - enabledChecks,
      enableRate: totalChecks > 0 ? Math.round((enabledChecks / totalChecks) * 100) : 0,
      usage: usage.map(item => ({
        enabled: item.wasEnabled,
        count: parseInt(item.count),
        percentage: totalChecks > 0 ? Math.round((parseInt(item.count) / totalChecks) * 100) : 0
      }))
    };
  }

  // Helper Methods
  private evaluateConditions(flag: FeatureFlag, options: CheckFlagOptions): boolean {
    const { companyId, userId, context = {} } = options;

    // Verificar target companies
    if (flag.targetCompanies && flag.targetCompanies.length > 0) {
      if (!companyId || !flag.targetCompanies.includes(companyId)) {
        return false;
      }
    }

    // Verificar target users
    if (flag.targetUsers && flag.targetUsers.length > 0) {
      if (!userId || !flag.targetUsers.includes(userId)) {
        return false;
      }
    }

    // Verificar condições customizadas
    if (flag.conditions && Object.keys(flag.conditions).length > 0) {
      return this.evaluateCustomConditions(flag.conditions, context);
    }

    return true;
  }

  private evaluateCustomConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
    // Implementar lógica de condições customizadas
    for (const [key, condition] of Object.entries(conditions)) {
      const contextValue = context[key];

      if (!this.evaluateCondition(contextValue, condition)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(value: any, condition: any): boolean {
    if (typeof condition === 'string') {
      return value === condition;
    }

    if (typeof condition === 'object' && condition !== null) {
      const { operator, value: expectedValue } = condition;

      switch (operator) {
        case 'equals':
          return value === expectedValue;
        case 'not_equals':
          return value !== expectedValue;
        case 'in':
          return Array.isArray(expectedValue) && expectedValue.includes(value);
        case 'not_in':
          return Array.isArray(expectedValue) && !expectedValue.includes(value);
        case 'gt':
          return Number(value) > Number(expectedValue);
        case 'gte':
          return Number(value) >= Number(expectedValue);
        case 'lt':
          return Number(value) < Number(expectedValue);
        case 'lte':
          return Number(value) <= Number(expectedValue);
        case 'contains':
          return String(value).includes(String(expectedValue));
        case 'starts_with':
          return String(value).startsWith(String(expectedValue));
        case 'ends_with':
          return String(value).endsWith(String(expectedValue));
        case 'regex':
          return new RegExp(expectedValue).test(String(value));
        default:
          return false;
      }
    }

    return false;
  }

  private isExplicitTarget(flag: FeatureFlag, options: CheckFlagOptions): boolean {
    const { companyId, userId } = options;

    const inTargetCompanies = flag.targetCompanies &&
                           companyId &&
                           flag.targetCompanies.includes(companyId);

    const inTargetUsers = flag.targetUsers &&
                        userId &&
                        flag.targetUsers.includes(userId);

    return inTargetCompanies || inTargetUsers;
  }

  private evaluateRollout(flag: FeatureFlag): boolean {
    if (flag.rolloutPercentage >= 100) {
      return true;
    }

    if (flag.rolloutPercentage <= 0) {
      return false;
    }

    // Usar hash consistente baseado na key
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(flag.key + Date.now()).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const percentage = (hashInt % 100) + 1;

    return percentage <= flag.rolloutPercentage;
  }

  private getCacheKey(key: string, options: CheckFlagOptions): string {
    const { companyId, userId } = options;
    return `${key}:${companyId || '*'}:${userId || '*'}`;
  }

  private setCache(key: string, value: boolean): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
  }

  private cleanCache(): void {
    const now = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private async recordUsage(key: string, options: CheckFlagOptions, wasEnabled: boolean): Promise<void> {
    try {
      await FeatureFlagUsage.create({
        featureFlagKey: key,
        companyId: options.companyId,
        userId: options.userId,
        wasEnabled,
        context: options.context
      });
    } catch (error) {
      logger.error('Erro ao registrar uso de feature flag:', error);
    }
  }

  private notifyFlagChange(event: string, flag: FeatureFlag): void {
    try {
      const io = getIO();
      io.emit('feature_flag_change', {
        event,
        flag: {
          id: flag.id,
          key: flag.key,
          name: flag.name,
          isEnabled: flag.isEnabled,
          rolloutPercentage: flag.rolloutPercentage,
          isActive: flag.isActive
        }
      });
    } catch (error) {
      logger.error('Erro ao notificar mudança de feature flag:', error);
    }
  }
}

// Feature flags padrão
export const FEATURE_FLAGS = {
  WHATSAPP_DUAL_PROVIDER: 'WHATSAPP_DUAL_PROVIDER',
  FLOWBUILDER_ENABLED: 'FLOWBUILDER_ENABLED',
  HUB_PROVIDER_ENABLED: 'HUB_PROVIDER_ENABLED',
  MULTI_TENANT: 'MULTI_TENANT',
  ADVANCED_ANALYTICS: 'ADVANCED_ANALYTICS',
  CUSTOM_AI_INTEGRATION: 'CUSTOM_AI_INTEGRATION',
  BULK_MESSAGING: 'BULK_MESSAGING',
  WEBHOOK_ENHANCED: 'WEBHOOK_ENHANCED'
} as const;

export default new FeatureFlagService();