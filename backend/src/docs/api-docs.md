# WhatsApp Dual Provider API Documentation

## Visão Geral

Esta API fornece um sistema completo de WhatsApp com arquitetura dual provider (Baileys + Notifica-me Hub) e FlowBuilder para automação conversacional.

### Features Principais

- **Dual Provider Architecture**: Suporte para Baileys (gratuito) e Notifica-me Hub (pago)
- **FlowBuilder**: Sistema visual de automação com drag-and-drop
- **Multi-tenant**: Suporte para múltiplas empresas
- **Real-time**: WebSocket para atualizações em tempo real
- **Omnichannel**: Integração com 12+ canais via Notifica-me Hub

### Base URL

```
Desenvolvimento: http://localhost:8080
Produção: https://api.whatsapp-system.com
```

### Autenticação

A API utiliza JWT Bearer Token para autenticação. Inclua o header:

```http
Authorization: Bearer <seu_token_jwt>
```

## Endpoints

### Autenticação

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@empresa.com",
  "password": "senha123"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### Usuários

#### Listar Usuários
```http
GET /users?page=1&limit=10&search=joão
Authorization: Bearer <token>
```

#### Criar Usuário
```http
POST /users
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "password": "senha123",
  "profile": "user",
  "companyId": "uuid-da-empresa"
}
```

### Empresas

#### Listar Empresas
```http
GET /companies?page=1&limit=10
Authorization: Bearer <token>
```

#### Criar Empresa
```http
POST /companies
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Minha Empresa LTDA",
  "document": "12.345.678/0001-90",
  "planId": "uuid-do-plano"
}
```

### WhatsApp Providers

#### Listar Providers
```http
GET /whatsapp-providers?companyId=uuid
Authorization: Bearer <token>
```

#### Criar Provider Baileys
```http
POST /whatsapp-providers
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "WhatsApp Baileys",
  "provider": "baileys",
  "companyId": "uuid-da-empresa",
  "config": {
    "session": "default",
    "webhookUrl": "https://seu-site.com/webhooks/whatsapp"
  },
  "isDefault": true
}
```

#### Criar Provider Hub
```http
POST /whatsapp-providers
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "WhatsApp Hub",
  "provider": "hub",
  "companyId": "uuid-da-empresa",
  "instanceId": "hub_instance_123",
  "config": {
    "apiKey": "sua-api-key",
    "webhookSecret": "seu-webhook-secret",
    "webhookUrl": "https://seu-site.com/webhooks/hub"
  },
  "isDefault": false
}
```

#### Conectar Provider
```http
POST /whatsapp-providers/{id}/connect
Authorization: Bearer <token>
```

#### Desconectar Provider
```http
POST /whatsapp-providers/{id}/disconnect
Authorization: Bearer <token>
```

#### Enviar Mensagem
```http
POST /whatsapp-providers/{id}/send-message
Content-Type: application/json
Authorization: Bearer <token>

{
  "number": "+5511999998888",
  "body": "Olá! Como posso ajudar?",
  "messageType": "text"
}
```

#### Enviar Mídia
```http
POST /whatsapp-providers/{id}/send-media
Content-Type: application/json
Authorization: Bearer <token>

{
  "number": "+5511999998888",
  "mediaUrl": "https://exemplo.com/imagem.jpg",
  "mediaType": "image",
  "caption": "Confira esta imagem!"
}
```

### FlowBuilder

#### Listar Fluxos
```http
GET /flows?companyId=uuid&page=1&limit=10&category=welcome
Authorization: Bearer <token>
```

#### Criar Fluxo
```http
POST /flows
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Boas-vindas",
  "description": "Fluxo de boas-vindas para novos contatos",
  "companyId": "uuid-da-empresa",
  "nodes": [
    {
      "id": "start_1",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Início",
        "config": {}
      }
    },
    {
      "id": "message_1",
      "type": "sendMessage",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Enviar Mensagem",
        "config": {
          "message": "Olá! Seja bem-vindo(a)!",
          "messageType": "text"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start_1",
      "target": "message_1",
      "type": "default"
    }
  ],
  "category": "welcome"
}
```

