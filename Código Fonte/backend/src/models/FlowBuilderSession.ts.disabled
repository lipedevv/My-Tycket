import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo
} from 'sequelize';
import { Ticket } from './Ticket';
import { QueueIntegration } from './QueueIntegration';
import Company from './Company';

interface FlowBuilderSessionAttributes {
  id: number;
  ticketId: number;
  flowIntegrationId?: number;
  companyId: number;
  nodeId: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  variables: object;
  context: object;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  error?: string;
  metadata?: object;
  createdAt: Date;
  updatedAt: Date;
}

@Table({
  tableName: 'FlowBuilderSessions',
  timestamps: true
})
class FlowBuilderSession extends Model<FlowBuilderSessionAttributes> implements FlowBuilderSessionAttributes {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  })
  id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'Tickets',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @ForeignKey(() => Ticket)
  ticketId!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    references: {
      model: 'QueueIntegrations',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  })
  @ForeignKey(() => QueueIntegration)
  flowIntegrationId?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'Companies',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  @ForeignKey(() => Company)
  companyId!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'ID do nó atual no fluxo'
  })
  nodeId!: string;

  @Column({
    type: DataType.ENUM('running', 'paused', 'completed', 'error'),
    defaultValue: 'running'
  })
  status!: 'running' | 'paused' | 'completed' | 'error';

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Variáveis da sessão do fluxo'
  })
  variables!: object;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Contexto da conversa'
  })
  context!: object;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  startedAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Data de conclusão do fluxo'
  })
  completedAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  lastActivityAt!: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Mensagem de erro se ocorrer'
  })
  error?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Metadados adicionais'
  })
  metadata?: object;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  createdAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => Ticket, 'ticketId')
  ticket?: Ticket;

  @BelongsTo(() => QueueIntegration, 'flowIntegrationId')
  flowIntegration?: QueueIntegration;

  @BelongsTo(() => Company, 'companyId')
  company?: Company;

  // Métodos de instância
  public async updateNodeId(nodeId: string): Promise<void> {
    await this.update({
      nodeId,
      lastActivityAt: new Date()
    });
  }

  public async setVariable(key: string, value: any): Promise<void> {
    const variables = { ...this.variables };
    variables[key] = value;
    await this.update({
      variables,
      lastActivityAt: new Date()
    });
  }

  public async getVariable(key: string): Promise<any> {
    return this.variables?.[key];
  }

  public async addToContext(key: string, value: any): Promise<void> {
    const context = { ...this.context };
    context[key] = value;
    await this.update({
      context,
      lastActivityAt: new Date()
    });
  }

  public async complete(error?: string): Promise<void> {
    await this.update({
      status: error ? 'error' : 'completed',
      completedAt: new Date(),
      lastActivityAt: new Date(),
      ...(error && { error })
    });
  }

  public async pause(): Promise<void> {
    await this.update({
      status: 'paused',
      lastActivityAt: new Date()
    });
  }

  public async resume(): Promise<void> {
    await this.update({
      status: 'running',
      lastActivityAt: new Date()
    });
  }

  public getDuration(): number {
    const endTime = this.completedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }

  public getExecutionTime(): string {
    const duration = this.getDuration();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Métodos estáticos
  public static async findActiveByTicket(ticketId: number): Promise<FlowBuilderSession | null> {
    return await FlowBuilderSession.findOne({
      where: {
        ticketId,
        status: ['running', 'paused']
      },
      order: [['createdAt', 'DESC']]
    });
  }

  public static async findByTicket(ticketId: number): Promise<FlowBuilderSession[]> {
    return await FlowBuilderSession.findAll({
      where: { ticketId },
      order: [['createdAt', 'DESC']]
    });
  }

  public static async findActiveByCompany(companyId: number): Promise<FlowBuilderSession[]> {
    return await FlowBuilderSession.findAll({
      where: {
        companyId,
        status: ['running', 'paused']
      },
      include: [
        {
          model: Ticket,
          as: 'ticket'
        }
      ],
      order: [['lastActivityAt', 'DESC']]
    });
  }

  public static async getStatsByCompany(companyId: number): Promise<any> {
    const total = await FlowBuilderSession.count({
      where: { companyId }
    });

    const completed = await FlowBuilderSession.count({
      where: {
        companyId,
        status: 'completed'
      }
    });

    const error = await FlowBuilderSession.count({
      where: {
        companyId,
        status: 'error'
      }
    });

    const running = await FlowBuilderSession.count({
      where: {
        companyId,
        status: 'running'
      }
    });

    const paused = await FlowBuilderSession.count({
      where: {
        companyId,
        status: 'paused'
      }
    });

    return {
      total,
      completed,
      error,
      running,
      paused,
      successRate: total > 0 ? (completed / total * 100).toFixed(2) : 0
    };
  }

  // Limpar sessões antigas
  public static async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedCount = await FlowBuilderSession.destroy({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: cutoffDate
        },
        status: ['completed', 'error']
      }
    });

    return deletedCount;
  }

  // Hooks
  public static beforeCreate(session: FlowBuilderSession): void {
    if (!session.nodeId || session.nodeId.trim().length === 0) {
      throw new Error('Node ID é obrigatório');
    }
  }
}

export default FlowBuilderSession;