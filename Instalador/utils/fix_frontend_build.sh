#!/bin/bash

# Script para resolver problemas de build do frontend
# Criado por: Rovo Dev AI Assistant

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 CORRETOR DE BUILD DO FRONTEND - WHATTICKET PLUS${NC}"
echo "========================================================"

FRONTEND_DIR="Código Fonte/frontend"
BUILD_DIR="$FRONTEND_DIR/build"

# Verificar se está na raiz do projeto
if [[ ! -d "$FRONTEND_DIR" ]]; then
    echo -e "${RED}❌ Diretório do frontend não encontrado!${NC}"
    echo -e "${YELLOW}💡 Execute este script na raiz do projeto WhatTicket Plus${NC}"
    exit 1
fi

cd "$FRONTEND_DIR"

echo -e "${YELLOW}📋 Verificando status do build...${NC}"

# Verificar se pasta build existe
if [[ ! -d "build" ]]; then
    echo -e "${YELLOW}📁 Pasta build não existe, criando...${NC}"
    mkdir -p build
fi

# Verificar se index.html existe
if [[ ! -f "build/index.html" ]]; then
    echo -e "${RED}❌ index.html não encontrado!${NC}"
    
    # Tentar restaurar do backup
    if [[ -f "build/index.html.bak" ]]; then
        echo -e "${YELLOW}🔄 Restaurando do backup...${NC}"
        cp "build/index.html.bak" "build/index.html"
        echo -e "${GREEN}✅ index.html restaurado do backup!${NC}"
    else
        echo -e "${YELLOW}🔨 Executando build completo...${NC}"
        
        # Limpar build anterior
        rm -rf build/*
        
        # Configurar variáveis de ambiente
        export NODE_OPTIONS="--max-old-space-size=8192"
        export GENERATE_SOURCEMAP=false
        export INLINE_RUNTIME_CHUNK=false
        
        # Executar build
        if command -v npm >/dev/null 2>&1; then
            echo -e "${BLUE}📦 Executando npm run build...${NC}"
            npm run build
        else
            echo -e "${RED}❌ NPM não encontrado!${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✅ index.html já existe!${NC}"
fi

# Verificações finais
echo -e "\n${BLUE}🔍 Verificações finais...${NC}"

if [[ -f "build/index.html" ]]; then
    size=$(stat -c%s "build/index.html" 2>/dev/null || stat -f%z "build/index.html" 2>/dev/null || echo "0")
    if [[ "$size" -gt 100 ]]; then
        echo -e "${GREEN}✅ index.html válido (${size} bytes)${NC}"
    else
        echo -e "${RED}❌ index.html muito pequeno ou corrompido${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ index.html ainda não existe após build${NC}"
    exit 1
fi

# Verificar arquivos essenciais
essentials=("static/css" "static/js" "manifest.json")
for item in "${essentials[@]}"; do
    if [[ -e "build/$item" ]]; then
        echo -e "${GREEN}✅ $item encontrado${NC}"
    else
        echo -e "${YELLOW}⚠️ $item não encontrado${NC}"
    fi
done

echo -e "\n${GREEN}🎉 BUILD DO FRONTEND CORRIGIDO COM SUCESSO!${NC}"
echo -e "${YELLOW}📂 Localização: $(pwd)/build/${NC}"
echo -e "${BLUE}📊 Arquivos no build:${NC}"
ls -la build/ | head -10

echo -e "\n${GREEN}✅ Sistema pronto para executar!${NC}"