#### Testar Fluxo
```http
POST /flows/{id}/test
Content-Type: application/json
Authorization: Bearer <token>

{
  "testData": {
    "contactNumber": "+5511999998888",
    "contactName": "Teste"
  }
}
```

#### Publicar Fluxo
```http
POST /flows/{id}/publish
Authorization: Bearer <token>
```

#### Executar Fluxo
```http
POST /flows/{id}/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "ticketId": "uuid-do-ticket",
  "contactId": "uuid-do-contato",
  "variables": {
    "nome": "João",
    "empresa": "Minha Empresa"
  }
}
```

#### Listar Execuções
```http
GET /flows/{id}/executions?status=running&page=1&limit=10
Authorization: Bearer <token>
```

#### Analytics do Fluxo
```http
GET /flows/{id}/analytics?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### Tickets

#### Listar Tickets
```http
GET /tickets?companyId=uuid&status=open&page=1&limit=10
Authorization: Bearer <token>
```

#### Criar Ticket
```http
POST /tickets
Content-Type: application/json
Authorization: Bearer <token>

{
  "contactNumber": "+5511999998888",
  "contactName": "Cliente",
  "companyId": "uuid-da-empresa",
  "channel": "whatsapp",
  "message": "Olá, preciso de ajuda"
}
```

#### Atender Ticket
```http
POST /tickets/{id}/accept
Authorization: Bearer <token>
```

#### Fechar Ticket
```http
POST /tickets/{id}/close
Authorization: Bearer <token>
```

### Webhooks

#### Webhook Hub (Notifica-me)
```http
POST /webhooks/hub/{instanceId}
Content-Type: application/json
X-Hub-Signature: sha256=assinatura_hmac

{
  "event": "message.received",
  "data": {
    "instanceId": "hub_instance_123",
    "messageId": "msg_123",
    "from": "+5511999998888",
    "message": {
      "type": "text",
      "content": "Olá!"
    },
    "timestamp": 1640995200000
  }
}
```

#### Webhook FlowBuilder
```http
POST /webhooks/flow/{flowId}/execution/{executionId}
Content-Type: application/json
X-Flow-Token: webhook_token_secreto

{
  "type": "api_response",
  "response": {
    "status": "success",
    "data": { "result": "processed" }
  }
}
```

## Tipos de Nós do FlowBuilder

### Start
```json
{
  "type": "start",
  "data": {
    "label": "Início",
    "config": {}
  }
}
```

### Send Message
```json
{
  "type": "sendMessage",
  "data": {
    "label": "Enviar Mensagem",
    "config": {
      "message": "Olá! Como posso ajudar?",
      "messageType": "text",
      "variables": ["nome", "empresa"]
    }
  }
}
```

### Send Media
```json
{
  "type": "sendMedia",
  "data": {
    "label": "Enviar Imagem",
    "config": {
      "mediaUrl": "https://exemplo.com/imagem.jpg",
      "mediaType": "image",
      "caption": "Confira esta imagem!"
    }
  }
}
```

### Condition
```json
{
  "type": "condition",
  "data": {
    "label": "Verificar Interesse",
    "config": {
      "conditions": [
        {
          "variable": "interesse",
          "operator": "equals",
          "value": "sim",
          "label": "Interessado",
          "targetNode": "proximo_node"
        },
        {
          "variable": "interesse",
          "operator": "equals",
          "value": "nao",
          "label": "Não Interessado",
          "targetNode": "encerrar_node"
        }
      ]
    }
  }
}
```

### Menu
```json
{
  "type": "menu",
  "data": {
    "label": "Menu Principal",
    "config": {
      "title": "Escolha uma opção:",
      "options": [
        {
          "id": "1",
          "text": "Suporte Técnico",
          "targetNode": "suporte_node"
        },
        {
          "id": "2",
          "text": "Vendas",
          "targetNode": "vendas_node"
        },
        {
          "id": "3",
          "text": "Falar com Atendente",
          "targetNode": "humano_node"
        }
      ],
      "waitForResponse": true,
      "timeout": 30,
      "timeoutMessage": "Opção inválida. Tente novamente."
    }
  }
}
```

### Delay
```json
{
  "type": "delay",
  "data": {
    "label": "Aguardar 5 segundos",
    "config": {
      "delay": 5,
      "delayUnit": "seconds"
    }
  }
}
```

### API Call
```json
{
  "type": "apiCall",
  "data": {
    "label": "Consultar CRM",
    "config": {
      "url": "https://api.crm.com/clients/search",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer ${token}",
        "Content-Type": "application/json"
      },
      "body": {
        "phone": "${contactNumber}",
        "company": "${company}"
      },
      "successNode": "processar_cliente",
      "errorNode": "erro_api"
    }
  }
}
```

### Variable
```json
{
  "type": "variable",
  "data": {
    "label": "Definir Variável",
    "config": {
      "operation": "set",
      "variableName": "nome_cliente",
      "value": "${contactName}",
      "scope": "ticket"
    }
  }
}
```

### Human Handoff
```json
{
  "type": "humanHandoff",
  "data": {
    "label": "Transferir para Humano",
    "config": {
      "reason": "Cliente solicitou atendente",
      "queueId": "uuid-da-fila",
      "priority": "high",
      "message": "Aguarde um momento, vou transferir para um atendente."
    }
  }
}
```

## Rate Limiting

- **Endpoints de Webhook**: 100 requisições/minuto por IP
- **Endpoints da API**: 1000 requisições/minuto por usuário
- **Mensagens**: 100 mensagens/minuto por provider

## Códigos de Status

- `200` - Sucesso
- `201` - Recurso criado
- `400` - Requisição inválida
- `401` - Não autorizado
- `403` - Proibido
- `404` - Recurso não encontrado
- `429` - Muitas requisições
- `500` - Erro interno do servidor

## WebSocket Events

### Conectar ao WebSocket
```javascript
const socket = io('ws://localhost:8080', {
  auth: {
    token: 'seu_jwt_token'
  }
});
```

### Events Disponíveis

#### Company Events
```javascript
// Receber mensagens da empresa
socket.on(`company-${companyId}:message`, (data) => {
  console.log('Nova mensagem:', data);
});

