# 🚀 My-Tycket v28.0.0 - WhatsApp Dual Provider com FlowBuilder

**📅 Última Atualização: 17/11/2025 - Instalação 100% Funcional**

## ⚠️ **AVISO CRÍTICO DE SEGURANÇA - INSTALAÇÃO SEGURA**

**NÃO USE** o comando original que pode quebrar sistemas existentes!

### ❌ **COMANDO PERIGOSO (NÃO USE):**
```bash
# ❌ NÃO FAÇA ISSO - PODE QUEBRAR SISTEMA EXISTENTE!
sudo bash -c "apt update && apt upgrade -y && apt install sudo git -y && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```

### ✅ **COMANDO SEGURO (USE ESTE):**
```bash
# ✅ INSTALAÇÃO SEGURA - CÓDIGO CORRIGIDO E FUNCIONAL
sudo bash -c "apt update && apt install -y sudo git curl nodejs npm && ([ ! -d 'whaticketplus' ] || mv whaticketplus whaticketplus_backup_$(date +%Y%m%d_%H%M%S)) && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```

**OU (versão simplificada):**
```bash
sudo bash -c "apt update && apt install -y sudo git curl nodejs npm && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```

### 📝 **Informações Importantes:**
- ✅ **Código Corrigido**: Todas as correções já estão aplicadas no repositório
- ✅ **Instalação 100% Funcional**: Backend e frontend instalam sem erros
- ✅ **Backup Automático**: Primeira opção preserva instalações existentes
- ✅ **Dependencies**: Instala automaticamente Node.js, Docker, PostgreSQL, Redis

## 📋 **Tabela de Conteúdo**

