'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Verificar se FlowProviders já existe
    const tableExists = await queryInterface.describeTable('Flows');

    if (tableExists) {
      // 2. Adicionar colunas para dual provider integration
      try {
        await queryInterface.addColumn('Flows', 'whatsappProviderId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'WhatsAppProviders',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      } catch (error) {
        console.log('Column whatsappProviderId already exists');
      }

      try {
        await queryInterface.addColumn('Flows', 'providerType', {
          type: Sequelize.ENUM('baileys', 'hub', 'auto'),
          defaultValue: 'auto',
          allowNull: false
        });
      } catch (error) {
        console.log('Column providerType already exists');
      }

      // 3. Adicionar colunas para feature flags
      try {
        await queryInterface.addColumn('Flows', 'featureFlags', {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
        });
      } catch (error) {
        console.log('Column featureFlags already exists');
      }

      // 4. Adicionar performance indexes
      try {
        await queryInterface.addIndex('Flows', ['companyId', 'isActive', 'isPublished']);
        await queryInterface.addIndex('Flows', ['triggerType', 'isActive']);
        await queryInterface.addIndex('Flows', ['category', 'priority']);
        await queryInterface.addIndex('Flows', ['whatsappProviderId']);
      } catch (error) {
        console.log('Indexes already exist');
      }
    }

    // 5. Update existing Flows to work with new provider system
    try {
      await queryInterface.bulkUpdate('Flows', {
        providerType: 'baileys',
        featureFlags: JSON.stringify({})
      }, {
        providerType: null
      });
    } catch (error) {
      console.log('Flows already updated');
    }

    // 6. Create junction table for Flow-Provider relationship
    try {
      await queryInterface.createTable('FlowProviders', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
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
        providerId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'WhatsAppProviders',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        priority: {
          type: Sequelize.INTEGER,
          defaultValue: 1,
          allowNull: false
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

      await queryInterface.addIndex('FlowProviders', ['flowId']);
      await queryInterface.addIndex('FlowProviders', ['providerId']);
      await queryInterface.addIndex('FlowProviders', ['isActive', 'priority']);
    } catch (error) {
      console.log('FlowProviders table already exists');
    }

    // 7. Update Tickets table for flow integration
    try {
      await queryInterface.addColumn('Tickets', 'flowExecutionId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'FlowExecutions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (error) {
      console.log('Column flowExecutionId already exists');
    }

    // 8. Create FlowMetrics table for analytics
    try {
      await queryInterface.createTable('FlowMetrics', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
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
        companyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Companies',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        totalExecutions: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        successfulExecutions: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        failedExecutions: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        averageExecutionTime: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        metrics: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
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

      await queryInterface.addIndex('FlowMetrics', ['flowId']);
      await queryInterface.addIndex('FlowMetrics', ['companyId']);
      await queryInterface.addIndex('FlowMetrics', ['date']);
      await queryInterface.addIndex('FlowMetrics', ['flowId', 'date']);
    } catch (error) {
      console.log('FlowMetrics table already exists');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback changes
    try {
      await queryInterface.dropTable('FlowMetrics');
    } catch (error) {}

    try {
      await queryInterface.dropTable('FlowProviders');
    } catch (error) {}

    try {
      await queryInterface.removeColumn('Tickets', 'flowExecutionId');
    } catch (error) {}

    try {
      await queryInterface.removeIndex('Flows', ['whatsappProviderId']);
      await queryInterface.removeIndex('Flows', ['companyId', 'isActive', 'isPublished']);
      await queryInterface.removeIndex('Flows', ['triggerType', 'isActive']);
      await queryInterface.removeIndex('Flows', ['category', 'priority']);
    } catch (error) {}

    try {
      await queryInterface.removeColumn('Flows', 'featureFlags');
    } catch (error) {}

    try {
      await queryInterface.removeColumn('Flows', 'providerType');
    } catch (error) {}

    try {
      await queryInterface.removeColumn('Flows', 'whatsappProviderId');
    } catch (error) {}
  }
};