// Atualizações de conexão
socket.on(`company-${companyId}:connection`, (data) => {
  console.log('Status da conexão:', data);
});
```

#### Flow Events
```javascript
// Atualizações de execução do flow
socket.on(`flow-${flowId}:execution_update`, (data) => {
  console.log('Execução atualizada:', data);
});
```

#### Provider Events
```javascript
// Events do Notifica-me Hub
socket.on(`hub-instance-${instanceId}:message`, (data) => {
  console.log('Mensagem do Hub:', data);
});

socket.on(`hub-instance-${instanceId}:status`, (data) => {
  console.log('Status do Hub:', data);
});
```

## Exemplos de Implementação

### React + Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Criar um novo fluxo
const createFlow = async (flowData) => {
  try {
    const response = await api.post('/flows', flowData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar fluxo:', error);
    throw error;
  }
};
```

### Node.js + WebSocket
```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:8080', {
  auth: {
    token: 'seu_jwt_token'
  }
});

socket.on('connect', () => {
  console.log('Conectado ao WebSocket');

  // Entrar na sala da empresa
  socket.emit('join_company', { companyId: 'uuid-da-empresa' });
});

socket.on('message', (data) => {
  console.log('Nova mensagem recebida:', data);
});
```

## Erros Comuns

### ValidationError
```json
{
  "error": "ValidationError",
  "message": "Dados inválidos",
  "details": {
    "name": ["O campo nome é obrigatório"],
    "email": ["Email inválido"]
  }
}
```

### UnauthorizedError
```json
{
  "error": "UnauthorizedError",
  "message": "Token inválido ou expirado"
}
```

### ProviderError
```json
{
  "error": "ProviderError",
  "message": "Provider não está conectado",
  "details": {
    "providerId": "uuid-do-provider",
    "status": "disconnected"
  }
}
```

## Suporte

- **Documentação Completa**: [Swagger UI](http://localhost:8080/api-docs)
- **Email**: support@whatsapp-system.com
- **GitHub**: https://github.com/empresa/whatsapp-dual-provider

## Changelog

### v2.0.0
- Adicionado suporte dual provider (Baileys + Hub)
- Implementado FlowBuilder visual
- Adicionado suporte omnichannel
- Melhorias na API REST

### v1.0.0
- Versão inicial com suporte Baileys
- Sistema básico de tickets
- API REST completa