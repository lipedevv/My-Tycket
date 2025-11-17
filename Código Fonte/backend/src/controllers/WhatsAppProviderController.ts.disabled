import { Request, Response } from 'express';
import { Op } from 'sequelize';
import WhatsAppProviderService from '../services/WhatsAppProviderService';
import AppError from '../errors/AppError';
import { Provider } from '../models';
import { ShowWhatsAppProviderService } from '../services/ShowWhatsAppProviderService';
import { UpdateWhatsAppProviderService } from '../services/UpdateWhatsAppProviderService';
import { DeleteWhatsAppProviderService } from '../services/DeleteWhatsAppProviderService';

type ProviderType = 'baileys' | 'hub';

interface WhatsAppProviderData {
  name: string;
  type: ProviderType;
  isActive?: boolean;
  isDefault?: boolean;
  baileysConfig?: {
    sessionId?: string;
    deviceName?: string;
  };
  hubConfig?: {
    connectionId?: string;
    apiKey?: string;
    instanceId?: string;
    webhookUrl?: string;
    webhookSecret?: string;
  };
}

interface SendMessageData {
  number: string;
  body: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  quotedMsg?: string;
  ticketId?: number;
  providerType?: ProviderType;
  connectionId?: string;
}

interface MigrationData {
  fromType: ProviderType;
  fromName: string;
  toType: ProviderType;
  toName: string;
  dryRun?: boolean;
  percentage?: number;
}

class WhatsAppProviderController {
  private providerService: WhatsAppProviderService;

  constructor() {
    this.providerService = WhatsAppProviderService.getInstance();
  }

  /**
   * Lista todos os providers da empresa
   */
  index = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const { isActive } = req.query;

      let providers;
      if (isActive !== undefined) {
        providers = await Provider.scope(
          isActive === 'true' ? 'active' : 'all'
        ).findAll({
          where: { companyId },
          order: [
            ['isDefault', 'DESC'],
            ['priority', 'DESC'],
            ['createdAt', 'ASC']
          ]
        });
      } else {
        providers = await Provider.findAll({
          where: { companyId },
          order: [
            ['isDefault', 'DESC'],
            ['priority', 'DESC'],
            ['createdAt', 'ASC']
          ]
        });
      }

