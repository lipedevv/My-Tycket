import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '..';

export interface FlowAttributes {
  id: string;
  name: string;
  description?: string;
  companyId: number;
  isActive: boolean;
  category: 'welcome' | 'support' | 'sales' | 'marketing' | 'survey' | 'notification' | 'custom';
  nodes: string; // JSON string
  edges: string; // JSON string
  variables?: string; // JSON string
  settings?: string; // JSON string
  version: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: number;
  updatedBy?: number;
  triggerType: 'message' | 'keyword' | 'schedule' | 'webhook' | 'manual' | 'api';
  triggerConfig?: string; // JSON string
  tags?: string[];
  priority: number;
  timeoutMinutes?: number;
  errorHandling?: string; // JSON string
  analytics?: string; // JSON string
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlowCreationAttributes extends Optional<FlowAttributes, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'updatedBy'> {}

class Flow extends Model<FlowAttributes, FlowCreationAttributes> implements FlowAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public companyId!: number;
  public isActive!: boolean;
  public category!: 'welcome' | 'support' | 'sales' | 'marketing' | 'survey' | 'notification' | 'custom';
  public nodes!: string;
  public edges!: string;
  public variables?: string;
  public settings?: string;
  public version!: number;
  public isPublished!: boolean;
  public publishedAt?: Date;
  public createdBy!: number;
  public updatedBy?: number;
  public triggerType!: 'message' | 'keyword' | 'schedule' | 'webhook' | 'manual' | 'api';
  public triggerConfig?: string;
  public tags?: string[];
  public priority!: number;
  public timeoutMinutes?: number;
  public errorHandling?: string;
  public analytics?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Métodos virtuais
  public getNodes(): any[] {
    return this.nodes ? JSON.parse(this.nodes) : [];
  }

  public setNodes(nodes: any[]): void {
    this.nodes = JSON.stringify(nodes);
  }

  public getEdges(): any[] {
    return this.edges ? JSON.parse(this.edges) : [];
  }

  public setEdges(edges: any[]): void {
    this.edges = JSON.stringify(edges);
  }

  public getVariables(): Record<string, any> {
    return this.variables ? JSON.parse(this.variables) : {};
  }

  public setVariables(variables: Record<string, any>): void {
    this.variables = JSON.stringify(variables);
  }

  public getSettings(): Record<string, any> {
    return this.settings ? JSON.parse(this.settings) : {};
  }

  public setSettings(settings: Record<string, any>): void {
    this.settings = JSON.stringify(settings);
  }

  public getTriggerConfig(): Record<string, any> {
    return this.triggerConfig ? JSON.parse(this.triggerConfig) : {};
  }

  public setTriggerConfig(config: Record<string, any>): void {
    this.triggerConfig = JSON.stringify(config);
  }

  public getErrorHandling(): Record<string, any> {
    return this.errorHandling ? JSON.parse(this.errorHandling) : {};
  }

  public setErrorHandling(handling: Record<string, any>): void {
    this.errorHandling = JSON.stringify(handling);
  }

  public getAnalytics(): Record<string, any> {
    return this.analytics ? JSON.parse(this.analytics) : {};
  }

  public setAnalytics(analytics: Record<string, any>): void {
    this.analytics = JSON.stringify(analytics);
  }

  // Associações
  public readonly company?: any;
  public readonly creator?: any;
  public readonly updater?: any;
  public readonly executions?: any[];
}

Flow.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Companies',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    category: {
      type: DataTypes.ENUM('welcome', 'support', 'sales', 'marketing', 'survey', 'notification', 'custom'),
      defaultValue: 'custom',
    },
    nodes: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
    },
    edges: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
    },
    variables: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    settings: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    triggerType: {
      type: DataTypes.ENUM('message', 'keyword', 'schedule', 'webhook', 'manual', 'api'),
      defaultValue: 'message',
    },
    triggerConfig: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    timeoutMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    errorHandling: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    analytics: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Flow',
    tableName: 'Flows',
    timestamps: true,
    underscored: true,
  }
);

export default Flow;