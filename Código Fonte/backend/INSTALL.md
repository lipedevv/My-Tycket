# 🚀 Instalação Segura - WhatsApp Dual Provider com FlowBuilder

## ⚠️ AVISO IMPORTANTE: USE O INSTALADOR SEGURO!

**NÃO USE** o comando original que pode quebrar sistemas existentes!

### ❌ COMANDO PERIGOSO (NÃO USE):
```bash
# NÃO FAÇA ISSO - PODE QUEBRAR SISTEMA EXISTENTE!
sudo bash -c "apt update && apt upgrade -y && apt install sudo git -y && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```

## ✅ COMANDO SEGURO (USE ESTE):

### Opção 1: Instalação Nova (Segura)
```bash
# Clonar repositório seguro
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2

# Usar instalador seguro
cd Sistema2/Instalador
chmod +x install_safe_ubuntu22
./install_safe_ubuntu22
```

### Opção 2: Atualizar Existente (Seguro)
```bash
# Para sistema já existente
cd /caminho/do/sistema/Instalador

# Verificar compatibilidade primeiro
node ../backend/scripts/install-safety-check.js

# Se tudo OK, usar instalador seguro
chmod +x install_safe_ubuntu22
./install_safe_ubuntu22
```

### Opção 3: Docker (Mais Seguro Ainda)
```bash
# Usar Docker containers
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2
cd Sistema2

# Ambiente desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Produção
docker-compose up -d
```

## 🛡️ Diferenças do Instalador Seguro

### ✅ **Instalador Seguro** (`install_safe_ubuntu22`):
- 🔍 Detecta instalação existente
- 💾 Cria backup automático completo
- ❓ Pede confirmação antes de prosseguir
- 🔄 Faz rollback automático se houver problemas
- ✅ Preserva 100% dos dados existentes
- 📋 Valida compatibilidade de sistema
- 📊 Gera relatório detalhado

### ❌ **Instalador Original** (`install_ubuntu22`):
- ⚠️ Não detecta sistema existente
- ❌ Pode sobreescrever database
- ❌ Sem backup automático
- ❌ Não permite cancelamento
- ⚠️ Risco de perda de dados

## 📋 Verificação Pré-Instalação

Antes de instalar, execute a verificação:

```bash
# Clonar repositório
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2
cd Sistema2/backend

# Executar verificação de segurança
npm install
npm run safety-check
```

Isso irá analisar:
- ✅ Estrutura do database existente
- ✅ Compatibilidade de tipos de dados
- ✅ Recursos do sistema
- ✅ Conflitos potenciais
- ✅ Gerar relatório de segurança

## 🔧 Recuperação de Dados

Se algo der errado, use os scripts de recuperação:

```bash
# Recuperar do backup automático
cd /home/deploy/NOME_INSTANCIA
./scripts/backup-restore.sh

# Ou restaurar manualmente
sudo -u postgres createdb whaticket_plus_restored
gunzip -c /tmp/backup_*.sql.gz | sudo -u postgres psql whaticket_plus_restored
```

## 🚀 Comandos de Instalação

### Instalação Completa (Segura):
```bash
# 1. Atualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependências
sudo apt install -y curl git wget gnupg2 build-essential

# 3. Clonar repositório
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2

# 4. Verificar segurança
cd Sistema2/backend
npm install
npm run safety-check

# 5. Instalar (comando seguro)
cd ../Instalador
chmod +x install_safe_ubuntu22
./install_safe_ubuntu22
```

### Docker (Recomendado):
```bash
# 1. Clonar
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2

# 2. Subir para o diretório
cd Sistema2

# 3. Verificar compatibilidade
cd backend
npm install
npm run safety-check

# 4. Iniciar com Docker
cd ..
docker-compose up -d

# 5. Acessar o sistema
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
# API Docs: http://localhost:8080/api-docs
```

## 🔍 Pós-Instalação

Após a instalação, verifique se está tudo funcionando:

```bash
# Verificar status dos serviços
pm2 status

# Verificar health check
curl http://localhost:8080/health

# Verificar logs
pm2 logs whaticketplus

# Executar testes
npm run test
```

## 📋 Estrutura de Arquivos

Após instalação segura:

```
/home/deploy/NOME_DA_INSTANCIA/
├── backend/
│   ├── .env (configurações)
│   ├── dist/ (código compilado)
│   ├── logs/ (logs de erros)
│   └── uploads/ (arquivos upload)
├── frontend/
│   ├── build/ (código compilado)
│   └── public/ (arquivos estáticos)
├── scripts/
│   ├── fix_frontend.sh
│   ├── backup-restore.sh
│   └── safety-check.sh
├── nginx/
│   └── sites-available/ (config NGINX)
└── docker-compose.yml (configuração Docker)
```

## ⚡ Recursos do Sistema

### URLs de Acesso:
- **Frontend**: `http://SEU_DOMÍNIO`
- **Backend API**: `http://SEU_DOMÍNIO:8080`
- **Documentação API**: `http://SEU_DOMÍNIO:8080/api-docs`
- **Admin WhatsApp**: `http://SEU_DOMÍNIO:8080`

### Funcionalidades Habilitadas:
- ✅ Dual Provider (Baileys + Notifica-me Hub)
- ✅ FlowBuilder visual automation
- ✅ Feature flags controlado
- ✅ Real-time WebSocket
- ✅ Analytics avançado
- ✅ API REST completa
- ✅ Docker deployment

## 🎯 Comandos Úteis

### Gerenciamento:
```bash
# Parar aplicação
pm2 stop whaticketplus

# Iniciar aplicação
pm2 start whaticketplus

# Reiniciar aplicação
pm2 restart whaticketplus

# Verificar logs
pm2 logs whaticketplus
pm2 logs whaticketplus --err
```

### Database:
```bash
# Criar migration
npm run db:migration

# Executar seeders
npm run db:seed

# Verificar migrações
npm run db:migrate:undo
```

### Desenvolvimento:
```bash
# Iniciar em modo desenvolvimento
npm run dev

# Executar testes
npm run test

# Verificar cobertura
npm run test:coverage
```

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs completos:**
   ```bash
   pm2 logs whaticketplus --lines 100
   ```

2. **Verificar status do sistema:**
   ```bash
   cd backend
   npm run health-check
   ```

3. **Executar diagnóstico:**
   ```bash
   npm run diagnose
   ```

---

## 🛡️ LEMBRE-SE: **SEMPRE USE O INSTALADOR SEGURO!**

O instalador seguro garante que seu sistema existente não será afetado, criando backups e permitindo rollback automático se necessário.