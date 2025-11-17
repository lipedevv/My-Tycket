import { Op } from 'sequelize';
import Flow from '../models/Flow';
import FlowExecution from '../models/FlowExecution';
import FlowBuilderSession from '../models/FlowBuilderSession';
import WhatsAppProvider from '../models/WhatsAppProvider';
import Ticket from '../models/Ticket';
import { logger } from '../utils/logger';
import AppError from '../errors/AppError';

/**
 * Service para garantir compatibilidade entre sistemas Flow existentes
 * e nova implementação dual provider
 */
class IntegrationService {
  /**
   * Migra dados do sistema antigo para nova estrutura
   */
  async migrateLegacyFlowData(): Promise<void> {
    try {
      logger.info('Iniciando migração de dados Flow legados...');

      // 1. Migrar FlowBuilderSession para FlowExecution
      const legacySessions = await FlowBuilderSession.findAll({
        where: {
          status: {
            [Op.notIn]: ['closed', 'completed']
          }
        }
      });

      for (const session of legacySessions) {
        // Verificar se já existe migration
        const existingExecution = await FlowExecution.findOne({
          where: {
            sessionId: session.sessionId
          }
        });

        if (!existingExecution) {
          await FlowExecution.create({
            flowId: session.flowId,
            ticketId: session.ticketId,
            companyId: session.companyId,
            status: this.mapLegacyStatus(session.status),
            currentNodeId: session.currentStep,
            context: this.convertLegacyContext(session),
            variables: new Map(Object.entries(session.variables || {})),
            history: session.steps || [],
            sessionId: session.sessionId,
            startTime: session.createdAt,
            endTime: session.updatedAt,
            executionTime: this.calculateExecutionTime(session)
          });
        }
      }

      logger.info(`Migradas ${legacySessions.length} sessões legadas`);
    } catch (error) {
      logger.error('Erro na migração de dados Flow:', error);
      throw new AppError('Erro na migração de dados', 500);
    }
  }

  /**
   * Unifica configurações de providers existentes
   */
  async unifyProviders(companyId: number): Promise<void> {
    try {
      // Verificar se existem providers configurados
      const existingProviders = await WhatsAppProvider.findAll({
        where: { companyId: companyId.toString() }
      });

      if (existingProviders.length === 0) {
        // Criar provider Baileys padrão baseado em configurações existentes
        await this.createDefaultBaileysProvider(companyId);
      }

      logger.info(`Providers unificados para empresa ${companyId}`);
    } catch (error) {
      logger.error('Erro na unificação de providers:', error);
    }
  }

