import FlowBuilderService from '../../../../services/FlowBuilderService';
import Flow from '../../../../models/Flow';
import FlowExecution from '../../../../models/FlowExecution';
import Ticket from '../../../../models/Ticket';
import Contact from '../../../../models/Contact';
import { FlowEngine } from '../../../../services/FlowEngine/FlowEngine';
import AppError from '../../../../errors/AppError';

// Mocks
jest.mock('../../../../models/Flow');
jest.mock('../../../../models/FlowExecution');
jest.mock('../../../../models/Ticket');
jest.mock('../../../../models/Contact');
jest.mock('../../../../services/FlowEngine/FlowEngine');
jest.mock('../../../../utils/logger');
jest.mock('../../../../libs/socket', () => ({
  getIO: jest.fn(() => ({
    to: jest.fn().mockReturnValue({
      emit: jest.fn()
    })
  }))
}));

const mockFlow = Flow as jest.Mocked<typeof Flow>;
const mockFlowExecution = FlowExecution as jest.Mocked<typeof FlowExecution>;
const mockTicket = Ticket as jest.Mocked<typeof Ticket>;
const mockContact = Contact as jest.Mocked<typeof Contact>;
const MockFlowEngine = FlowEngine as jest.MockedClass<typeof FlowEngine>;

describe('FlowBuilderService', () => {
  let service: FlowBuilderService;
  const mockCompanyId = 'company-uuid';
  const mockFlowId = 'flow-uuid';
  const mockUserId = 'user-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
    service = FlowBuilderService;
  });

  describe('create', () => {
    const createData = {
      name: 'Test Flow',
      description: 'Test Description',
      companyId: mockCompanyId,
      nodes: [{ id: 'start-1', type: 'start' }],
      edges: [],
      category: 'welcome' as const,
      createdBy: mockUserId
    };

    it('should create a flow successfully', async () => {
      const mockNewFlow = {
        id: mockFlowId,
        name: createData.name,
        companyId: createData.companyId,
        save: jest.fn().mockResolvedValue(true)
      };

      mockFlow.findOne.mockResolvedValue(null);
      mockFlow.create.mockResolvedValue(mockNewFlow as any);
      (service as any).validateFlowStructure = jest.fn().mockReturnValue({ isValid: true });

      const result = await service.create(createData);

      expect(mockFlow.findOne).toHaveBeenCalledWith({
        where: { name: createData.name, companyId: createData.companyId }
      });
      expect(mockFlow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createData.name,
          description: createData.description,
          companyId: createData.companyId,
          nodes: createData.nodes,
          edges: createData.edges,
          category: createData.category,
          createdBy: createData.createdBy
        })
      );
      expect(result).toEqual(mockNewFlow);
    });

    it('should throw error if flow name already exists', async () => {
      mockFlow.findOne.mockResolvedValue({} as any);

      await expect(service.create(createData)).rejects.toThrow(
        'Já existe um fluxo com este nome para esta empresa'
      );
    });

    it('should throw error for invalid flow structure', async () => {
      mockFlow.findOne.mockResolvedValue(null);
      (service as any).validateFlowStructure = jest.fn().mockReturnValue({
        isValid: false,
        errors: ['Missing start node']
      });

      await expect(service.create(createData)).rejects.toThrow(
        'Estrutura do fluxo inválida: Missing start node'
      );
    });
  });

  describe('validateFlowStructure', () => {
    it('should validate flow with start and end nodes', () => {
      const validFlow = {
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'end-1', type: 'end' }
        ],
        edges: [
          { source: 'start-1', target: 'end-1' }
        ]
      };

      const result = (service as any).validateFlowStructure(validFlow);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject flow without start node', () => {
      const invalidFlow = {
        nodes: [
          { id: 'end-1', type: 'end' }
        ],
        edges: []
      };

      const result = (service as any).validateFlowStructure(invalidFlow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Fluxo deve ter um nó de início');
    });

    it('should reject flow without end node', () => {
      const invalidFlow = {
        nodes: [
          { id: 'start-1', type: 'start' }
        ],
        edges: []
      };

      const result = (service as any).validateFlowStructure(invalidFlow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Fluxo deve ter pelo menos um nó de fim');
    });

    it('should reject flow with invalid connections', () => {
      const invalidFlow = {
        nodes: [
          { id: 'start-1', type: 'start' },
          { id: 'end-1', type: 'end' }
        ],
        edges: [
          { source: 'start-1', target: 'non-existent-node' }
        ]
      };

      const result = (service as any).validateFlowStructure(invalidFlow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Conexão inválida: nó de destino non-existent-node não existe');
    });
  });

  describe('publish', () => {
    const mockFlow = {
      id: mockFlowId,
      name: 'Test Flow',
      isPublished: false,
      version: 1,
      update: jest.fn()
    };

    beforeEach(() => {
      (service as any).findById = jest.fn().mockResolvedValue(mockFlow);
      (service as any).validateFlowStructure = jest.fn().mockReturnValue({ isValid: true });
    });

    it('should publish a flow successfully', async () => {
      await service.publish(mockFlowId, mockCompanyId);

      expect(mockFlow.update).toHaveBeenCalledWith({
        isPublished: true,
        publishedAt: expect.any(Date),
        version: 2
      });
    });

    it('should throw error if already published', async () => {
      mockFlow.isPublished = true;

      await expect(service.publish(mockFlowId, mockCompanyId)).rejects.toThrow(
        'Fluxo já está publicado'
      );
    });

    it('should throw error for invalid flow structure', async () => {
      (service as any).validateFlowStructure = jest.fn().mockReturnValue({
        isValid: false,
        errors: ['Invalid structure']
      });

      await expect(service.publish(mockFlowId, mockCompanyId)).rejects.toThrow(
        'Não é possível publicar fluxo com erros: Invalid structure'
      );
    });
  });

  describe('execute', () => {
    const mockFlow = {
      id: mockFlowId,
      name: 'Test Flow',
      isPublished: true,
      isActive: true,
      nodes: [{ id: 'start-1', type: 'start' }],
      edges: []
    };

    const mockExecution = {
      id: 'execution-uuid',
      flowId: mockFlowId,
      status: 'running',
      startTime: new Date(),
      endTime: null,
      executionTime: 0
    };

    const executeData = {
      ticketId: 'ticket-uuid',
      contactId: 'contact-uuid',
      variables: { name: 'John' }
    };

    beforeEach(() => {
      (service as any).findById = jest.fn().mockResolvedValue(mockFlow);
      MockFlowEngine.prototype.executeFlow = jest.fn().mockResolvedValue(mockExecution);
    });

    it('should execute a flow successfully', async () => {
      const result = await service.execute(mockFlowId, mockCompanyId, executeData);

      expect(MockFlowEngine.prototype.executeFlow).toHaveBeenCalledWith(
        mockFlow,
        expect.objectContaining({
          flowId: mockFlowId,
          ticketId: executeData.ticketId,
          contactId: executeData.contactId,
          variables: expect.any(Map)
        })
      );
      expect(result).toEqual(mockExecution);
    });

    it('should throw error if flow not published', async () => {
      mockFlow.isPublished = false;

      await expect(service.execute(mockFlowId, mockCompanyId, executeData)).rejects.toThrow(
        'Fluxo não está publicado'
      );
    });

    it('should throw error if flow not active', async () => {
      mockFlow.isActive = false;

      await expect(service.execute(mockFlowId, mockCompanyId, executeData)).rejects.toThrow(
        'Fluxo não está ativo'
      );
    });

    it('should associate execution with ticket', async () => {
      const mockTicket = {
        id: 'ticket-uuid',
        update: jest.fn()
      };

      mockTicket.findOne.mockResolvedValue(mockTicket as any);
      mockTicket.findOne = jest.fn().mockResolvedValue(mockTicket as any);

      await service.execute(mockFlowId, mockCompanyId, executeData);

      expect(mockTicket.update).toHaveBeenCalledWith({
        flowId: mockFlowId,
        isFlowActive: true,
        lastFlowExecutionId: mockExecution.id
      });
    });
  });

  describe('test', () => {
    const mockFlow = {
      id: mockFlowId,
      name: 'Test Flow',
      nodes: [{ id: 'start-1', type: 'start' }],
      edges: []
    };

    const testData = {
      contactNumber: '+5511999998888',
      contactName: 'Test Contact',
      variables: { test: 'value' }
    };

    beforeEach(() => {
      (service as any).findById = jest.fn().mockResolvedValue(mockFlow);
    });

    it('should test a flow successfully', async () => {
      const mockExecution = {
        id: 'execution-uuid',
        status: 'completed',
        executionTime: 1000,
        history: ['step1', 'step2'],
        variables: new Map([['result', 'success']]),
        error: null
      };

      MockFlowEngine.prototype.executeFlow = jest.fn().mockResolvedValue(mockExecution);

      const result = await service.test(mockFlowId, mockCompanyId, testData);

      expect(MockFlowEngine.prototype.executeFlow).toHaveBeenCalledWith(
        mockFlow,
        expect.objectContaining({
          contactNumber: testData.contactNumber,
          contactName: testData.contactName,
          variables: expect.any(Map),
          isTest: true
        })
      );
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(mockExecution.id);
      expect(result.status).toBe('completed');
    });

    it('should handle test execution errors', async () => {
      MockFlowEngine.prototype.executeFlow = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await service.test(mockFlowId, mockCompanyId, testData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });
  });

  describe('getAnalytics', () => {
    const mockFlow = {
      id: mockFlowId,
      name: 'Test Flow'
    };

    beforeEach(() => {
      (service as any).findById = jest.fn().mockResolvedValue(mockFlow);
    });

    it('should return flow analytics', async () => {
      const mockExecutions = [
        { status: 'completed', count: '80', executionTime: 1000 },
        { status: 'failed', count: '20', executionTime: 500 }
      ];

      mockFlowExecution.findAll.mockResolvedValue(mockExecutions as any);

      const result = await service.getAnalytics(mockFlowId, mockCompanyId);

      expect(mockFlowExecution.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { flowId: mockFlowId }
        })
      );
      expect(result).toEqual({
        flowId: mockFlowId,
        flowName: 'Test Flow',
        totalExecutions: 100,
        avgExecutionTime: 860,
        executions: [
          { status: 'completed', count: 80, percentage: 80 },
          { status: 'failed', count: 20, percentage: 20 }
        ]
      });
    });
  });

  describe('duplicate', () => {
    const mockFlow = {
      id: mockFlowId,
      name: 'Original Flow',
      description: 'Original Description',
      companyId: mockCompanyId,
      nodes: [{ id: 'start-1', type: 'start' }],
      edges: [],
      category: 'welcome' as const,
      createdBy: mockUserId
    };

    beforeEach(() => {
      (service as any).findById = jest.fn().mockResolvedValue(mockFlow);
    });

    it('should duplicate a flow with default name', async () => {
      const mockDuplicatedFlow = {
        id: 'new-flow-uuid',
        name: 'Original Flow (Cópia)'
      };

      mockFlow.create.mockResolvedValue(mockDuplicatedFlow as any);

      const result = await service.duplicate(mockFlowId, mockCompanyId);

      expect(mockFlow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Original Flow (Cópia)',
          description: mockFlow.description,
          companyId: mockFlow.companyId,
          nodes: mockFlow.nodes,
          edges: mockFlow.edges,
          category: mockFlow.category,
          createdBy: mockFlow.createdBy
        })
      );
      expect(result).toEqual(mockDuplicatedFlow);
    });

    it('should duplicate a flow with custom name', async () => {
      const customName = 'Custom Duplicated Flow';
      const mockDuplicatedFlow = {
        id: 'new-flow-uuid',
        name: customName
      };

      mockFlow.create.mockResolvedValue(mockDuplicatedFlow as any);

      const result = await service.duplicate(mockFlowId, mockCompanyId, customName);

      expect(mockFlow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: customName
        })
      );
      expect(result).toEqual(mockDuplicatedFlow);
    });
  });
});