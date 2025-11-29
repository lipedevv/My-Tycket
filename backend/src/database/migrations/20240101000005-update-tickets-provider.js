'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar colunas na tabela Tickets
    await queryInterface.addColumn('Tickets', 'whatsappProviderId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'WhatsAppProviders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Tickets', 'channel', {
      type: Sequelize.ENUM('whatsapp', 'instagram', 'facebook', 'telegram', 'web', 'email'),
      defaultValue: 'whatsapp',
      allowNull: false
    });

    await queryInterface.addColumn('Tickets', 'flowId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Flows',
        key: 'id'
      },
      onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Tickets', 'isFlowActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('Tickets', 'lastFlowExecutionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'FlowExecutions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Adicionar colunas na tabela WhatsAppMessages
    await queryInterface.addColumn('WhatsAppMessages', 'whatsappProviderId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'WhatsAppProviders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('WhatsAppMessages', 'messageType', {
      type: Sequelize.ENUM('text', 'image', 'video', 'audio', 'document', 'contact', 'location', 'interactive', 'template', 'unknown'),
      defaultValue: 'text',
      allowNull: false
    });

    await queryInterface.addColumn('WhatsAppMessages', 'messageId', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('WhatsAppMessages', 'status', {
      type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    });

    await queryInterface.addColumn('WhatsAppMessages', 'direction', {
      type: Sequelize.ENUM('in', 'out'),
      allowNull: false
    });

    // Adicionar índices
    await queryInterface.addIndex('Tickets', ['whatsappProviderId']);
    await queryInterface.addIndex('Tickets', ['channel']);
    await queryInterface.addIndex('Tickets', ['flowId']);
    await queryInterface.addIndex('Tickets', ['isFlowActive']);
    await queryInterface.addIndex('WhatsAppMessages', ['whatsappProviderId']);
    await queryInterface.addIndex('WhatsAppMessages', ['messageType']);
    await queryInterface.addIndex('WhatsAppMessages', ['status']);
    await queryInterface.addIndex('WhatsAppMessages', ['direction']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices
    await queryInterface.removeIndex('Tickets', ['whatsappProviderId']);
    await queryInterface.removeIndex('Tickets', ['channel']);
    await queryInterface.removeIndex('Tickets', ['flowId']);
    await queryInterface.removeIndex('Tickets', ['isFlowActive']);
    await queryInterface.removeIndex('WhatsAppMessages', ['whatsappProviderId']);
    await queryInterface.removeIndex('WhatsAppMessages', ['messageType']);
    await queryInterface.removeIndex('WhatsAppMessages', ['status']);
    await queryInterface.removeIndex('WhatsAppMessages', ['direction']);

    // Remover colunas da tabela Tickets
    await queryInterface.removeColumn('Tickets', 'lastFlowExecutionId');
    await queryInterface.removeColumn('Tickets', 'isFlowActive');
    await queryInterface.removeColumn('Tickets', 'flowId');
    await queryInterface.removeColumn('Tickets', 'channel');
    await queryInterface.removeColumn('Tickets', 'whatsappProviderId');

    // Remover colunas da tabela WhatsAppMessages
    await queryInterface.removeColumn('WhatsAppMessages', 'direction');
    await queryInterface.removeColumn('WhatsAppMessages', 'status');
    await queryInterface.removeColumn('WhatsAppMessages', 'messageId');
    await queryInterface.removeColumn('WhatsAppMessages', 'messageType');
    await queryInterface.removeColumn('WhatsAppMessages', 'whatsappProviderId');
  }
};