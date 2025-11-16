#!/bin/bash

# Script para corrigir build do frontend em produção
# Para resolver: Error: ENOENT: no such file or directory, stat '/home/deploy/whaticketplus/frontend/build/index.html'

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚑 CORREÇÃO EMERGENCIAL - FRONTEND PRODUÇÃO${NC}"
echo "=============================================="

# Detectar o diretório do projeto
POSSIBLE_DIRS=(
    "/home/deploy/whaticketplus"
    "/opt/whaticketplus"
    "/var/www/whaticketplus" 
    "./whaticketplus"
    "."
)

PROJECT_DIR=""
for dir in "${POSSIBLE_DIRS[@]}"; do
    if [[ -d "$dir/Código Fonte/frontend" ]] || [[ -d "$dir/frontend" ]]; then
        PROJECT_DIR="$dir"
        echo -e "${GREEN}✅ Projeto encontrado em: $PROJECT_DIR${NC}"
        break
    fi
done

if [[ -z "$PROJECT_DIR" ]]; then
    echo -e "${RED}❌ Diretório do projeto não encontrado!${NC}"
    echo -e "${YELLOW}💡 Execute este script no servidor onde o WhatTicket Plus está instalado${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Detectar estrutura do frontend
if [[ -d "Código Fonte/frontend" ]]; then
    FRONTEND_DIR="Código Fonte/frontend"
elif [[ -d "frontend" ]]; then
    FRONTEND_DIR="frontend"
else
    echo -e "${RED}❌ Diretório frontend não encontrado!${NC}"
    exit 1
fi

echo -e "${BLUE}📂 Frontend detectado em: $FRONTEND_DIR${NC}"

cd "$FRONTEND_DIR"

echo -e "${YELLOW}🔍 Diagnosticando problema...${NC}"

# Verificar se pasta build existe
if [[ ! -d "build" ]]; then
    echo -e "${YELLOW}📁 Criando pasta build...${NC}"
    mkdir -p build
fi

# Verificar dependências
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm install
fi

# Verificar se index.html existe
if [[ ! -f "build/index.html" ]]; then
    echo -e "${RED}❌ index.html não encontrado! Executando correções...${NC}"
    
    # Tentar restaurar do backup
    if [[ -f "build/index.html.bak" ]]; then
        echo -e "${YELLOW}🔄 Restaurando do backup...${NC}"
        cp "build/index.html.bak" "build/index.html"
        echo -e "${GREEN}✅ index.html restaurado do backup!${NC}"
    else
        echo -e "${YELLOW}🔨 Executando build completo...${NC}"
        
        # Configurar variáveis de ambiente para produção
        export NODE_ENV=production
        export GENERATE_SOURCEMAP=false
        export INLINE_RUNTIME_CHUNK=false
        export NODE_OPTIONS="--max-old-space-size=4096"
        
        # Limpar build anterior se existir
        echo -e "${YELLOW}🧹 Limpando build anterior...${NC}"
        rm -rf build/*
        
        # Executar build
        echo -e "${BLUE}🏗️ Construindo aplicação para produção...${NC}"
        npm run build
        
        # Criar backup do index.html
        if [[ -f "build/index.html" ]]; then
            cp "build/index.html" "build/index.html.bak"
            echo -e "${GREEN}💾 Backup criado: build/index.html.bak${NC}"
        fi
    fi
else
    echo -e "${GREEN}✅ index.html já existe!${NC}"
    # Criar backup se não existir
    if [[ ! -f "build/index.html.bak" ]]; then
        cp "build/index.html" "build/index.html.bak"
        echo -e "${GREEN}💾 Backup criado: build/index.html.bak${NC}"
    fi
fi

# Verificações finais
echo -e "\n${BLUE}🔍 Verificações finais...${NC}"

if [[ -f "build/index.html" ]]; then
    size=$(stat -c%s "build/index.html" 2>/dev/null || stat -f%z "build/index.html" 2>/dev/null || echo "0")
    if [[ "$size" -gt 100 ]]; then
        echo -e "${GREEN}✅ index.html válido (${size} bytes)${NC}"
    else
        echo -e "${RED}❌ index.html muito pequeno ou corrompido (${size} bytes)${NC}"
        echo -e "${YELLOW}🔨 Tentando rebuild...${NC}"
        rm -f "build/index.html"
        npm run build
    fi
else
    echo -e "${RED}❌ index.html ainda não existe após correções${NC}"
    exit 1
fi

# Configurar permissões adequadas
echo -e "${YELLOW}🔐 Configurando permissões...${NC}"
chmod -R 755 build/
chown -R deploy:deploy build/ 2>/dev/null || chown -R $USER:$USER build/ 2>/dev/null || true

# Reiniciar serviços se necessário
echo -e "${YELLOW}🔄 Verificando serviços...${NC}"
if systemctl is-active --quiet whaticketplus || systemctl is-active --quiet whaticket; then
    echo -e "${BLUE}🔄 Reiniciando serviço...${NC}"
    systemctl restart whaticketplus 2>/dev/null || systemctl restart whaticket 2>/dev/null || true
    sleep 3
fi

# Se PM2 está sendo usado
if command -v pm2 >/dev/null 2>&1; then
    if pm2 list | grep -q whaticket; then
        echo -e "${BLUE}🔄 Reiniciando PM2...${NC}"
        pm2 restart whaticket* || true
        sleep 3
    fi
fi

echo -e "\n${GREEN}🎉 CORREÇÃO CONCLUÍDA!${NC}"
echo -e "${BLUE}📊 Status do build:${NC}"
ls -la build/ | head -5

echo -e "\n${GREEN}✅ Frontend corrigido e pronto para uso!${NC}"
echo -e "${YELLOW}🌐 Teste acessando: https://app.whaticketplus.com${NC}"

# Mostrar instruções finais
echo -e "\n${BLUE}📋 PRÓXIMOS PASSOS:${NC}"
echo -e "1. ${GREEN}Teste a aplicação no navegador${NC}"
echo -e "2. ${YELLOW}Monitore os logs por alguns minutos${NC}"  
echo -e "3. ${BLUE}Se problema persistir, execute novamente${NC}"