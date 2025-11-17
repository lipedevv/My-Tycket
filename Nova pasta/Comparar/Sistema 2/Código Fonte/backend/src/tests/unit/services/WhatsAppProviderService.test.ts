import WhatsAppProviderService from '../../../../services/WhatsAppProviderService';
import WhatsAppProvider from '../../../../models/WhatsAppProvider';
import { WhatsAppProviderManager } from '../../../../providers/WhatsAppProviderManager';
import AppError from '../../../../errors/AppError';
import { logger } from '../../../../utils/logger';

// Mocks
jest.mock('../../../../models/WhatsAppProvider');
jest.mock('../../../../providers/WhatsAppProviderManager');
jest.mock('../../../../utils/logger');
jest.mock('../../../../libs/socket', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn().mockReturnValue({
      emit: jest.fn()
    })
  }))
}));

const mockWhatsAppProvider = WhatsAppProvider as jest.Mocked<typeof WhatsAppProvider>;
const mockProviderManager = WhatsAppProviderManager as jest.MockedClass<typeof WhatsAppProviderManager>;

describe('WhatsAppProviderService', () => {
  let service: WhatsAppProviderService;
  const mockCompanyId = 'company-uuid';
  const mockProviderId = 'provider-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
    service = WhatsAppProviderService;
  });

  describe('create', () => {
    const createData = {
      name: 'Test Provider',
      provider: 'baileys' as const,
      companyId: mockCompanyId,
      config: { sessionId: 'test-session' }
    };

    it('should create a provider successfully', async () => {
      const mockProvider = {
        id: mockProviderId,
        name: createData.name,
        provider: createData.provider,
        companyId: createData.companyId,
        save: jest.fn().mockResolvedValue(true)
      };

      mockWhatsAppProvider.findOne.mockResolvedValue(null);
      mockWhatsAppProvider.create.mockResolvedValue(mockProvider);

      const result = await service.create(createData);

      expect(mockWhatsAppProvider.findOne).toHaveBeenCalledWith({
        where: { name: createData.name, companyId: createData.companyId }
      });
      expect(mockWhatsAppProvider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createData.name,
          provider: createData.provider,
          companyId: createData.companyId,
          config: expect.objectContaining({
            webhookSecret: expect.any(String)
          })
        })
      );
      expect(result).toEqual(mockProvider);
    });

    it('should throw error if provider name already exists', async () => {
      mockWhatsAppProvider.findOne.mockResolvedValue({} as any);

      await expect(service.create(createData)).rejects.toThrow(
        'Já existe um provider com este nome para esta empresa'
      );

      expect(mockWhatsAppProvider.findOne).toHaveBeenCalledWith({
        where: { name: createData.name, companyId: createData.companyId }
      });
      expect(mockWhatsAppProvider.create).not.toHaveBeenCalled();
    });

    it('should throw error for Hub provider without required config', async () => {
      const hubData = {
        ...createData,
        provider: 'hub' as const,
        config: {}
      };

      mockWhatsAppProvider.findOne.mockResolvedValue(null);

      await expect(service.create(hubData)).rejects.toThrow(
        'Provider Hub requer apiKey e instanceId na configuração'
      );
    });
  });

  describe('findById', () => {
    it('should find provider by id and company', async () => {
      const mockProvider = {
        id: mockProviderId,
        name: 'Test Provider',
        companyId: mockCompanyId
      };

      mockWhatsAppProvider.findOne.mockResolvedValue(mockProvider as any);

      const result = await service.findById(mockProviderId, mockCompanyId);

      expect(mockWhatsAppProvider.findOne).toHaveBeenCalledWith({
        where: { id: mockProviderId, companyId: mockCompanyId }
      });
      expect(result).toEqual(mockProvider);
    });

    it('should throw error if provider not found', async () => {
      mockWhatsAppProvider.findOne.mockResolvedValue(null);

      await expect(service.findById(mockProviderId, mockCompanyId)).rejects.toThrow(
        'Provider não encontrado'
      );

      expect(mockWhatsAppProvider.findOne).toHaveBeenCalledWith({
        where: { id: mockProviderId, companyId: mockCompanyId }
      });
    });
  });

  describe('findByCompany', () => {
    it('should find providers by company', async () => {
      const mockProviders = [
        { id: '1', name: 'Provider 1', config: { secret: 'hidden' } },
        { id: '2', name: 'Provider 2', config: { apiKey: 'hidden' } }
      ];

      mockWhatsAppProvider.findAll.mockResolvedValue(mockProviders as any);

      const result = await service.findByCompany(mockCompanyId);

      expect(mockWhatsAppProvider.findAll).toHaveBeenCalledWith({
        where: {},
        order: [['isDefault', 'DESC'], ['name', 'ASC']]
      });
      expect(result).toEqual(mockProviders);
    });

    it('should sanitize config by default', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'Provider 1',
          config: { apiKey: 'secret123', webhookSecret: 'secret456' }
        }
      ];

      mockWhatsAppProvider.findAll.mockResolvedValue(mockProviders as any);

      const result = await service.findByCompany(mockCompanyId);

      expect(result[0].config).toEqual({
        apiKey: '***',
        webhookSecret: '***'
      });
    });

    it('should include config when requested', async () => {
      const mockProviders = [
        {
          id: '1',
          name: 'Provider 1',
          config: { apiKey: 'secret123', webhookSecret: 'secret456' }
        }
      ];

      mockWhatsAppProvider.findAll.mockResolvedValue(mockProviders as any);

      const result = await service.findByCompany(mockCompanyId, { includeConfig: true });

      expect(result[0].config).toEqual({
        apiKey: 'secret123',
        webhookSecret: 'secret456'
      });
    });
  });

  describe('connect', () => {
    const mockProvider = {
      id: mockProviderId,
      name: 'Test Provider',
      status: 'disconnected',
      update: jest.fn()
    };

    beforeEach(() => {
      (service as any).findById = jest.fn().mockResolvedValue(mockProvider);
    });

    it('should connect Baileys provider successfully', async () => {
      mockProviderManager.connectBaileys.mockResolvedValue({
        success: true
      });

      const result = await service.connect(mockProviderId, mockCompanyId);

      expect(mockProvider.update).toHaveBeenCalledWith({
        status: 'connecting',
        statusReason: null,
        lastStatusUpdate: expect.any(Date)
      });
      expect(mockProviderManager.connectBaileys).toHaveBeenCalledWith(mockProviderId);
      expect(mockProvider.update).toHaveBeenCalledWith({
        status: 'connected',
        statusReason: null,
        qrCode: null,
        lastStatusUpdate: expect.any(Date)
      });
      expect(result).toEqual(mockProvider);
    });

    it('should connect Hub provider successfully', async () => {
      mockProvider.provider = 'hub';
      mockProviderManager.connectHub.mockResolvedValue({
        success: true
      });

      await service.connect(mockProviderId, mockCompanyId);

      expect(mockProviderManager.connectHub).toHaveBeenCalledWith(mockProviderId);
    });

    it('should handle connection failure', async () => {
      mockProviderManager.connectBaileys.mockResolvedValue({
        success: false,
        error: 'Connection failed'
      });

      await expect(service.connect(mockProviderId, mockCompanyId)).rejects.toThrow(
        'Connection failed'
      );

      expect(mockProvider.update).toHaveBeenCalledWith({
        status: 'error',
        statusReason: 'Connection failed',
        lastStatusUpdate: expect.any(Date)
      });
    });

    it('should throw error if already connected', async () => {
      mockProvider.status = 'connected';

      await expect(service.connect(mockProviderId, mockCompanyId)).rejects.toThrow(
        'Provider já está conectado'
      );
    });
  });

  describe('sendMessage', () => {
    const mockProvider = {
      id: mockProviderId,
      name: 'Test Provider',
      status: 'connected',
      provider: 'baileys'
    };

    const messageData = {
      number: '+5511999998888',
      body: 'Test message',
      messageType: 'text' as const
    };

    beforeEach(() => {
      (service as any).findById = jest.fn().mockResolvedValue(mockProvider);
    });

    it('should send message via Baileys provider', async () => {
      const mockResult = { messageId: 'msg-123' };
      mockProviderManager.sendBaileysMessage.mockResolvedValue(mockResult);

      const result = await service.sendMessage(mockProviderId, mockCompanyId, messageData);

      expect(mockProviderManager.sendBaileysMessage).toHaveBeenCalledWith(
        mockProviderId,
        messageData
      );
      expect(result).toEqual(mockResult);
    });

    it('should send message via Hub provider', async () => {
      mockProvider.provider = 'hub';
      const mockResult = { messageId: 'msg-456' };
      mockProviderManager.sendHubMessage.mockResolvedValue(mockResult);

      const result = await service.sendMessage(mockProviderId, mockCompanyId, messageData);

      expect(mockProviderManager.sendHubMessage).toHaveBeenCalledWith(
        mockProviderId,
        messageData
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw error if provider not connected', async () => {
      mockProvider.status = 'disconnected';

      await expect(service.sendMessage(mockProviderId, mockCompanyId, messageData)).rejects.toThrow(
        'Provider não está conectado'
      );
    });
  });

  describe('getCompanyStats', () => {
    it('should return company provider statistics', async () => {
      const mockProviders = [
        { provider: 'baileys', status: 'connected' },
        { provider: 'hub', status: 'disconnected' },
        { provider: 'baileys', status: 'connected' }
      ];

      mockWhatsAppProvider.findAll.mockResolvedValue(mockProviders as any);

      const result = await service.getCompanyStats(mockCompanyId);

      expect(mockWhatsAppProvider.findAll).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        attributes: ['provider', 'status']
      });
      expect(result).toEqual({
        total: 3,
        connected: 2,
        disconnected: 1,
        connecting: 0,
        error: 0,
        byProvider: {
          baileys: { total: 2, connected: 2, disconnected: 0 },
          hub: { total: 1, connected: 0, disconnected: 1 }
        }
      });
    });
  });
});