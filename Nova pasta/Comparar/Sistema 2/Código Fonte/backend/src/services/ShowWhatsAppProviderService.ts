import AppError from '../../errors/AppError';
import { Provider } from '../../models';
import { User } from '../../models';

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
  // Não incluir dados sensíveis como apiKey na resposta
}

class ShowWhatsAppProviderService {
  async execute(providerId: number | string, companyId: number): Promise<Response> {
    try {
      const provider = await Provider.findOne({
        where: {
          id: providerId,
          companyId
        },
        attributes: [
          'id',
          'name',
          'type',
          'isActive',
          'isDefault',
          'companyId',
          'sessionId',
          'deviceName',
          'connectionId',
          'instanceId',
          'webhookUrl',
          // Não incluir webhookSecret e apiKey na resposta por segurança
          'lastConnectionAt',
          'messagesSent',
          'messagesReceived',
          'status',
          'priority',
          'settings',
          'createdAt',
          'updatedAt'
        ]
      });

      if (!provider) {
        throw new AppError('ERR_PROVIDER_NOT_FOUND', 404);
      }

      // Remover campos sensíveis antes de retornar
      const providerResponse: Response = {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isActive: provider.isActive,
        isDefault: provider.isDefault,
        companyId: provider.companyId,
        sessionId: provider.sessionId,
        deviceName: provider.deviceName,
        connectionId: provider.connectionId,
        instanceId: provider.instanceId,
        webhookUrl: provider.webhookUrl,
        // webhookSecret e apiKey não incluídos por segurança
        lastConnectionAt: provider.lastConnectionAt,
        messagesSent: provider.messagesSent,
        messagesReceived: provider.messagesReceived,
        status: provider.status,
        priority: provider.priority,
        settings: provider.settings,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt
      };

      return providerResponse;
    } catch (error) {
      console.error('Error showing WhatsApp provider:', error);
      throw new AppError('ERR_SHOW_PROVIDER', 500);
    }
  }
}

export default ShowWhatsAppProviderService;