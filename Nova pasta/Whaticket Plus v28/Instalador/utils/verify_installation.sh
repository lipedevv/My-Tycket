#!/bin/bash
# Script de verificação pós-instalação
# Verifica se todos os componentes do WhatTicket Plus estão funcionando

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 VERIFICAÇÃO DE INSTALAÇÃO - WHATTICKET PLUS${NC}"
echo "=================================================="

# Função para verificar arquivos
check_file() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ $description${NC}"
        return 0
    else
        echo -e "${RED}❌ $description${NC}"
        return 1
    fi
}

# Função para verificar diretórios
check_directory() {
    local dir="$1"
    local description="$2"
    
    if [[ -d "$dir" ]]; then
        echo -e "${GREEN}✅ $description${NC}"
        return 0
    else
        echo -e "${RED}❌ $description${NC}"
        return 1
    fi
}

# Função para verificar serviços
check_service() {
    local service="$1"
    local description="$2"
    
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo -e "${GREEN}✅ $description (ativo)${NC}"
        return 0
    elif systemctl is-enabled --quiet "$service" 2>/dev/null; then
        echo -e "${YELLOW}⚠️ $description (configurado mas não ativo)${NC}"
        return 1
    else
        echo -e "${RED}❌ $description (não encontrado)${NC}"
        return 1
    fi
}