  /**
   * Valida compatibilidade entre flows existentes e novo sistema
   */
  async validateFlowCompatibility(flowId: string): Promise<{
    isCompatible: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      const flow = await Flow.findByPk(flowId);
      if (!flow) {
        throw new AppError('Flow não encontrado', 404);
      }

      // 1. Validar estrutura JSON
      let nodes, edges;
      try {
        nodes = JSON.parse(flow.nodes as string);
        edges = JSON.parse(flow.edges as string);
      } catch (error) {
        issues.push('Estrutura JSON de nodes/edges inválida');
      }

      if (nodes && Array.isArray(nodes)) {
        // 2. Validar tipos de nós suportados
        const supportedTypes = [
          'start', 'end', 'sendMessage', 'sendMedia', 'condition',
          'menu', 'delay', 'apiCall', 'webhook', 'variable',
          'validation', 'tag', 'queue', 'humanHandoff', 'analytics'
        ];

        const unsupportedNodes = nodes.filter(node =>
          !supportedTypes.includes(node.type)
        );

        if (unsupportedNodes.length > 0) {
          warnings.push(`Nós não suportados: ${unsupportedNodes.map(n => n.type).join(', ')}`);
        }

        // 3. Validar configurações obrigatórias
        nodes.forEach(node => {
          if (node.type === 'start' && !node.position) {
            issues.push('Nó de início sem posição definida');
          }

          if (node.type === 'sendMessage' && !node.data?.config?.message) {
            warnings.push(`Nó sendMessage (${node.id}) sem mensagem configurada`);
          }
        });
      }

      // 4. Validar compatibilidade de company ID
      if (typeof flow.companyId === 'number') {
        warnings.push('Flow usa companyId numérico (legado) - considere migrar para UUID');
      }

      // 5. Validar se há provider configurado para empresa
      if (flow.companyId) {
        const hasProvider = await WhatsAppProvider.findOne({
          where: {
            companyId: flow.companyId.toString(),
            status: 'connected'
          }
        });

        if (!hasProvider) {
          warnings.push('Nenhum WhatsApp provider conectado para este flow');
        }
      }

      return {
        isCompatible: issues.length === 0,
        issues,
        warnings
      };

    } catch (error) {
      logger.error('Erro na validação de compatibilidade:', error);
      return {
        isCompatible: false,
        issues: ['Erro na validação do flow'],
        warnings: []
      };
    }
  }

  /**
   * Converte flow legado para novo formato
   */
  async convertLegacyFlow(flowId: string): Promise<Flow> {
    try {
      const flow = await Flow.findByPk(flowId);
      if (!flow) {
        throw new AppError('Flow não encontrado', 404);
      }

      // Converter JSON strings para objects
      const nodes = JSON.parse(flow.nodes as string);
      const edges = JSON.parse(flow.edges as string);
      const variables = JSON.parse(flow.variables as string || '{}');
      const settings = JSON.parse(flow.settings as string || '{}');

      // Atualizar para novo formato
      await flow.update({
        nodes,
        edges,
        variables,
        settings,
        // Adicionar metadados de migração
        metadata: {
          migrated: true,
          migratedAt: new Date(),
          legacyVersion: flow.version
        }
      });

      logger.info(`Flow ${flowId} migrado para novo formato`);
      return flow;

    } catch (error) {
      logger.error('Erro na conversão de flow legado:', error);
      throw new AppError('Erro na conversão do flow', 500);
    }
  }

  /**
   * Sincroniza execução de flows com tickets existentes
   */
  async syncFlowWithTicket(ticketId: number, flowId: string): Promise<void> {
    try {
      const ticket = await Ticket.findByPk(ticketId);
      if (!ticket) {
        throw new AppError('Ticket não encontrado', 404);
      }

      const flow = await Flow.findByPk(flowId);
      if (!flow) {
        throw new AppError('Flow não encontrado', 404);
      }

      // Verificar se já existe execução ativa
      const activeExecution = await FlowExecution.findOne({
        where: {
          ticketId: ticketId.toString(),
          status: 'running'
        }
      });

      // Atualizar ticket com informações do flow
      await ticket.update({
        flowId: flowId,
        isFlowActive: !!activeExecution,
        lastFlowExecutionId: activeExecution?.id || null
      });

      logger.info(`Ticket ${ticketId} sincronizado com Flow ${flowId}`);

    } catch (error) {
      logger.error('Erro na sincronização Flow-Ticket:', error);
      throw new AppError('Erro na sincronização', 500);
    }
  }

  // Métodos privados de helpers
  private mapLegacyStatus(legacyStatus: string): 'running' | 'completed' | 'failed' | 'stopped' | 'timeout' {
    const statusMap: Record<string, 'running' | 'completed' | 'failed' | 'stopped' | 'timeout'> = {
      'open': 'running',
      'waiting': 'running',
      'closed': 'completed',
      'error': 'failed',
      'cancelled': 'stopped',
      'timeout': 'timeout'
    };

    return statusMap[legacyStatus] || 'failed';
  }

  private convertLegacyContext(session: any): any {
    return {
      sessionId: session.sessionId,
      contactId: session.contactId,
      variables: new Map(Object.entries(session.variables || {})),
      stepHistory: session.steps || [],
      startTime: session.createdAt,
      currentStep: session.currentStep
    };
  }

  private calculateExecutionTime(session: any): number {
    if (!session.updatedAt || !session.createdAt) return 0;

    const start = new Date(session.createdAt).getTime();
    const end = new Date(session.updatedAt).getTime();

    return end - start;
  }

  private async createDefaultBaileysProvider(companyId: number): Promise<void> {
    await WhatsAppProvider.create({
      name: 'WhatsApp Baileys (Padrão)',
      provider: 'baileys',
      companyId: companyId.toString(),
      config: {
        session: `company_${companyId}`,
        webhookUrl: `${process.env.BACKEND_URL}/webhooks/whatsapp`
      },
      isDefault: true,
      status: 'disconnected'
    });
  }

  /**
   * Obtém estatísticas de compatibilidade do sistema
   */
  async getCompatibilityStats(): Promise<{
    totalFlows: number;
    compatibleFlows: number;
    incompatibleFlows: number;
    flowsNeedingMigration: number;
    providersConfigured: number;
    activeExecutions: number;
  }> {
    const [
      totalFlows,
      incompatibleFlows,
      providersConfigured,
      activeExecutions
    ] = await Promise.all([
      Flow.count(),
      Flow.count({
        where: {
          nodes: {
            [Op.like]: '%type%'
          }
        }
      }),
      WhatsAppProvider.count({
        where: { status: 'connected' }
      }),
      FlowExecution.count({
        where: { status: 'running' }
      })
    ]);

    return {
      totalFlows,
      compatibleFlows: totalFlows - incompatibleFlows,
      incompatibleFlows,
      flowsNeedingMigration: incompatibleFlows,
      providersConfigured,
      activeExecutions
    };
  }
}

export default new IntegrationService();