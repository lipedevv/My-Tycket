'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('WhatsAppProviders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      provider: {
        type: Sequelize.ENUM('baileys', 'hub'),
        allowNull: false
      },
      companyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      instanceId: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      config: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      status: {
        type: Sequelize.ENUM('connected', 'disconnected', 'connecting', 'error'),
        defaultValue: 'disconnected',
        allowNull: false
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      statusReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      qrCode: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lastStatusUpdate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      webhookUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      webhookSecret: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('WhatsAppProviders', ['companyId']);
    await queryInterface.addIndex('WhatsAppProviders', ['provider']);
    await queryInterface.addIndex('WhatsAppProviders', ['status']);
    await queryInterface.addIndex('WhatsAppProviders', ['isDefault']);
    await queryInterface.addIndex('WhatsAppProviders', ['instanceId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('WhatsAppProviders');
  }
};