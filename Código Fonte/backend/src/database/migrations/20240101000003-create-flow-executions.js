'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FlowExecutions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      flowId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Flows',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ticketId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      contactId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Contacts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      status: {
        type: Sequelize.ENUM('running', 'completed', 'failed', 'stopped', 'timeout'),
        defaultValue: 'running',
        allowNull: false
      },
      currentNodeId: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      context: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      },
      variables: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      },
      history: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      executionTime: {
        type: Sequelize.INTEGER,
        allowNull: true, // em milisegundos
        defaultValue: 0
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      startedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      sessionId: {
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

    await queryInterface.addIndex('FlowExecutions', ['flowId']);
    await queryInterface.addIndex('FlowExecutions', ['ticketId']);
    await queryInterface.addIndex('FlowExecutions', ['contactId']);
    await queryInterface.addIndex('FlowExecutions', ['companyId']);
    await queryInterface.addIndex('FlowExecutions', ['status']);
    await queryInterface.addIndex('FlowExecutions', ['startTime']);
    await queryInterface.addIndex('FlowExecutions', ['sessionId']);
    await queryInterface.addIndex('FlowExecutions', ['currentNodeId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FlowExecutions');
  }
};