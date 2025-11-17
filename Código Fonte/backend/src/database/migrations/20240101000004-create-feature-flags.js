'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FeatureFlags', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      rolloutPercentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: 0,
          max: 100
        }
      },
      targetCompanies: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      targetUsers: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      conditions: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
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

    await queryInterface.createTable('FeatureFlagUsages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      featureFlagId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'FeatureFlags',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      companyId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      wasEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      context: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Inserir flags padrão
    await queryInterface.bulkInsert('FeatureFlags', [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        key: 'WHATSAPP_DUAL_PROVIDER',
        name: 'WhatsApp Dual Provider',
        description: 'Habilita uso de múltiplos providers (Baileys + Hub)',
        isEnabled: false,
        rolloutPercentage: 0,
        targetCompanies: [],
        targetUsers: [],
        conditions: {},
        metadata: {
          category: 'whatsapp',
          priority: 'high'
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        key: 'FLOWBUILDER_ENABLED',
        name: 'FlowBuilder Automation',
        description: 'Habilita sistema visual de automação conversacional',
        isEnabled: false,
        rolloutPercentage: 0,
        targetCompanies: [],
        targetUsers: [],
        conditions: {},
        metadata: {
          category: 'automation',
          priority: 'high'
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        key: 'HUB_PROVIDER_ENABLED',
        name: 'Notifica-me Hub Provider',
        description: 'Habilita integração com Notifica-me Hub API',
        isEnabled: false,
        rolloutPercentage: 0,
        targetCompanies: [],
        targetUsers: [],
        conditions: {},
        metadata: {
          category: 'whatsapp',
          priority: 'medium'
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await queryInterface.addIndex('FeatureFlags', ['key']);
    await queryInterface.addIndex('FeatureFlags', ['isEnabled']);
    await queryInterface.addIndex('FeatureFlags', ['isActive']);
    await queryInterface.addIndex('FeatureFlagUsages', ['featureFlagId']);
    await queryInterface.addIndex('FeatureFlagUsages', ['companyId']);
    await queryInterface.addIndex('FeatureFlagUsages', ['userId']);
    await queryInterface.addIndex('FeatureFlagUsages', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FeatureFlagUsages');
    await queryInterface.dropTable('FeatureFlags');
  }
};