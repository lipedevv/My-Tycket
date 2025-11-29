import { Sequelize, Model, DataTypes } from 'sequelize';

interface FeatureFlagAttributes {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercentage?: number;
  targetCompanies?: string[];
  targetUsers?: string[];
  conditions?: any;
  metadata?: any;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FeatureFlagCreationAttributes extends FeatureFlagAttributes {}

class FeatureFlag extends Model<FeatureFlagAttributes, FeatureFlagCreationAttributes> implements FeatureFlagAttributes {
  public id!: string;
  public key!: string;
  public name!: string;
  public description?: string;
  public isEnabled!: boolean;
  public rolloutPercentage!: number;
  public targetCompanies!: string[];
  public targetUsers!: string[];
  public conditions!: any;
  public metadata!: any;
  public isActive!: boolean;
  public createdBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FeatureFlag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    rolloutPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    targetCompanies: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    targetUsers: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  },
  {
    sequelize: new Sequelize(process.env.DATABASE_URL || ''),
    tableName: 'FeatureFlags',
    modelName: 'FeatureFlag',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ['key'],
        unique: true
      },
      {
        fields: ['isEnabled']
      },
      {
        fields: ['isActive']
      }
    ]
  }
);

export default FeatureFlag;