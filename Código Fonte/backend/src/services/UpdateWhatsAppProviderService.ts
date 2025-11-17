import AppError from '../../errors/AppError';
import { Provider } from '../../models';
import { sequelize } from 'sequelize';

interface ProviderData {
  name?: string;
  isActive?: boolean;
  isDefault?: boolean;
  sessionId?: string;
  deviceName?: string;
  connectionId?: string;
  apiKey?: string;
  instanceId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  priority?: number;
  settings?: object;
}

interface Response {
  id: number;
  name: string;
  type: 'baileys' | 'hub';
  isActive: boolean;
  isDefault: boolean;
  companyId: number;
  sessionId?: string;
  deviceName?: string;
  connectionId?: string;
  instanceId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnectionAt?: Date;
  messagesSent: number;
  messagesReceived: number;
  priority: number;
  settings?: object;
  createdAt: Date;
  updatedAt: Date;
}

class UpdateWhatsAppProviderService {
  async execute(providerId: number | string, companyId: number, providerData: ProviderData): Promise<Response> {
    try {
      const transaction = await sequelize.transaction();

      try {
        // Buscar provider existente
        const existingProvider = await Provider.findOne({
          where: {
            id: providerId,
            companyId
          },
          transaction
        });

        if (!existingProvider) {
          await transaction.rollback();
          throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
        }

        // Se estiver definindo como padrão, remover default dos outros providers
        if (providerData.isDefault && providerData.isDefault === true) {
          await Provider.update(
            { isDefault: false },
            {
              where: {
                companyId,
                id: { [sequelize.Sequelize.Op.ne]: providerId },
                isDefault: true
              },
              transaction
            }
          );
        }

        // Validar configurações específicas por tipo
        if (existingProvider.type === 'baileys') {
          if (providerData.sessionId && !providerData.sessionId.trim()) {
            await transaction.rollback();
            throw new AppError('ERR_BAILEYS_SESSION_ID_REQUIRED', 400);
          }
        }

        if (existingProvider.type === 'hub') {
          const requiredHubFields = ['connectionId', 'apiKey', 'instanceId'];
          for (const field of requiredHubFields) {
            if (providerData[field as keyof ProviderData] &&
                !String(providerData[field as keyof ProviderData]).trim()) {
              await transaction.rollback();
              throw new AppError(`ERR_HUB_${field.toUpperCase()}_REQUIRED`, 400);
            }
          }
        }

        // Atualizar provider
        const [updatedProvider] = await Provider.update(
          providerData,
          {
            where: {
              id: providerId,
              companyId
            },
            returning: true,
            transaction
          }
        );

        await transaction.commit();

        // Montar resposta (sem dados sensíveis)
        const response: Response = {
          id: updatedProvider.id,
          name: updatedProvider.name,
          type: updatedProvider.type,
          isActive: updatedProvider.isActive,
          isDefault: updatedProvider.isDefault,
          companyId: updatedProvider.companyId,
          sessionId: updatedProvider.sessionId,
          deviceName: updatedProvider.deviceName,
          connectionId: updatedProvider.connectionId,
          instanceId: updatedProvider.instanceId,
          webhookUrl: updatedProvider.webhookUrl,
          // Não incluir webhookSecret e apiKey na resposta
          status: updatedProvider.status,
          lastConnectionAt: updatedProvider.lastConnectionAt,
          messagesSent: updatedProvider.messagesSent,
          messagesReceived: updatedProvider.messagesReceived,
          priority: updatedProvider.priority,
          settings: updatedProvider.settings,
          createdAt: updatedProvider.createdAt,
          updatedAt: updatedProvider.updatedAt
        };

        return response;

      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error updating WhatsApp provider:', error);
      throw new AppError('ERR_UPDATE_PROVIDER', 500);
    }
  }
}

export default UpdateWhatsAppProviderService;