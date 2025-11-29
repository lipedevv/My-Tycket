import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Criar tabela de Providers (compatível com sistema existente)
    await queryInterface.createTable('Providers', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('baileys', 'hub'),
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      // Configurações específicas do Baileys
      sessionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Sessão do Baileys'
      },
      deviceName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'Chrome (Linux)',
        comment: 'Nome do dispositivo para Baileys'
      },
      // Configurações específicas do Hub
      connectionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID da conexão no Notifica-me Hub'
      },
      apiKey: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'API Key do Notifica-me Hub'
      },
      instanceId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID da instância no Notifica-me Hub'
      },
      webhookUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL do webhook para o Notifica-me Hub'
      },
      webhookSecret: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Segredo para validação de webhook do Hub'
      },
      // Estatísticas e status
      lastConnectionAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data da última conexão'
      },
      messagesSent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total de mensagens enviadas'
      },
      messagesReceived: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total de mensagens recebidas'
      },
      status: {
        type: DataTypes.ENUM('connected', 'connecting', 'disconnected', 'error'),
        defaultValue: 'disconnected'
      },
      // Configurações adicionais
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Prioridade para seleção automática'
      },
      settings: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Configurações adicionais em JSON'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Índices
    await queryInterface.addIndex('Providers', ['companyId', 'type']);
    await queryInterface.addIndex('Providers', ['companyId', 'isActive']);
    await queryInterface.addIndex('Providers', ['companyId', 'isDefault']);
    await queryInterface.addIndex('Providers', ['type']);
    await queryInterface.addIndex('Providers', ['status']);
    await queryInterface.addIndex('Providers', ['priority']);

    // Constraint: apenas um provider padrão por company
    await queryInterface.addConstraint('Providers', {
      fields: ['companyId', 'isDefault'],
      type: 'unique',
      name: 'unique_default_provider_per_company',
      where: {
        isDefault: true,
        isActive: true
      }
    });

    // Criar tabela de Sessões do FlowBuilder
    await queryInterface.createTable('FlowBuilderSessions', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      flowIntegrationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'QueueIntegrations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nodeId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'ID do nó atual no fluxo'
      },
      status: {
        type: DataTypes.ENUM('running', 'paused', 'completed', 'error'),
        defaultValue: 'running'
      },
      variables: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Variáveis da sessão do fluxo'
      },
      context: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Contexto da conversa'
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      lastActivityAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro se ocorrer'
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Metadados adicionais'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Índices da FlowBuilderSessions
    await queryInterface.addIndex('FlowBuilderSessions', ['ticketId']);
    await queryInterface.addIndex('FlowBuilderSessions', ['flowIntegrationId']);
    await queryInterface.addIndex('FlowBuilderSessions', ['companyId']);
    await queryInterface.addIndex('FlowBuilderSessions', ['status']);
    await queryInterface.addIndex('FlowBuilderSessions', ['nodeId']);
    await queryInterface.addIndex('FlowBuilderSessions', ['startedAt']);
    await queryInterface.addIndex('FlowBuilderSessions', ['lastActivityAt']);

    // Criar tabela de Templates de Fluxos
    await queryInterface.createTable('FlowTemplates', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      flowDefinition: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Definição do fluxo em JSON'
      },
      variables: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Lista de variáveis utilizadas no fluxo'
      },
      tags: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Tags para organização'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Se o template é público para todas as empresas'
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Número de vezes que o template foi usado'
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Avaliação do template (0.00 a 5.00)'
      },
      thumbnail: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL da imagem de miniatura'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Índices da FlowTemplates
    await queryInterface.addIndex('FlowTemplates', ['name']);
    await queryInterface.addIndex('FlowTemplates', ['category']);
    await queryInterface.addIndex('FlowTemplates', ['isActive']);
    await queryInterface.addIndex('FlowTemplates', ['isPublic']);
    await queryInterface.addIndex('FlowTemplates', ['companyId']);
    await queryInterface.addIndex('FlowTemplates', ['createdBy']);
    await queryInterface.addIndex('FlowTemplates', ['usageCount']);
    await queryInterface.addIndex('FlowTemplates', ['rating']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('FlowTemplates');
    await queryInterface.dropTable('FlowBuilderSessions');
    await queryInterface.dropTable('Providers');
  }
};