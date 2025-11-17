import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsTo,
  ForeignKey,
  Scopes
} from 'sequelize';
import { Whatsapp } from './Whatsapp';
import Company from './Company';

interface ProviderAttributes {
  id: number;
  name: string;
  type: 'baileys' | 'hub';
  companyId: number;
  isActive: boolean;
  isDefault: boolean;
  sessionId?: string;
  deviceName?: string;
  connectionId?: string;
  apiKey?: string;
  instanceId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  lastConnectionAt?: Date;
  messagesSent: number;
  messagesReceived: number;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  priority: number;
  settings?: object;
  createdAt: Date;
  updatedAt: Date;
}

@Table({
  tableName: 'Providers',
  timestamps: true
})
class Provider extends Model<ProviderAttributes> implements ProviderAttributes {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  })
  id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.ENUM('baileys', 'hub'),
    allowNull: false
  })
  type!: 'baileys' | 'hub';

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
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isDefault!: boolean;

  // Configurações específicas do Baileys
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Sessão do Baileys'
  })
  sessionId?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    defaultValue: 'Chrome (Linux)',
    comment: 'Nome do dispositivo para Baileys'
  })
  deviceName?: string;

  // Configurações específicas do Hub
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'ID da conexão no Notifica-me Hub'
  })
  connectionId?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'API Key do Notifica-me Hub'
  })
  apiKey?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'ID da instância no Notifica-me Hub'
  })
  instanceId?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'URL do webhook para o Notifica-me Hub'
  })
  webhookUrl?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Segredo para validação de webhook do Hub'
  })
  webhookSecret?: string;

  // Estatísticas e status
  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Data da última conexão'
  })
  lastConnectionAt?: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Total de mensagens enviadas'
  })
  messagesSent!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Total de mensagens recebidas'
  })
  messagesReceived!: number;

  @Column({
    type: DataType.ENUM('connected', 'connecting', 'disconnected', 'error'),
    defaultValue: 'disconnected'
  })
  status!: 'connected' | 'connecting' | 'disconnected' | 'error';

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Prioridade para seleção automática'
  })
  priority!: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Configurações adicionais em JSON'
  })
  settings?: object;

  // Timestamps
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
  @BelongsTo(() => Company, 'companyId')
  company?: Company;

  @HasMany(() => Whatsapp, 'providerId')
  whatsapps?: Whatsapp[];

  // Scopes
  static scopes = {
    active: {
      where: {
        isActive: true
      }
    },
    default: {
      where: {
        isDefault: true,
        isActive: true
      }
    },
    byType: (type: string) => ({
      where: {
        type
      }
    }),
    connected: {
      where: {
        status: 'connected'
      }
    },
    byCompany: (companyId: number) => ({
      where: {
        companyId
      }
    })
  };

  // Métodos de instância
  public async setAsDefault(): Promise<void> {
    // Remove default status from other providers in the same company
    await Provider.update(
      { isDefault: false },
      {
        where: {
          companyId: this.companyId,
          id: { [require('sequelize').Op.ne]: this.id }
        }
      }
    );

    // Set this provider as default
    await this.update({ isDefault: true });
  }

  public async toggleActive(): Promise<void> {
    await this.update({ isActive: !this.isActive });
  }

  public async updateStatus(status: 'connected' | 'connecting' | 'disconnected' | 'error'): Promise<void> {
    await this.update({
      status,
      lastConnectionAt: new Date()
    });
  }

  public async incrementMessageSent(): Promise<void> {
    await this.increment('messagesSent');
  }

  public async incrementMessageReceived(): Promise<void> {
    await this.increment('messagesReceived');
  }

  public getProviderConfig(): any {
    if (this.type === 'baileys') {
      return {
        type: 'baileys',
        name: this.name,
        sessionId: this.sessionId,
        deviceName: this.deviceName,
        settings: this.settings
      };
    } else if (this.type === 'hub') {
      return {
        type: 'hub',
        name: this.name,
        connectionId: this.connectionId,
        apiKey: this.apiKey,
        instanceId: this.instanceId,
        webhookUrl: this.webhookUrl,
        webhookSecret: this.webhookSecret,
        settings: this.settings
      };
    }
    return null;
  }

  // Métodos estáticos
  public static async findDefaultByCompany(companyId: number): Promise<Provider | null> {
    return await Provider.scope('default').findOne({
      where: { companyId }
    });
  }

  public static async findActiveByCompany(companyId: number): Promise<Provider[]> {
    return await Provider.scope(['active', { method: ['byCompany', companyId] }]).findAll({
      order: [['priority', 'DESC'], ['createdAt', 'ASC']]
    });
  }

  public static async findByTypeAndCompany(type: 'baileys' | 'hub', companyId: number): Promise<Provider[]> {
    return await Provider.scope(['active', { method: ['byCompany', companyId] }, { method: ['byType', type] }]).findAll();
  }

  // Validações
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Nome é obrigatório');
    }

    if (this.type === 'baileys') {
      if (!this.sessionId || this.sessionId.trim().length === 0) {
        errors.push('Session ID é obrigatório para provider Baileys');
      }
    }

    if (this.type === 'hub') {
      if (!this.connectionId || this.connectionId.trim().length === 0) {
        errors.push('Connection ID é obrigatório para provider Hub');
      }
      if (!this.apiKey || this.apiKey.trim().length === 0) {
        errors.push('API Key é obrigatória para provider Hub');
      }
      if (!this.instanceId || this.instanceId.trim().length === 0) {
        errors.push('Instance ID é obrigatório para provider Hub');
      }
    }

    return errors;
  }

  // Hooks
  public static beforeCreate(provider: Provider): void {
    const errors = provider.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  public static beforeUpdate(provider: Provider): void {
    const errors = provider.validate();
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }
}

export default Provider;