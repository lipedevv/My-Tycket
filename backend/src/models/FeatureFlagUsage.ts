import { Sequelize, Model, DataTypes } from 'sequelize';

interface FeatureFlagUsageAttributes {
  id?: string;
  featureFlagKey: string;
  companyId?: string;
  userId?: string;
  wasEnabled: boolean;
  context?: any;
  createdAt?: Date;
}

interface FeatureFlagUsageCreationAttributes extends FeatureFlagUsageAttributes {}

class FeatureFlagUsage extends Model<FeatureFlagUsageAttributes, FeatureFlagUsageCreationAttributes> implements FeatureFlagUsageAttributes {
  public id!: string;
  public featureFlagKey!: string;
  public companyId?: string;
  public userId?: string;
  public wasEnabled!: boolean;
  public context!: any;
  public readonly createdAt!: Date;
}

FeatureFlagUsage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    featureFlagKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'FeatureFlags',
        key: 'key'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    wasEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    context: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  },
  {
    sequelize: new Sequelize(process.env.DATABASE_URL || ''),
    tableName: 'FeatureFlagUsages',
    modelName: 'FeatureFlagUsage',
    timestamps: true,
    paranoid: false,
    updatedAt: false,
    indexes: [
      {
        fields: ['featureFlagKey']
      },
      {
        fields: ['companyId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['wasEnabled']
      },
      {
        fields: ['createdAt']
      }
    ]
  }
);

export default FeatureFlagUsage;