- [Sobre o Sistema](#-sobre-o-sistema)
- [Instalação Segura](#-instalação-segura)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Docker](#-docker)
- [Suporte](#-suporte)

## 🌟 **Sobre o Sistema**

**My-Tycket v28.0.0** é a plataforma mais completa de atendimento multicanal, combinando:

- **🔄 Dual Provider**: WhatsApp Web (Baileys) + WhatsApp Official API (Notifica-me Hub)
- **🎯 FlowBuilder**: Automação visual de fluxos com arrastar e soltar
- **📱 Omnichannel**: Suporte para 12+ canais de comunicação
- **🚀 Feature Flags**: Controle granular de funcionalidades
- **🛡️ Zero-Break Migration**: Atualizações sem quebrar sistemas existentes

### 🏆 **Melhorias da v28.0.0**

- ✅ **Dual Provider Architecture**: Escolha entre gratuito e oficial
- ✅ **Visual FlowBuilder**: Editor visual com 18+ tipos de nós
- ✅ **Real-time Analytics**: Dashboard de métricas em tempo real
- ✅ **REST API Completa**: 50+ endpoints para integração
- ✅ **Safe Installer**: Instalação 100% segura com rollback
- ✅ **Docker Ready**: Containerização completa
- ✅ **TypeScript**: Type safety e melhor DX

## 🔧 **Instalação Segura**

### Pré-requisitos

- **Ubuntu 22.04 LTS** ou superior
- **4GB RAM** mínimo (8GB recomendado)
- **2 CPU cores** mínimo (4 recomendado)
- **20GB storage** SSD recomendado
- **Docker & Docker Compose** (opcional)

### Opção 1: Instalação Segura (Recomendado)

```bash
# 1. Clonar repositório
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2

# 2. Acessar instalador seguro
cd Sistema2/Instalador

# 3. Tornar executável
chmod +x install_safe_ubuntu22

# 4. Executar instalação segura
./install_safe_ubuntu22
```

### Opção 2: Docker (Mais Seguro)

```bash
# 1. Clonar repositório
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2

# 2. Acessar diretório
cd Sistema2

# 3. Verificar compatibilidade
cd backend
npm install
npm run safety-check

# 4. Iniciar Docker
cd ..
docker-compose up -d
```

### Opção 3: Atualizar Sistema Existente (Seguro)

```bash
# 1. Acessar sistema existente
cd /caminho/do/sistema/Instalador

# 2. Verificar compatibilidade
node ../backend/scripts/install-safety-check.js

# 3. Se tudo OK, usar instalador seguro
chmod +x install_safe_ubuntu22
./install_safe_ubuntu22
```

## 🏗️ **Arquitetura**

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   FlowBuilder │ │  Dashboard  │ │   Settings  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Controllers │ │   Services  │ │   Models    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                              │                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Provider Manager                        │   │
│  │  ┌─────────────┐            ┌─────────────┐          │   │
│  │  │   Baileys   │            │  Hub API    │          │   │
│  │  │ (WhatsApp   │            │ (Official)  │          │   │
│  │  │     Web)    │            │             │          │   │
│  │  └─────────────┘            └─────────────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ PostgreSQL  │ │    Redis    │ │    File     │           │
│  │   (Dados)   │ │   (Cache)   │ │  Storage)   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## ⚡ **Funcionalidades**

### 🔄 **Dual Provider System**

| Característica | Baileys (Grátis) | Hub API (Pago) |
|---------------|------------------|----------------|
| Tipo | WhatsApp Web | Official API |
| Custo | Grátis | Pago por mensagem |
| Confiabilidade | Média | Alta |
| Rate Limit | Limitado | Ilimitado |
| Recursos | Básicos | Completo |
| Suporte | Comunidade | 24/7 |

### 🎯 **FlowBuilder Visual**

- **18+ Tipos de Nós**:
  - ✅ Start/End
  - ✅ Send Message/Media
  - ✅ Condition/Menu
  - ✅ API Call/Webhook
  - ✅ Delay/Variable
  - ✅ Validation/Queue
  - ✅ Human Handoff
  - ✅ Analytics/Tag

- **Recursos Avançados**:
  - ✅ Drag & Drop Interface
  - ✅ Real-time Preview
  - ✅ Flow Testing
  - ✅ Analytics Dashboard
  - ✅ Import/Export
  - ✅ Version Control

### 📱 **Omnichannel Support**

- WhatsApp (Baileys + Official)
- Instagram Direct
- Facebook Messenger
- Telegram
- SMS
- Email
- Web Chat
- Apple Business Chat
- Google RCS
- Line
- WeChat
- Viber

## 📚 **API Documentation**

### Authentication

```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'
```

### FlowBuilder API

#### Criar Flow

```bash
curl -X POST http://localhost:8080/flows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Flow",
    "description": "Auto welcome message",
    "nodes": [...],
    "edges": [...]
  }'
```

#### Testar Flow

```bash
curl -X POST http://localhost:8080/flows/{id}/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "123",
    "message": "hello"
  }'
```

### WhatsApp Provider API

#### Configurar Provider

```bash
curl -X POST http://localhost:8080/whatsapp/providers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WhatsApp Official",
    "provider": "hub",
    "config": {
      "instanceId": "your_instance_id",
      "apiKey": "your_api_key"
    },
    "isDefault": true
  }'
```

#### Enviar Mensagem

```bash
curl -X POST http://localhost:8080/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "body": "Hello World!",
    "provider": "hub"
  }'
```

## 🛠️ **Development**

### Setup Local

```bash
# 1. Clonar repositório
git clone https://github.com/DEV7Kadu/My-Tycket.git Sistema2
cd Sistema2

# 2. Instalar dependências
cd backend
npm install
cd ../frontend
npm install

# 3. Configurar ambiente
cp backend/.env.example backend/.env
# Editar backend/.env

# 4. Setup database
cd backend
npm run db:migrate
npm run db:seed

# 5. Iniciar desenvolvimento
npm run dev
```

### Scripts Disponíveis

```bash
# Backend
npm run dev          # Iniciar desenvolvimento
npm run build        # Build produção
npm run test         # Executar testes
npm run test:coverage # Test coverage
npm run db:migrate   # Rodar migrations
npm run db:seed      # Popular database
npm run safety-check # Verificação de segurança

# Frontend
npm run start        # Iniciar desenvolvimento
npm run build        # Build produção
npm run test         # Executar testes
npm run eject        # Eject (cuidado)
```

## 🐳 **Docker**

### Docker Compose

```bash
# Iniciar todos serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Rebuild
docker-compose up -d --build
```

### Docker Compose Dev

```bash
# Ambiente desenvolvimento
docker-compose -f docker-compose.dev.yml up -d
```

## 📊 **Monitoring**

### Health Check

```bash
# Verificar saúde do sistema
curl http://localhost:8080/health

# Verificar status detalhado
curl http://localhost:8080/health/detailed
```

### Logs

```bash
# Backend logs
pm2 logs whaticketplus

# System logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
```

### Metrics

```bash
# PM2 metrics
pm2 monit

# System metrics
htop
iostat -x 1
```

## 🔒 **Segurança**

### Features de Segurança

- ✅ **JWT Authentication** com refresh tokens
- ✅ **Rate Limiting** por usuário/IP
- ✅ **CORS** configurável
- ✅ **Input Validation** em todos endpoints
- ✅ **SQL Injection Protection** via Sequelize ORM
- ✅ **XSS Protection** com sanitização
- ✅ **CSRF Protection** com tokens
- ✅ **Password Hashing** com bcrypt
- ✅ **2FA Available** (opcional)

### Environment Variables

```bash
# Database Security
DB_SSL=true
DB_ENCRYPTION_KEY=your_encryption_key

# JWT Security
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=8h

# API Security
API_RATE_LIMIT=100
CORS_ORIGIN=https://yourdomain.com

# WhatsApp Provider Security
HUB_API_KEY=your_hub_api_key
HUB_WEBHOOK_SECRET=your_webhook_secret
```

## 🚨 **Troubleshooting**

### Issues Comuns

#### Database Connection Error

```bash
# Verificar PostgreSQL status
sudo systemctl status postgresql

# Verificar database exists
sudo -u postgres psql -l

# Testar connection
node -e "const {Client} = require('pg'); new Client({user:'postgres',host:'localhost'}).connect()"
```

#### WhatsApp Provider Not Working

```bash
# Verificar provider status
curl http://localhost:8080/whatsapp/providers

# Testar connection
npm run test:whatsapp

# Verificar logs
pm2 logs whaticketplus | grep -i whatsapp
```

#### FlowBuilder Not Saving

```bash
# Verificar Redis status
docker exec redis-container redis-cli ping

# Limpar cache
npm run cache:clear

# Verificar storage permissions
ls -la uploads/
```

### Debug Mode

```bash
# Ativar debug mode
export DEBUG=whaticket:*
npm run dev

# Verbose logs
pm2 start ecosystem.config.js --env production --log-date-format "YYYY-MM-DD HH:mm:ss.SSS"
```

## 📞 **Suporte**

### Canais de Suporte

- 📧 **Email**: support@my-tycket.com
- 💬 **WhatsApp**: +55 11 99999-9999
- 🐛 **Issues**: https://github.com/DEV7Kadu/My-Tycket/issues
- 📚 **Docs**: https://docs.my-tycket.com

### Community

- 💬 **Discord**: https://discord.gg/my-tycket
- 📱 **Telegram**: https://t.me/mytycket
- 🐦 **Twitter**: https://twitter.com/mytycket

### Enterprise Support

Para suporte empresarial 24/7:

- 🏢 **Enterprise**: enterprise@my-tycket.com
- 📞 **Phone**: +55 11 9999-9999
- 🌐 **Portal**: https://enterprise.my-tycket.com

---

## 📜 **Licença**

**My-Tycket v28.0.0** - Licença MIT

© 2024 My-Tycket. Todos os direitos reservados.

---

## 🛡️ **LEMBRE-SE: USE SEMPRE O INSTALADOR SEGURO!**

O instalador seguro garante que seu sistema existente **NÃO SERÁ AFETADO**, criando backups automáticos e permitindo rollback completo se necessário.

**Comando Seguro (mesma estrutura do original):**
```bash
sudo bash -c "apt update && apt upgrade -y && apt install sudo git curl -y && curl -fsSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/backend/scripts/safe-install.sh | bash"
```
