import { Sequelize, Model, DataTypes, BuildOptions } from 'sequelize';
import { isObject } from 'lodash';

interface WhatsAppProviderAttributes {
  id?: string;
  name: string;
  provider: 'baileys' | 'hub';
  companyId: string;
  instanceId?: string;
  config?: any;
  status?: 'connected' | 'disconnected' | 'connecting' | 'error';
  isDefault?: boolean;
  statusReason?: string;
  qrCode?: string;
  lastStatusUpdate?: Date;
  webhookUrl?: string;
  webhookSecret?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WhatsAppProviderCreationAttributes extends WhatsAppProviderAttributes {}

interface WhatsAppProviderInstance
  extends Model<WhatsAppProviderAttributes, WhatsAppProviderCreationAttributes>,
    WhatsAppProviderAttributes {}

class WhatsAppProvider
  extends Model<WhatsAppProviderAttributes, WhatsAppProviderCreationAttributes>
  implements WhatsAppProviderAttributes
{
  public id!: string;
  public name!: string;
  public provider!: 'baileys' | 'hub';
  public companyId!: string;
  public instanceId?: string;
  public config?: any;
  public status!: 'connected' | 'disconnected' | 'connecting' | 'error';
  public isDefault!: boolean;
  public statusReason?: string;
  public qrCode?: string;
  public lastStatusUpdate?: Date;
  public webhookUrl?: string;
  public webhookSecret?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Métodos de instância
  public isConnected(): boolean {
    return this.status === 'connected';
  }

  public isConnecting(): boolean {
    return this.status === 'connecting';
  }

  public hasError(): boolean {
    return this.status === 'error';
  }

  public getConfigValue(key: string): any {
    if (!this.config || !isObject(this.config)) {
      return undefined;
    }
    return this.config[key];
  }

  public setConfigValue(key: string, value: any): void {
    if (!this.config) {
      this.config = {};
    }
    this.config[key] = value;
  }

  public getStatusInfo() {
    return {
      id: this.id,
      name: this.name,
      provider: this.provider,
      status: this.status,
      isDefault: this.isDefault,
      lastStatusUpdate: this.lastStatusUpdate,
      statusReason: this.statusReason,
      isConnected: this.isConnected(),
      isConnecting: this.isConnecting(),
      hasError: this.hasError()
    };
  }

  // Métodos estáticos
  public static async findByCompany(
    companyId: string,
    options?: { provider?: string; status?: string }
  ): Promise<WhatsAppProvider[]> {
    const where: any = { companyId };

    if (options?.provider) {
      where.provider = options.provider;
    }

    if (options?.status) {
      where.status = options.status;
    }

    return await WhatsAppProvider.findAll({ where });
  }

  public static async findDefaultByCompany(
    companyId: string
  ): Promise<WhatsAppProvider | null> {
    return await WhatsAppProvider.findOne({
      where: { companyId, isDefault: true }
    });
  }

  public static async findConnectedProviders(
    companyId: string
  ): Promise<WhatsAppProvider[]> {
    return await WhatsAppProvider.findAll({
      where: { companyId, status: 'connected' }
    });
  }

  public static async countByCompany(
    companyId: string
  ): Promise<number> {
    return await WhatsAppProvider.count({
      where: { companyId }
    });
  }
}

WhatsAppProvider.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    provider: {
      type: DataTypes.ENUM('baileys', 'hub'),
      allowNull: false
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    instanceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('connected', 'disconnected', 'connecting', 'error'),
      defaultValue: 'disconnected',
      allowNull: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    statusReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastStatusUpdate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    webhookUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    webhookSecret: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    sequelize: new Sequelize(process.env.DATABASE_URL || ''),
    tableName: 'WhatsAppProviders',
    modelName: 'WhatsAppProvider',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ['companyId']
      },
      {
        fields: ['provider']
      },
      {
        fields: ['status']
      },
      {
        fields: ['isDefault']
      },
      {
        fields: ['instanceId'],
        unique: true
      }
    ]
  }
);

// Hooks
WhatsAppProvider.beforeCreate(async (provider: WhatsAppProvider) => {
  if (provider.isDefault) {
    // Garantir que apenas um provider por empresa seja default
    await WhatsAppProvider.update(
      { isDefault: false },
      { where: { companyId: provider.companyId, isDefault: true } }
    );
  }
});

WhatsAppProvider.beforeUpdate(async (provider: WhatsAppProvider) => {
  if (provider.changed('isDefault') && provider.isDefault) {
    // Garantir que apenas um provider por empresa seja default
    await WhatsAppProvider.update(
      { isDefault: false },
      {
        where: {
          companyId: provider.companyId,
          isDefault: true,
          id: { [Sequelize.Op.ne]: provider.id }
        }
      }
    );
  }
});

export default WhatsAppProvider;