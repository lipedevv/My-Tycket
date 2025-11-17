import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '..';

export interface FlowExecutionAttributes {
  id: string;
  flowId: string;
  ticketId: number;
  companyId: number;
  contactId: number;
  userId?: number;
  sessionId: string;
  status: 'running' | 'completed' | 'error' | 'stopped' | 'paused';
  startTime: Date;
  endTime?: Date;
  currentNodeId?: string;
  variables?: string; // JSON string
  steps?: string; // JSON string
  result?: string; // JSON string
  error?: string;
  metrics?: string; // JSON string
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlowExecutionCreationAttributes extends Optional<FlowExecutionAttributes, 'id' | 'createdAt' | 'updatedAt' | 'endTime' | 'currentNodeId' | 'userId' | 'error' | 'result' | 'metrics'> {}

class FlowExecution extends Model<FlowExecutionAttributes, FlowExecutionCreationAttributes> implements FlowExecutionAttributes {
  public id!: string;
  public flowId!: string;
  public ticketId!: number;
  public companyId!: number;
  public contactId!: number;
  public userId?: number;
  public sessionId!: string;
  public status!: 'running' | 'completed' | 'error' | 'stopped' | 'paused';
  public startTime!: Date;
  public endTime?: Date;
  public currentNodeId?: string;
  public variables?: string;
  public steps?: string;
  public result?: string;
  public error?: string;
  public metrics?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Métodos virtuais
  public getVariables(): Record<string, any> {
    return this.variables ? JSON.parse(this.variables) : {};
  }

  public setVariables(variables: Record<string, any>): void {
    this.variables = JSON.stringify(variables);
  }

  public getSteps(): any[] {
    return this.steps ? JSON.parse(this.steps) : [];
  }

  public setSteps(steps: any[]): void {
    this.steps = JSON.stringify(steps);
  }

  public getResult(): any {
    return this.result ? JSON.parse(this.result) : null;
  }

  public setResult(result: any): void {
    this.result = JSON.stringify(result);
  }

  public getMetrics(): Record<string, any> {
    return this.metrics ? JSON.parse(this.metrics) : {};
  }

  public setMetrics(metrics: Record<string, any>): void {
    this.metrics = JSON.stringify(metrics);
  }

  public getDuration(): number {
    if (this.endTime) {
      return this.endTime.getTime() - this.startTime.getTime();
    }
    return Date.now() - this.startTime.getTime();
  }

  public getStepCount(): number {
    return this.getSteps().length;
  }

  // Associações
  public readonly flow?: any;
  public readonly ticket?: any;
  public readonly contact?: any;
  public readonly user?: any;
}

FlowExecution.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    flowId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Flows',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tickets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Contacts',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('running', 'completed', 'error', 'stopped', 'paused'),
      defaultValue: 'running',
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    currentNodeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    variables: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    steps: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metrics: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'FlowExecution',
    tableName: 'FlowExecutions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['flowId', 'status'],
      },
      {
        fields: ['ticketId', 'sessionId'],
      },
      {
        fields: ['companyId', 'status'],
      },
      {
        fields: ['startTime'],
      },
    ],
  }
);

export default FlowExecution;