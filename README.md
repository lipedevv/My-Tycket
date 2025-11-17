# 🚀 My-Tycket v28.0.1 - WhatsApp Dual Provider com FlowBuilder

**📅 Última Atualização: 17/11/2025 - Versão 3.0.1 Super Enhanced**
**🔧 Correções: Dependências NPM + Configuração de Portas**
**🔧 Baseado no Instalador 2 Pro - Script Modular Avançado**

## ⚠️ **AVISO CRÍTICO DE SEGURANÇA - INSTALAÇÃO SEGURA**

**NÃO USE** o comando original que pode quebrar sistemas existentes!

### ❌ **COMANDO ANTIGO (NÃO USE - Substituído pelo Instalador Unificado):**
```bash
# ❌ NÃO FAÇA ISSO - COMANDO ANTIGO SUBSTITUÍDO!
sudo bash -c "apt update && apt upgrade -y && apt install sudo git -y && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```

### 🚀 **COMANDO OFICIAL - INSTALADOR UNIFICADO:**
```bash
# ✅ COMANDO ÚNICO ATUALIZADO - My-Tycket v28 (Instalador Unificado)
sudo bash -c "apt update && apt upgrade -y && apt install sudo git curl -y && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./install.sh && sudo ./install.sh"
```

**OU (instalação passo a passo):**
```bash
# 1. Baixar o código
git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus
cd whaticketplus

# 2. Executar instalação unificada
chmod +x ./install.sh
sudo ./install.sh
```

**OU Acessar diretamente o instalador:**
```bash
# Instalação via instalador unificado
cd whaticketplus/Instalador
chmod +x install_unificado
sudo ./install_unificado
```

**OU (comando direto sem atalho):**
```bash
# Comando direto usando o instalador unificado
sudo bash -c "apt update && apt upgrade -y && apt install sudo git curl -y && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus/Instalador && chmod +x install_unificado && sudo ./install_unificado"
```

### 🔄 **COMANDOS ALTERNATIVOS (SE O ACIMA FALHAR):**

**Opção 2: Comando alternativo**
```bash
sudo bash -c "apt update && apt install -y git curl && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```

**Opção 3: Script direto via curl**
```bash
sudo bash -c "apt update && apt install -y git curl && curl -fsSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/whaticketplus | bash"
```

### 📝 **Informações Importantes:**
- ✅ **Instalador Unificado**: Único instalador com múltiplos modos (Padrão, Seguro, Atualização, Avançado)
- ✅ **Backup Automático**: Proteção completa dos dados existentes
- ✅ **Scripts de Manutenção**: Ferramentas para backup, atualização e correção
- ✅ **Rollback Automático**: Reversão em caso de problemas
- ✅ **Validação Pós-instalação**: Verificação automática de funcionamento
- ✅ **Compatibilidade**: Ubuntu 22/24 LTS
- ✅ **Compatibilidade Avançada**: Ubuntu 20.04/22.04/24.04 específico
- ✅ **Verificação Completa**: Sistema pós-instalação integrado
- ✅ **Instalação 100% Automática**: Backend, frontend, banco de dados, SSL
- ✅ **Código Corrigido**: Todas as correções já estão aplicadas
- ✅ **Sintaxe Validada**: Script verificado com `bash -n` sem erros
- ✅ **Portas Configuráveis**: Backend, Frontend, PostgreSQL, Redis, Docker
- ✅ **PM2 Gerenciado**: Inicialização automática com o sistema
- ✅ **Serviços Online**: Frontend e API funcionando após instalação

### 🎯 **O que o Script Instala:**
- 🔧 **Node.js 20.x** + NPM + PM2
- 🐳 **Docker** + Docker Compose
- 🗄️ **PostgreSQL 18** + Redis
- 🌐 **Nginx** + Certbot (SSL)
- 📦 **My-Tycket v28** (Backend + Frontend)
- 🚀 **Configurações completas** (ambiente virtual host, SSL, PM2)

### ⚡ **Após Instalação:**
- 🎨 **Frontend**: https://painel.whaticketplus.com
- 🔗 **API Backend**: https://wapi.whaticketplus.com
- 👤 **Usuário Sistema**: deploy
- 📁 **Diretório**: /home/deploy/whaticketplus

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

### 🚀 **v3.0 Super Enhanced - Baseado no Instalador 2 Pro**

A versão 3.0 representa uma reescrita completa do script de instalação, incorporando as melhores práticas do Instalador 2:

**🎨 Interface Profissional:**
- Banner ASCII art multi-color avançado
- Clear screen e formatação profissional
- printf() otimizado em vez de echo simples