# Detectar instância
INSTANCE_DIR=""
if [[ -d "/home/deploy" ]]; then
    for dir in /home/deploy/*; do
        if [[ -d "$dir/frontend" && -d "$dir/backend" ]]; then
            INSTANCE_DIR="$dir"
            break
        fi
    done
fi

if [[ -z "$INSTANCE_DIR" ]]; then
    echo -e "${RED}❌ Instância do WhatTicket Plus não encontrada!${NC}"
    exit 1
fi

INSTANCE_NAME=$(basename "$INSTANCE_DIR")
echo -e "${BLUE}📂 Instância detectada: $INSTANCE_NAME${NC}"
echo -e "${BLUE}📍 Localização: $INSTANCE_DIR${NC}"

echo -e "\n${YELLOW}🔍 Verificando estrutura de arquivos...${NC}"

# Verificar estrutura do backend
check_directory "$INSTANCE_DIR/backend" "Backend - Diretório principal"
check_file "$INSTANCE_DIR/backend/package.json" "Backend - package.json"
check_file "$INSTANCE_DIR/backend/.env" "Backend - Arquivo de configuração (.env)"
check_directory "$INSTANCE_DIR/backend/dist" "Backend - Código compilado (dist/)"

# Verificar estrutura do frontend
check_directory "$INSTANCE_DIR/frontend" "Frontend - Diretório principal"
check_file "$INSTANCE_DIR/frontend/package.json" "Frontend - package.json"
check_file "$INSTANCE_DIR/frontend/.env" "Frontend - Arquivo de configuração (.env)"
check_file "$INSTANCE_DIR/frontend/server.js" "Frontend - Servidor Express"

# Verificar build do frontend (crítico!)
if check_file "$INSTANCE_DIR/frontend/build/index.html" "Frontend - index.html (CRÍTICO)"; then
    file_size=$(stat -c%s "$INSTANCE_DIR/frontend/build/index.html" 2>/dev/null || echo "0")
    if [[ "$file_size" -gt 1000 ]]; then
        echo -e "${GREEN}   📄 index.html válido ($file_size bytes)${NC}"
        
        # Verificar backup
        if [[ -f "$INSTANCE_DIR/frontend/build/index.html.bak" ]]; then
            echo -e "${GREEN}   💾 Backup disponível${NC}"
        fi
    else
        echo -e "${RED}   ⚠️ index.html muito pequeno ($file_size bytes)${NC}"
    fi
fi

check_directory "$INSTANCE_DIR/frontend/build/static" "Frontend - Arquivos estáticos"

echo -e "\n${YELLOW}🔍 Verificando serviços do sistema...${NC}"

# Verificar serviços
check_service "${INSTANCE_NAME}" "Serviço WhatTicket Plus"
check_service "nginx" "Nginx (proxy reverso)"
check_service "postgresql" "PostgreSQL (banco de dados)"
check_service "redis-server" "Redis (cache)"

echo -e "\n${YELLOW}🔍 Verificando dependências...${NC}"

# Verificar Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js instalado ($NODE_VERSION)${NC}"
else
    echo -e "${RED}❌ Node.js não encontrado${NC}"
fi

# Verificar NPM
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ NPM instalado ($NPM_VERSION)${NC}"
else
    echo -e "${RED}❌ NPM não encontrado${NC}"
fi

# Verificar PM2
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PM2 instalado${NC}"
    
    # Verificar processos PM2
    if pm2 list | grep -q "$INSTANCE_NAME"; then
        echo -e "${GREEN}   📊 Processos PM2 configurados${NC}"
    else
        echo -e "${YELLOW}   ⚠️ Processos PM2 não encontrados${NC}"
    fi
else
    echo -e "${RED}❌ PM2 não encontrado${NC}"
fi

echo -e "\n${YELLOW}🔍 Verificando conectividade...${NC}"

# Verificar porta do backend
BACKEND_PORT=$(grep -o 'PORT=.*' "$INSTANCE_DIR/backend/.env" 2>/dev/null | cut -d'=' -f2 || echo "8080")
if netstat -tlnp | grep -q ":$BACKEND_PORT "; then
    echo -e "${GREEN}✅ Backend respondendo na porta $BACKEND_PORT${NC}"
else
    echo -e "${RED}❌ Backend não está respondendo na porta $BACKEND_PORT${NC}"
fi

# Verificar porta do frontend
FRONTEND_PORT="3599"
if netstat -tlnp | grep -q ":$FRONTEND_PORT "; then
    echo -e "${GREEN}✅ Frontend respondendo na porta $FRONTEND_PORT${NC}"
else
    echo -e "${RED}❌ Frontend não está respondendo na porta $FRONTEND_PORT${NC}"
fi

echo -e "\n${YELLOW}🔍 Verificando banco de dados...${NC}"

# Verificar conexão com PostgreSQL
DB_NAME=$(grep -o 'DB_NAME=.*' "$INSTANCE_DIR/backend/.env" 2>/dev/null | cut -d'=' -f2 || echo "")
if [[ -n "$DB_NAME" ]]; then
    if sudo -u postgres psql -d "$DB_NAME" -c '\q' 2>/dev/null; then
        echo -e "${GREEN}✅ Banco de dados '$DB_NAME' acessível${NC}"
    else
        echo -e "${RED}❌ Banco de dados '$DB_NAME' inacessível${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Nome do banco não encontrado no .env${NC}"
fi

echo -e "\n${YELLOW}🔍 Testando HTTP...${NC}"

# Testar requisições HTTP
if command -v curl >/dev/null 2>&1; then
    # Teste do frontend
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT" | grep -q "200\|503"; then
        echo -e "${GREEN}✅ Frontend acessível via HTTP${NC}"
    else
        echo -e "${RED}❌ Frontend não acessível via HTTP${NC}"
    fi
    
    # Teste do backend
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT" | grep -q "200\|404"; then
        echo -e "${GREEN}✅ Backend acessível via HTTP${NC}"
    else
        echo -e "${RED}❌ Backend não acessível via HTTP${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ cURL não disponível para testes HTTP${NC}"
fi

echo -e "\n${BLUE}📊 RESUMO DA VERIFICAÇÃO${NC}"
echo "=============================="

# Contadores
total_checks=0
passed_checks=0

# Verificações críticas
critical_files=(
    "$INSTANCE_DIR/frontend/build/index.html"
    "$INSTANCE_DIR/backend/.env"
    "$INSTANCE_DIR/frontend/.env"
)

echo -e "${YELLOW}🔥 Verificações Críticas:${NC}"
for file in "${critical_files[@]}"; do
    ((total_checks++))
    if [[ -f "$file" ]]; then
        ((passed_checks++))
        echo -e "${GREEN}   ✅ $(basename "$file")${NC}"
    else
        echo -e "${RED}   ❌ $(basename "$file")${NC}"
    fi
done

# Calcular percentual
if [[ $total_checks -gt 0 ]]; then
    percentage=$((passed_checks * 100 / total_checks))
    echo -e "\n${BLUE}📈 Taxa de sucesso: $passed_checks/$total_checks ($percentage%)${NC}"
    
    if [[ $percentage -ge 100 ]]; then
        echo -e "${GREEN}🎉 Sistema totalmente funcional!${NC}"
        exit_code=0
    elif [[ $percentage -ge 80 ]]; then
        echo -e "${YELLOW}⚠️ Sistema funcional com alguns problemas menores${NC}"
        exit_code=0
    else
        echo -e "${RED}❌ Sistema com problemas críticos${NC}"
        exit_code=1
    fi
else
    echo -e "${RED}❌ Nenhuma verificação pôde ser realizada${NC}"
    exit_code=1
fi

echo -e "\n${BLUE}🛠️ COMANDOS ÚTEIS:${NC}"
echo -e "Logs do sistema: ${YELLOW}journalctl -u $INSTANCE_NAME -f${NC}"
echo -e "Status PM2: ${YELLOW}pm2 status${NC}"
echo -e "Rebuild frontend: ${YELLOW}cd $INSTANCE_DIR/frontend && npm run build${NC}"
echo -e "Reiniciar serviços: ${YELLOW}systemctl restart $INSTANCE_NAME${NC}"

exit $exit_code