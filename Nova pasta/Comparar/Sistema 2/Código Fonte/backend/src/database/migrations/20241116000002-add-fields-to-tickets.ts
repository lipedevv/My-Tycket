import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Adicionar campos à tabela Tickets para suporte a múltiplos providers
    await queryInterface.addColumn('Tickets', 'providerType', {
      type: DataTypes.ENUM('baileys', 'hub'),
      allowNull: true,
      defaultValue: 'baileys',
      comment: 'Tipo de provider do WhatsApp usado no ticket'
    });

    await queryInterface.addColumn('Tickets', 'providerId', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID específico da conexão do provider'
    });

    await queryInterface.addColumn('Tickets', 'channel', {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'whatsapp',
      comment: 'Canal de comunicação (whatsapp, instagram, facebook, etc.)'
    });

    await queryInterface.addColumn('Tickets', 'isHub', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Se o ticket usa Notifica-me Hub'
    });

    await queryInterface.addColumn('Tickets', 'hubChannelId', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID do canal no Notifica-me Hub'
    });

    // Adicionar campos para suporte a FlowBuilder
    await queryInterface.addColumn('Tickets', 'flowIntegrationId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'QueueIntegrations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID da integração de fluxo associada'
    });

    await queryInterface.addColumn('Tickets', 'isFlowActive', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Se há um fluxo ativo para este ticket'
    });

    await queryInterface.addColumn('Tickets', 'flowNodeId', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID do nó atual do fluxo'
    });

    // Adicionar campos para rastreamento avançado
    await queryInterface.addColumn('Tickets', 'originType', {
      type: DataTypes.ENUM('web', 'mobile', 'api', 'flow', 'campaign', 'import'),
      allowNull: true,
      defaultValue: 'web',
      comment: 'Origem do ticket'
    });

    await queryInterface.addColumn('Tickets', 'sourceData', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Dados da origem do ticket em JSON'
    });

    await queryInterface.addColumn('Tickets', 'interactionCount', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Número de interações no ticket'
    });

    await queryInterface.addColumn('Tickets', 'lastMessageFrom', {
      type: DataTypes.ENUM('contact', 'user', 'system', 'bot'),
      allowNull: true,
      comment: 'Quem enviou a última mensagem'
    });

    await queryInterface.addColumn('Tickets', 'priority', {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      allowNull: true,
      defaultValue: 'normal',
      comment: 'Prioridade do ticket'
    });

    // Adicionar campos para métricas de performance
    await queryInterface.addColumn('Tickets', 'firstResponseTime', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tempo da primeira resposta em segundos'
    });

    await queryInterface.addColumn('Tickets', 'averageResponseTime', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tempo médio de resposta em segundos'
    });

    await queryInterface.addColumn('Tickets', 'resolutionTime', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tempo total de resolução em segundos'
    });

    await queryInterface.addColumn('Tickets', 'satisfactionScore', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Score de satisfação (1-5)'
    });

    // Adicionar campos para integrações externas
    await queryInterface.addColumn('Tickets', 'externalId', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID em sistemas externos'
    });

    await queryInterface.addColumn('Tickets', 'externalData', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Dados de integrações externas'
    });

    await queryInterface.addColumn('Tickets', 'tags', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Tags do ticket em formato de array'
    });

    await queryInterface.addColumn('Tickets', 'metadata', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Metadados adicionais do ticket'
    });

    // Índices para os novos campos
    await queryInterface.addIndex('Tickets', ['providerType']);
    await queryInterface.addIndex('Tickets', ['providerId']);
    await queryInterface.addIndex('Tickets', ['channel']);
    await queryInterface.addIndex('Tickets', ['isHub']);
    await queryInterface.addIndex('Tickets', ['flowIntegrationId']);
    await queryInterface.addIndex('Tickets', ['isFlowActive']);
    await queryInterface.addIndex('Tickets', ['originType']);
    await queryInterface.addIndex('Tickets', ['lastMessageFrom']);
    await queryInterface.addIndex('Tickets', ['priority']);
    await queryInterface.addIndex('Tickets', ['companyId', 'providerType']);
    await queryInterface.addIndex('Tickets', ['companyId', 'channel']);
    await queryInterface.addIndex('Tickets', ['status', 'priority']);
  },

  down: async (queryInterface: QueryInterface) => {
    // Remover índices
    await queryInterface.removeIndex('Tickets', ['status', 'priority']);
    await queryInterface.removeIndex('Tickets', ['companyId', 'channel']);
    await queryInterface.removeIndex('Tickets', ['companyId', 'providerType']);
    await queryInterface.removeIndex('Tickets', ['priority']);
    await queryInterface.removeIndex('Tickets', ['lastMessageFrom']);
    await queryInterface.removeIndex('Tickets', ['originType']);
    await queryInterface.removeIndex('Tickets', ['isFlowActive']);
    await queryInterface.removeIndex('Tickets', ['flowIntegrationId']);
    await queryInterface.removeIndex('Tickets', ['isHub']);
    await queryInterface.removeIndex('Tickets', ['channel']);
    await queryInterface.removeIndex('Tickets', ['providerId']);
    await queryInterface.removeIndex('Tickets', ['providerType']);

    // Remover colunas
    await queryInterface.removeColumn('Tickets', 'metadata');
    await queryInterface.removeColumn('Tickets', 'tags');
    await queryInterface.removeColumn('Tickets', 'externalData');
    await queryInterface.removeColumn('Tickets', 'externalId');
    await queryInterface.removeColumn('Tickets', 'satisfactionScore');
    await queryInterface.removeColumn('Tickets', 'resolutionTime');
    await queryInterface.removeColumn('Tickets', 'averageResponseTime');
    await queryInterface.removeColumn('Tickets', 'firstResponseTime');
    await queryInterface.removeColumn('Tickets', 'priority');
    await queryInterface.removeColumn('Tickets', 'lastMessageFrom');
    await queryInterface.removeColumn('Tickets', 'interactionCount');
    await queryInterface.removeColumn('Tickets', 'sourceData');
    await queryInterface.removeColumn('Tickets', 'originType');
    await queryInterface.removeColumn('Tickets', 'flowNodeId');
    await queryInterface.removeColumn('Tickets', 'isFlowActive');
    await queryInterface.removeColumn('Tickets', 'flowIntegrationId');
    await queryInterface.removeColumn('Tickets', 'hubChannelId');
    await queryInterface.removeColumn('Tickets', 'isHub');
    await queryInterface.removeColumn('Tickets', 'channel');
    await queryInterface.removeColumn('Tickets', 'providerId');
    await queryInterface.removeColumn('Tickets', 'providerType');
  }
};