**🔐 Segurança Nível Enterprise:**
- Geração automática de senhas seguras com OpenSSL
- JWT secrets, DB passwords criptografadas automaticamente
- Validação e sanitização de entrada

**🤖 Inteligência Artificial:**
- Detecção automática de repositório Git atual
- Conversão SSH → HTTPS automática
- Identificação de ambiente Docker

**📊 Sistema Avançado:**
- Detecção de arquitetura (x86_64, ARM)
- Análise de memória e kernel
- Compatibilidade Ubuntu específica por versão

**🔍 Verificação Pós-Instalação:**
- Sistema completo de verificação de arquivos, serviços e portas
- Relatório detalhado com contadores de erro/warning
- Validação de instalação em tempo real

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

## 🎯 **Instalador Unificado v2.0**

O novo instalador unificado combina todas as funcionalidades dos instaladores anteriores em uma única ferramenta robusta:

### 📋 **Modos de Instalação Disponíveis**

1. **🚀 Instalação Padrão** - Rápida e otimizada para novas instalações
2. **🔒 Instalação Segura** - Com backup, validação e rollback automático
3. **🔄 Atualizar Instalação** - Atualiza sistemas existentes preservando dados
4. **⚙️ Modo Avançado** - Configuração manual de todas as opções

### 🛡️ **Recursos de Segurança**

- **Backup Automático**: Database, arquivos e configurações
- **Validação Pós-instalação**: Verificação completa de funcionamento
- **Rollback Automático**: Reversão em caso de problemas
- **Detecção de Instalações Existentes**: Proteção contra sobreposição
- **Scripts de Manutenção**: Ferramentas para backup, atualização e correção

### 🔧 **Scripts de Manutenção Incluídos**

Após a instalação, você terá acesso a:
- `fix_frontend.sh` - Corrige problemas de build do frontend
- `backup.sh` - Cria backup completo da instância
- `update.sh` - Atualiza para versões mais recentes
- `verify_installation.sh` - Verifica status da instalação

### 📁 **Estrutura de Arquivos**

```
Instalador/
├── install_unificado          # Instalador principal (único arquivo)
├── README.md                  # Documentação completa
├── lib/                       # Bibliotecas de funções
├── variables/                 # Variáveis de configuração
├── utils/                     # Utilitários e ferramentas
└── config                     # Configurações com senhas
```

### 🚀 **Como Usar o Instalador Unificado**

```bash
# Forma mais simples (recomendado)
git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus
cd whaticketplus
sudo ./install.sh

# Ou diretamente
cd whaticketplus/Instalador
sudo ./install_unificado
```

O instalador apresentará um menu interativo para você escolher o modo desejado e configurar as opções.

## 🔧 **Instalação Segura v3.0**

### 🚀 **Fluxo de Instalação Avançado**

O script v3.0 agora segue um fluxo inteligente baseado no Instalador 2:

```
1️⃣ Banner Profissional (ASCII Art Multi-Color)
2️⃣ Verificação de Permissões (Root/Sudo)
3️⃣ Compatibilidade Ubuntu (20.04/22.04/24.04)
4️⃣ Detecção de Sistema (Arquitetura, Kernel, Memória)
5️⃣ Geração de Senhas (OpenSSL Automático)
6️⃣ Verificação de Portas (15 Portas Críticas)
7️⃣ Detecção Git (Auto-detect Repositório)
8️⃣ Configuração Personalizada (URL, Portas, Email)
9️⃣ Instalação Completa (Node.js, Docker, PostgreSQL)
🔟 Verificação Pós-Instalação (Arquivos, Serviços, Portas)
```

### ⚡ **Novidades da v3.0**

**🤖 Detecção Inteligente:**
- Detecta automaticamente se você está em um repositório Git
- Converte URLs SSH para HTTPS automaticamente
- Identifica ambiente Docker
- Analisa arquitetura do sistema

**🔐 Segurança Automática:**
- JWT secrets gerados automaticamente
- Senhas de banco de dados seguras
- Validação de entrada do usuário
- Configurações criptografadas

**📊 Sistema Profissional:**
- Compatibilidade específica por versão Ubuntu
- Detecção de hardware e memória
- Análise de kernel
- Suporte a múltiplas arquiteturas

**🔍 Verificação Completa:**
- Verificação de arquivos críticos
- Status de serviços em tempo real
- Análise de portas configuradas
- Relatório detalhado de instalação

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

#### Script Installation Error v3.0

