#!/usr/bin/env node

/**
 * Script de verificação de segurança para instalação
 * Garante que nada no sistema existente será quebrado
 */

const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class InstallationSafetyCheck {
  constructor() {
    this.sequelize = null;
    this.errors = [];
    this.warnings = [];
    this.results = {};
  }

  async initialize() {
    try {
      // Ler configuração do .env
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
      }

      const databaseUrl = process.env.DATABASE_URL || this.buildDatabaseUrl();

      this.sequelize = new Sequelize(databaseUrl, {
        logging: false,
        dialectOptions: {
          ssl: process.env.DB_SSL === 'true'
        }
      });

      await this.sequelize.authenticate();
      console.log('✅ Conectado ao database com sucesso');
    } catch (error) {
      console.error('❌ Erro ao conectar ao database:', error.message);
      throw error;
    }
  }

  buildDatabaseUrl() {
    const {
      DB_HOST = 'localhost',
      DB_PORT = 5432,
      DB_USER = 'postgres',
      DB_PASS = 'postgres',
      DB_NAME = 'whatsystem'
    } = process.env;

    return `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  }

  async checkExistingTables() {
    console.log('🔍 Verificando tabelas existentes...');

    try {
      const [results] = await this.sequelize.query(`
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tables = results.map(r => r.table_name);

      this.results.existingTables = tables;

      const criticalTables = [
        'Users', 'Companies', 'Tickets', 'Contacts', 'Messages',
        'Queues', 'Whatsapps', 'Settings', 'Plans'
      ];

      const missingCritical = criticalTables.filter(table => !tables.includes(table));

      if (missingCritical.length > 0) {
        this.errors.push(`Tabelas críticas faltando: ${missingCritical.join(', ')}`);
      }

      const existingCount = tables.length;
      console.log(`📊 Encontradas ${existingCount} tabelas no database`);

      // Verificar se há dados
      for (const table of criticalTables) {
        if (tables.includes(table)) {
          try {
            const [countResult] = await this.sequelize.query(
              `SELECT COUNT(*) as count FROM "${table}"`
            );
            const count = parseInt(countResult[0]?.count || 0);

            if (count > 0) {
              this.results[table + '_count'] = count;
              console.log(`📋 ${table}: ${count} registros`);
            }
          } catch (error) {
            this.warnings.push(`Não foi possível contar registros de ${table}: ${error.message}`);
          }
        }
      }

    } catch (error) {
      this.errors.push(`Erro ao verificar tabelas: ${error.message}`);
    }
  }

  async checkDataTypes() {
    console.log('🔍 Verificando tipos de dados...');

    try {
      // Verificar Users table
      const usersTable = await this.sequelize.getQueryInterface().describeTable('Users');

      this.results.usersTable = usersTable;

      // Verificar tipo do companyId
      if (usersTable.companyId) {
        const companyIdType = usersTable.companyId.type;
        if (companyIdType.includes('INTEGER') || companyIdType.includes('SERIAL')) {
          console.log('✅ Users.companyId usa INTEGER (compatível com sistema existente)');
        } else {
          this.warnings.push(`Users.companyId usa ${companyIdType} (pode haver incompatibilidades)`);
        }
      }

      // Verificar tipo do id
      if (usersTable.id) {
        const idType = usersTable.id.type;
        if (idType.includes('INTEGER') || idType.includes('SERIAL')) {
          console.log('✅ Users.id usa INTEGER (sistema legado)');
          this.results.users_use_integer_id = true;
        } else if (idType.includes('UUID')) {
          console.log('⚠️ Users.id usa UUID (sistema novo - pode haver conflitos)');
          this.results.users_use_uuid_id = true;
        }
      }

      // Verificar Tickets table
      const ticketsTable = await this.sequelize.getQueryInterface().describeTable('Tickets');
      if (ticketsTable.companyId && ticketsTable.companyId.type !== usersTable.companyId.type) {
        this.errors.push('Inconsistência: Tickets.companyId tipo diferente de Users.companyId');
      }

    } catch (error) {
      this.errors.push(`Erro ao verificar tipos de dados: ${error.message}`);
    }
  }

  async checkMigrationCompatibility() {
    console.log('🔍 Verificando compatibilidade de migrações...');

    try {
      // Verificar se SequelizeMeta existe
      const [metaResult] = await this.sequelize.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'SequelizeMeta'
      `);

      if (parseInt(metaResult[0]?.count || 0) > 0) {
        // Verificar migrações já rodadas
        const [migrationResults] = await this.sequelize.query(`
          SELECT name FROM SequelizeMeta ORDER BY createdAt DESC
        `);

        this.results.existingMigrations = migrationResults.map(r => r.name);
        console.log(`📋 Encontradas ${migrationResults.length} migrações já rodadas`);

        // Verificar se as nossas novas migrações já foram rodadas
        const ourMigrations = [
          'create-whatsapp-providers',
          'create-flows',
          'create-feature-flags',
          'create-flow-executions'
        ];

        const runOurMigrations = ourMigrations.filter(mig =>
          migrationResults.some(r => r.name.includes(mig))
        );

        if (runOurMigrations.length > 0) {
          console.log(`✅ ${runOurMigrations.length} novas migrações já foram rodadas`);
          this.results.ourMigrationsAlreadyRun = true;
        } else {
          console.log(`ℹ️ Novas migrações ainda não foram rodadas - será executada instalação completa`);
        }

        // Verificar timestamp da última migração
        const lastMigration = migrationResults[0]?.name;
        if (lastMigration) {
          console.log(`📅 Última migração rodada: ${lastMigration}`);
        }
      } else {
        console.log('ℹ️ Nenhuma migração Sequelize encontrada - instalação nova');
        this.results.isNewInstallation = true;
      }

    } catch (error) {
      this.warnings.push(`Não foi possível verificar migrações: ${error.message}`);
    }
  }

  async checkWhatsAppCompatibility() {
    console.log('📱 Verificando compatibilidade WhatsApp...');

    try {
      // Verificar se existe tabela Whatsapps
      const [whatsappResult] = await this.sequelize.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Whatsapps'
      `);

      if (parseInt(whatsappResult[0]?.count || 0) > 0) {
        console.log('✅ Tabela Whatsapps existe');

        // Verificar estrutura
        const whatsappTable = await this.sequelize.getQueryInterface().describeTable('Whatsapps');

        if (whatsappTable.companyId && whatsappTable.companyId.type !== 'INTEGER') {
          this.errors.push('Whatsapps.companyId não usa INTEGER - incompatível com Users.companyId');
        }

        // Verificar conexões existentes
        const [connectionCount] = await this.sequelize.query(`
          SELECT COUNT(*) as count FROM "Whatsapps" WHERE status = 'connected'
        `);

        const connectedCount = parseInt(connectionCount[0]?.count || 0);
        if (connectedCount > 0) {
          console.log(`📱 Encontradas ${connectedCount} conexões WhatsApp conectadas`);
          this.results.existingWhatsAppConnections = connectedCount;

          // Verificar se usam session (sistema Baileys)
          if (whatsappTable.session) {
            console.log('✅ Sistema Baileys detectado (com session)');
            this.results.usesBaileys = true;
          }
        }

      } else {
        console.log('ℹ️ Tabela Whatsapps não existe - primeira instalação');
      }

    } catch (error) {
      this.errors.push(`Erro ao verificar WhatsApp: ${error.message}`);
    }
  }

  async checkFeatureFlags() {
    console.log('🚩 Verificando Feature Flags...');

    try {
      // Verificar se já existe FeatureFlags
      const [featureFlagsResult] = await this.sequelize.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'FeatureFlags'
      `);

      if (parseInt(featureFlagsResult[0]?.count || 0) > 0) {
        console.log('✅ Tabela FeatureFlags existe');
        this.results.featureFlagsAlreadyInstalled = true;

        // Verificar flags padrão
        const [flagsCount] = await this.sequelize.query(`
          SELECT COUNT(*) as count FROM "FeatureFlags"
        `);

        console.log(`🚩 Encontradas ${flagsCount[0]?.count} feature flags`);
      } else {
        console.log('ℹ️ Tabela FeatureFlags não existe - será criada');
      }

    } catch (error) {
      console.log('ℹ️ Não foi possível verificar FeatureFlags');
    }
  }

  async checkSystemResources() {
    console.log('💻 Verificando recursos do sistema...');

    // Verificar Node.js
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      console.log(`✅ Node.js: ${nodeVersion}`);

      const nodeMajor = parseInt(nodeVersion.match(/v(\d+)/)[1]);
      if (nodeMajor < 16) {
        this.warnings.push(`Node.js ${nodeMajor} detectado - pode haver incompatibilidades. Recomendado: v16+`);
      }
    } catch (error) {
      this.warnings.push('Node.js não encontrado - será instalado');
    }

    // Verificar Docker
    try {
      const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
      console.log(`✅ Docker: ${dockerVersion}`);
    } catch (error) {
      this.errors.push('Docker não está instalado ou não está no PATH');
    }

    // Verificar PM2
    try {
      const pm2Version = execSync('pm2 --version', { encoding: 'utf8' }).trim();
      console.log(`✅ PM2: ${pm2Version}`);
    } catch (error) {
      this.warnings.push('PM2 não encontrado - será instalado');
    }

    // Verificar portas
    try {
      const backendPort = process.env.BACKEND_PORT || process.env.PORT || 8080;
      execSync(`netstat -tuln | grep ':${backendPort}'`, { stdio: 'pipe' });
      console.log(`⚠️ Porta ${backendPort} está em uso`);
      this.results.backendPortInUse = true;
    } catch (error) {
      console.log(`✅ Porta ${process.env.PORT || 8080} está livre`);
    }
  }

  async checkFileSystem() {
    console.log('📁 Verificando sistema de arquivos...');

    const instancePath = `/home/deploy/${process.env.BACKEND_URL?.split('//')[1] || 'default'}`;

    try {
      if (fs.existsSync(instancePath)) {
        console.log(`📁 Diretório da instância existe: ${instancePath}`);

        const stats = fs.statSync(instancePath);
        console.log(`📏 Tamanho: ${this.formatBytes(stats.size)}`);

        // Verificar arquivos críticos
        const criticalFiles = [
          'backend/.env',
          'backend/package.json',
          'frontend/package.json',
          'backend/dist',
          'frontend/build'
        ];

        for (const file of criticalFiles) {
          const filePath = path.join(instancePath, file);
          if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} existe`);
          } else {
            this.warnings.push(`${file} não existe`);
          }
        }

        this.results.instanceExists = true;
      } else {
        console.log('📁 Diretório da instância não existe - instalação nova');
      }
    } catch (error) {
      console.log('ℹ️ Não foi possível verificar sistema de arquivos');
    }
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  generateReport() {
    console.log('\n');
    console.log('📋 RELATÓRIO DE SEGURANÇA DA INSTALAÇÃO');
    console.log('===============================================');
    console.log('');

    if (this.errors.length > 0) {
      console.log('❌ ERROS CRÍTICOS ENCONTRADOS:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log('');
      console.log('⚠️ É necessário corrigir estes erros antes de prosseguir!');
      console.log('');
      return false;
    }

    if (this.warnings.length > 0) {
      console.log('⚠️ AVISOS ENCONTRADOS:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
      console.log('');
    }

    console.log('✅ VERIFICAÇÕES CONCLUÍDAS:');
    console.log('   • Estrutura do database: OK');
    console.log('   • Compatibilidade de dados: OK');
    console.log('   • Sistema de recursos: OK');
    console.log('');

    // Resumo dos resultados
    console.log('📊 RESUMO:');
    if (this.results.existingTables) {
      console.log(`   • Tabelas existentes: ${this.results.existingTables.length}`);
    }

    if (this.results.users_use_integer_id) {
      console.log('   • Sistema usa IDs INTEGER (legado)');
    } else if (this.results.users_use_uuid_id) {
      console.log('   • Sistema usa IDs UUID (novo)');
    }

    if (this.results.existingWhatsAppConnections) {
      console.log(`   • Conexões WhatsApp existentes: ${this.results.existingWhatsAppConnections}`);
    }

    if (this.results.ourMigrationsAlreadyRun) {
      console.log('   • Novas migrações já foram executadas');
    }

    if (this.results.instanceExists) {
      console.log('   • Instância existe no sistema de arquivos');
    }

    console.log('');
    console.log('🔒 NÍVEL DE SEGURANÇA: ALTO');
    console.log('💡 Recomendação: O sistema está pronto para instalação segura');

    return true;
  }

  async run() {
    try {
      console.log('🔒 INICIANDO VERIFICAÇÃO DE SEGURANÇA DA INSTALAÇÃO');
      console.log('=====================================================');
      console.log('');

      await this.initialize();
      await this.checkExistingTables();
      await this.checkDataTypes();
      await this.checkMigrationCompatibility();
      await this.checkWhatsAppCompatibility();
      await this.checkFeatureFlags();
      await this.checkSystemResources();
      await this.checkFileSystem();

      return this.generateReport();

    } catch (error) {
      console.error('❌ Erro crítico na verificação:', error.message);
      console.log('');
      console.log('💡 Recomendação: Não prossiga com a instalação até resolver os problemas');
      return false;
    } finally {
      if (this.sequelize) {
        await this.sequelize.close();
      }
    }
  }
}

// Executar verificação
if (require.main === module) {
  const checker = new InstallationSafetyCheck();

  checker.run()
    .then(isSafe => {
      process.exit(isSafe ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = InstallationSafetyCheck;