'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Flows', {
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true
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
      nodes: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      edges: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      isPublished: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('welcome', 'support', 'sales', 'marketing', 'feedback', 'other'),
        defaultValue: 'other',
        allowNull: false
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      triggerType: {
        type: Sequelize.ENUM('keyword', 'media', 'always', 'schedule', 'webhook', 'manual'),
        defaultValue: 'manual',
        allowNull: false
      },
      triggerConfig: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    await queryInterface.addIndex('Flows', ['companyId']);
    await queryInterface.addIndex('Flows', ['isActive']);
    await queryInterface.addIndex('Flows', ['isPublished']);
    await queryInterface.addIndex('Flows', ['category']);
    await queryInterface.addIndex('Flows', ['triggerType']);
    await queryInterface.addIndex('Flows', ['createdBy']);
    await queryInterface.addIndex('Flows', ['name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Flows');
  }
};