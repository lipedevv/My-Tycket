# 🔧 PLANO DE CORREÇÃO EMERGENCIAL - TypeScript

**Data:** 17/11/2025
**Status:** CRÍTICO - Bloqueando instalação

## 🚨 **Erros Identificados na Compilação**

### 1. **Dependências Ausentes (CRÍTICO)**
```bash
# Módulos não encontrados:
- typeorm ❌
- ../services/FlowEngine/FlowEngine ❌
- ../utils/logger ❌
- ../services/WebSocketService ❌
- ../models ❌
```

### 2. **Export/Import Incorretos (CRÍTICO)**
```typescript
// ❌ ERRO:
import { FlowEngine } from "../services/FlowEngine/FlowEngine"

// ✅ CORREÇÃO:
import FlowEngine from "../services/FlowEngine/FlowEngine"
```

### 3. **Logger Sem Default Export (CRÍTICO)**
```typescript
// ❌ ERRO:
import logger from "../utils/logger"

// ✅ CORREÇÃO:
import { logger } from "../utils/logger"
```

### 4. **Interface AuthenticatedRequest (CRÍTICO)**
```typescript
// ❌ ERRO: Tipos incompatíveis
user.id: string vs number
user.companyId: string vs number
```

### 5. **Services Que Não Existem (CRÍTICO)**
- ShowWhatsAppProviderService
- UpdateWhatsAppProviderService
- DeleteWhatsAppProviderService
- WebSocketService

## 📋 **Plano de Correção Imediata**

### **FASE 1: Corrigir Dependências**
1. Instalar `typeorm` e `reflect-metadata`
2. Verificar estrutura de serviços
3. Corrigir exports/imports

### **FASE 2: Corrigir Interfaces**
1. Padronizar AuthenticatedRequest
2. Corrigir tipos de user.id e companyId
3. Ajustar middleware types

### **FASE 3: Corrigir Services**
1. Implementar services ausentes
2. Corrigir métodos estáticos
3. Ajustar exports

## 🎯 **Comandos de Correção**

```bash
# 1. Instalar typeorm
npm install typeorm reflect-metadata

# 2. Adicionar type definitions
npm install --save-dev @types/node

# 3. Compilar apenas arquivos principais
npx tsc src/server.ts --noEmit
```

## ⚡ **Solução Temporária (Para Instalação)**

Se precisar instalar rapidamente, pode:

1. **Desativar compilação strict no tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true
  }
}
```

2. **Compilar com --skipLibCheck:**
```bash
npx tsc --skipLibCheck --sourceMap false
```

## 📊 **Status da Correção**

- [x] FlowBuilderController.ts - Palavras reservadas export/import
- [x] WhatsAppSocketService.ts - Estrutura da classe
- [ ] Instalar typeorm ⏳
- [ ] Corrigir interfaces ⏳
- [ ] Implementar services ausentes ⏳

**Próxima ação:** Instalar dependências críticas e corrigir interfaces.