# Changelog - My-Tycket

## v3.0.1 - 17/11/2025

### 🔧 Correções de Dependências
- **Corrigido conflito ERESOLVE** entre ts-node e typeorm
- Atualizado `ts-node` para versão `^10.7.0` (compatível com typeorm@0.3.27)
- Resolvido erro NPM durante instalação do backend

### 📋 Configuração de Portas
- **Adicionadas perguntas para TODAS as portas do sistema:**
  - PostgreSQL Port (padrão: 5432)
  - Docker Daemon Port (padrão: 2375)
  - Frontend Port (3000-3999)
  - Backend Port (4000-4999)
  - Redis Port (5000-5999)

### 📁 Arquivos Modificados
- `Código Fonte/backend/package.json` - Atualizada dependência ts-node
- `Instalador/lib/_inquiry.sh` - Adicionadas funções get_postgresql_port() e get_docker_port()
- `Instalador 2/lib/_inquiry.sh` - Mesmas adições do instalador principal
- `Instalador/lib/_backend.sh` - Configuração dinâmica porta PostgreSQL
- `Instalador 2/lib/_backend.sh` - Mesmas configurações
- `README.md` - Documentação da correção ERESOLVE

### 🎯 Benefícios
- ✅ Instalação sem conflitos de dependências
- ✅ Controle total sobre portas do sistema
- ✅ Evita conflitos em servidores com múltiplas instâncias
- ✅ Compatibilidade com todas as versões Node.js suportadas

### 🔄 Como Aplicar
Para repositórios existentes:
```bash
git pull origin main
cd "Código Fonte/backend"
npm install
```

Para novas instalações, usar o comando oficial:
```bash
sudo bash -c "apt update && apt install -y git curl && rm -rf whaticketplus && git clone https://github.com/DEV7Kadu/My-Tycket.git whaticketplus && cd whaticketplus && chmod +x ./whaticketplus && ./whaticketplus"
```