      res.status(200).json(providers);
    } catch (error) {
      throw new AppError('ERR_LIST_PROVIDERS', 500);
    }
  };

  /**
   * Obtém um provider específico
   */
  show = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { companyId } = req.user;

      const service = new ShowWhatsAppProviderService();
      const provider = await service.execute(providerId, companyId);

      res.status(200).json(provider);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_SHOW_PROVIDER', 500);
    }
  };

  /**
   * Cria um novo provider
   */
  store = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const providerData: WhatsAppProviderData = req.body;

      // Validação básica
      if (!providerData.name || !providerData.type) {
        throw new AppError('ERR_PROVIDER_NAME_OR_TYPE_REQUIRED', 400);
      }

      // Verificar se já existe provider com mesmo nome e tipo na empresa
      const existingProvider = await Provider.findOne({
        where: {
          name: providerData.name,
          type: providerData.type,
          companyId
        }
      });

      if (existingProvider) {
        throw new AppError('ERR_PROVIDER_ALREADY_EXISTS', 409);
      }

      // Validar configurações específicas por tipo
      if (providerData.type === 'baileys' && !providerData.baileysConfig?.sessionId) {
        throw new AppError('ERR_BAILEYS_SESSION_ID_REQUIRED', 400);
      }

      if (providerData.type === 'hub') {
        const { hubConfig } = providerData;
        if (!hubConfig?.connectionId || !hubConfig?.apiKey || !hubConfig?.instanceId) {
          throw new AppError('ERR_HUB_CONFIG_REQUIRED', 400);
        }
      }

      // Adicionar provider
      await this.providerService.addProvider(providerData, companyId);

      res.status(201).json({
        message: 'Provider created successfully',
        provider: {
          name: providerData.name,
          type: providerData.type,
          isActive: providerData.isActive || false,
          isDefault: providerData.isDefault || false
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_CREATE_PROVIDER', 500);
    }
  };

  /**
   * Atualiza um provider existente
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { companyId } = req.user;
      const providerData: Partial<WhatsAppProviderData> = req.body;

      const service = new UpdateWhatsAppProviderService();
      const updatedProvider = await service.execute(providerId, companyId, providerData);

      res.status(200).json({
        message: 'Provider updated successfully',
        provider: updatedProvider
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_UPDATE_PROVIDER', 500);
    }
  };

  /**
   * Remove um provider
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { companyId } = req.user;

      // Verificar se provider existe
      const provider = await Provider.findOne({
        where: { id: providerId, companyId }
      });

      if (!provider) {
        throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
      }

      // Verificar se não é o único provider ativo
      const activeProvidersCount = await Provider.scope('active').count({
        where: {
          companyId,
          id: { [Op.ne]: providerId }
        }
      });

      if (activeProvidersCount === 0) {
        throw new AppError('ERR_CANNOT_DELETE_ONLY_PROVIDER', 400);
      }

      const service = new DeleteWhatsAppProviderService();
      await service.execute(providerId, companyId);

      res.status(200).json({
        message: 'Provider deleted successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_DELETE_PROVIDER', 500);
    }
  };

  /**
   * Ativa/desativa um provider
   */
  toggleStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { companyId } = req.user;
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        throw new AppError('ERR_INVALID_ACTIVE_VALUE', 400);
      }

      // Verificar se provider existe
      const provider = await Provider.findOne({
        where: { id: providerId, companyId }
      });

      if (!provider) {
        throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
      }

      // Se estiver ativando, verificar se não vai ser o único ativo
      if (active && !provider.isActive) {
        const activeProvidersCount = await Provider.scope('active').count({
          where: {
            companyId,
            id: { [Op.ne]: providerId }
          }
        });

        if (activeProvidersCount === 0) {
          throw new AppError('ERR_CANNOT_ACTIVATE_SINGLE_PROVIDER', 400);
        }
      }

      await this.providerService.toggleProvider(provider.type, provider.name, companyId, active);

      res.status(200).json({
        message: `Provider ${active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_TOGGLE_PROVIDER_STATUS', 500);
    }
  };

  /**
   * Define provider como padrão
   */
  setDefault = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerId } = req.params;
      const { companyId } = req.user;

      // Verificar se provider existe
      const provider = await Provider.findOne({
        where: { id: providerId, companyId }
      });

      if (!provider) {
        throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
      }

      if (!provider.isActive) {
        throw new AppError('ERR_PROVIDER_NOT_ACTIVE', 400);
      }

      await this.providerService.setDefaultProvider(provider.type, provider.name, companyId);

      res.status(200).json({
        message: 'Default provider set successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_SET_DEFAULT_PROVIDER', 500);
    }
  };

  /**
   * Envia mensagem via provider específico ou padrão
   */
  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const messageData: SendMessageData = req.body;

      // Validação básica
      if (!messageData.number || !messageData.body) {
        throw new AppError('ERR_NUMBER_AND_BODY_REQUIRED', 400);
      }

      // Adicionar companyId aos dados
      const message = {
        ...messageData,
        companyId
      };

      const result = await this.providerService.sendMessage(message);

      res.status(200).json({
        message: 'Message sent successfully',
        result
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_SEND_MESSAGE', 500);
    }
  };

  /**
   * Envia mídia via provider específico ou padrão
   */
  sendMedia = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const messageData: SendMessageData = req.body;

      // Validação básica
      if (!messageData.number || !messageData.mediaUrl || !messageData.mediaType) {
        throw new AppError('ERR_NUMBER_MEDIA_URL_TYPE_REQUIRED', 400);
      }

      // Adicionar companyId aos dados
      const message = {
        ...messageData,
        companyId
      };

      const result = await this.providerService.sendMedia(message);

      res.status(200).json({
        message: 'Media sent successfully',
        result
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_SEND_MEDIA', 500);
    }
  };

  /**
   * Migra entre providers
   */
  migrate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const migrationData: MigrationData = req.body;

      // Validação básica
      if (!migrationData.fromType || !migrationData.fromName ||
          !migrationData.toType || !migrationData.toName) {
        throw new AppError('ERR_MIGRATION_DATA_REQUIRED', 400);
      }

      // Verificar se providers existem
      const fromProvider = await Provider.findOne({
        where: {
          type: migrationData.fromType,
          name: migrationData.fromName,
          companyId
        }
      });

      const toProvider = await Provider.findOne({
        where: {
          type: migrationData.toType,
          name: migrationData.toName,
          companyId
        }
      });

      if (!fromProvider || !toProvider) {
        throw new AppError('ERR_MIGRATION_PROVIDERS_NOT_FOUND', 404);
      }

      await this.providerService.migrateProvider(
        migrationData.fromType,
        migrationData.fromName,
        migrationData.toType,
        migrationData.toName,
        companyId,
        {
          dryRun: migrationData.dryRun || false,
          percentage: migrationData.percentage || 100
        }
      );

      res.status(200).json({
        message: 'Provider migration completed successfully',
        migration: {
          from: `${migrationData.fromType}-${migrationData.fromName}`,
          to: `${migrationData.toType}-${migrationData.toName}`,
          dryRun: migrationData.dryRun || false,
          percentage: migrationData.percentage || 100
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_MIGRATE_PROVIDERS', 500);
    }
  };

  /**
   * Obtém estatísticas dos providers
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;

      const stats = await this.providerService.getGeneralStats(companyId);

      res.status(200).json(stats);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_GET_PROVIDER_STATS', 500);
    }
  };

  /**
   * Obtém status das conexões
   */
  getConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;

      const connections = await this.providerService.getAllConnections(companyId);

      res.status(200).json(connections);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_GET_CONNECTIONS', 500);
    }
  };

  /**
   * Testa conexão de um provider
   */
  testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const { providerId } = req.params;

      // Verificar se provider existe
      const provider = await Provider.findOne({
        where: { id: providerId, companyId }
      });

      if (!provider) {
        throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
      }

      const healthCheck = await this.providerService.healthCheck(companyId);
      const providerStatus = healthCheck[`${provider.type}_${provider.name}`];

      res.status(200).json({
        providerId,
        name: provider.name,
        type: provider.type,
        status: providerStatus ? 'connected' : 'disconnected',
        lastChecked: new Date()
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_TEST_CONNECTION', 500);
    }
  };

  /**
   * Processa webhook
   */
  webhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { providerType } = req.params;
      const { companyId } = req.user;

      let signature = '';
      let secret = '';

      // Se for Hub, obter assinatura e segredo
      if (providerType === 'hub') {
        signature = req.headers['x-hub-signature-256'] as string;

        // Obter secret do provider (implementar busca no banco)
        const provider = await Provider.scope('active').findOne({
          where: {
            type: 'hub',
            companyId
          },
          order: [['isDefault', 'DESC']]
        });

        if (provider?.webhookSecret) {
          secret = provider.webhookSecret;
        }
      }

      await this.providerService.processWebhook(
        providerType as ProviderType,
        companyId,
        req.body,
        signature,
        secret
      );

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Webhook processing error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  };

  /**
   * Gera QR Code para Baileys
   */
  generateQRCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const { providerId } = req.params;

      // Verificar se provider existe e é do tipo Baileys
      const provider = await Provider.findOne({
        where: {
          id: providerId,
          type: 'baileys',
          companyId
        }
      });

      if (!provider) {
        throw new AppError('ERR_BAILEYS_PROVIDER_NOT_FOUND', 404);
      }

      // Gerar QR Code via provider manager
      const manager = this.providerService.getProviderManager(companyId);
      const baileysProvider = manager.getProvider('baileys', provider.name);

      if (!baileysProvider || !baileysProvider.isConnected()) {
        throw new AppError('ERR_PROVIDER_NOT_CONNECTED', 400);
      }

      const qrCode = await baileysProvider.generateQRCode();

      res.status(200).json({
        qrcode: qrCode,
        providerId,
        providerName: provider.name,
        timestamp: new Date()
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_GENERATE_QRCODE', 500);
    }
  };

  /**
   * Obtém informações do provider
   */
  getInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const { providerId } = req.params;

      const manager = this.providerService.getProviderManager(companyId);
      const providerInfo = manager.getAllStats();

      res.status(200).json({
        stats: providerInfo,
        timestamp: new Date()
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_GET_PROVIDER_INFO', 500);
    }
  };

  /**
   * Desconecta provider
   */
  disconnect = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.user;
      const { providerId } = req.params;

      // Verificar se provider existe
      const provider = await Provider.findOne({
        where: { id: providerId, companyId }
      });

      if (!provider) {
        throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
      }

      // Desconectar via provider manager
      const manager = this.providerService.getProviderManager(companyId);
      const providerInstance = manager.getProvider(provider.type, provider.name);

      if (providerInstance) {
        await providerInstance.disconnect();
      }

      // Atualizar status no banco
      await provider.update({
        status: 'disconnected',
        lastConnectionAt: new Date()
      });

      res.status(200).json({
        message: 'Provider disconnected successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('ERR_DISCONNECT_PROVIDER', 500);
    }
  };
}

export default new WhatsAppProviderController();