**Erro: `unexpected EOF while looking for matching`**
```bash
# Solução: Baixe a versão mais recente (v3.0)
cd whaticketplus
git pull origin main
chmod +x ./whaticketplus
./whaticketplus
```

#### Compatibilidade Ubuntu

**Aviso: Versão não suportada**
```bash
# O script v3.0 avisa automaticamente
# Versões suportadas: 20.04, 22.04, 24.04
# Outras versões requerem confirmação manual
```

#### Verificação Pós-Instalação

**Após instalar, execute verificação manual:**
```bash
# Verificar instalação completa
cd /home/deploy/whaticketplus
pm2 status
systemctl status nginx
systemctl status postgresql

# Verificar portas
netstat -tuln | grep -E '80|443|8080|3000|5432|6379'
```

#### Relatório de Instalação

**Entendendo o relatório final:**
- ✅ **Verde**: Instalação perfeita
- ⚠️ **Amarelo**: Avisos não críticos
- ❌ **Vermelho**: Erros que precisam de atenção
- 📊 **Contadores**: Número exato de problemas encontrados

#### Database Connection Error

```bash
# Verificar PostgreSQL status
sudo systemctl status postgresql

# Verificar database exists
sudo -u postgres psql -l

# Testar connection
node -e "const {Client} = require('pg'); new Client({user:'postgres',host:'localhost'}).connect()"
```

#### NPM Dependencies Error (ERESOLVE)

**✅ CORREÇÃO AUTOMÁTICA INCLUÍDA v3.0.1:**
```bash
# O sistema agora resolve automaticamente conflitos ts-node vs typeorm
# ts-node atualizado para ^10.7.0 (compatível com typeorm@0.3.27)
# Se ainda ocorrer erro ERESOLVE:
cd /home/deploy/whaticketplus/backend
npm install --legacy-peer-deps
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

## ⚠️ **Nota Importante - Instalação do Zero**

### 📝 **Últimas Correções Aplicadas (17/11/2025):**

**🔧 Erro 404 npm corrigido:**
- ❌ Problema: `npm error 404 Not Found - @types/reactflow@^11.10.0`
- ✅ Solução: Removida dependência incorreta do package.json
- 📁 Arquivo: `Código Fonte/backend/package.json`

**🎨 Ícones Material-UI corrigidos:**
- ❌ Problema: Ícone `Hub` não existe
- ✅ Solução: Substituído por `Router` em todos os arquivos frontend
- 📁 Arquivos: 3 arquivos frontend

**📋 Documentação completa:**
- 📚 Arquivo `CÓDIGOS_CORRIGIDOS.md` criado com todas as correções
- 📝 README.md totalmente atualizado para v3.0
- 🚀 Script v3.0 Super Enhanced baseado no Instalador 2 Pro

### 🎯 **Recomendação para Reinstalação:**
Use sempre os comandos oficiais da seção **Instalação Segura v3.0** acima.

## 📜 **Licença**

**My-Tycket v28.0.0** - Licença MIT

© 2024 My-Tycket. Todos os direitos reservados.

---

## 🛡️ **LEMBRE-SE: USE SEMPRE O INSTALADOR v3.0 SUPER ENHANCED!**

O instalador v3.0 baseado no Instalador 2 Pro garante a instalação mais profissional e segura possível, com:

- 🔍 **Verificação completa de sistema**
- 🤖 **Detecção inteligente automática**
- 🔐 **Geração automática de senhas seguras**
- 📊 **Relatório detalhado pós-instalação**
- ⚡ **Performance e estabilidade maximizadas**

**📋 Comandos recomendados (use um dos abaixo):**

**Opção 1: Oficial v3.0 (Super Enhanced)**
```bash
sudo bash -c "apt update && apt install -y git curl && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```

**Opção 2: Via curl v3.0 (sem quebras de linha)**
```bash
sudo bash -c "apt update && apt install -y git curl && curl -fsSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/whaticketplus | bash"
```

### 🎯 **Diferenciais v3.0:**
- ✅ **Baseado no Instalador 2 Pro** - Script modular avançado
- ✅ **Interface Profissional** - Banner multi-color e formatação avançada
- ✅ **Inteligência Artificial** - Detecção automática Git e sistema
- ✅ **Segurança Nível Enterprise** - Geração automática de credenciais
- ✅ **Compatibilidade Específica** - Ubuntu 20.04/22.04/24.04 otimizado
- ✅ **Verificação Completa** - Sistema pós-instalação integrado
- ✅ **15 Portas Verificadas** - Docker, Redis, PostgreSQL, WhatsApp
- ✅ **Relatório Detalhado** - Contadores de erro/warning em tempo real
