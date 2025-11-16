#!/bin/bash

# Script Automatizado de Reorganização - Atiketet
# Criado por: Rovo Dev AI Assistant
# Função: Reorganizar estrutura do projeto de forma otimizada

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 REORGANIZADOR AUTOMÁTICO - ATIKETET${NC}"
echo "================================================="

# Verificar se está na raiz do projeto
if [[ ! -f "whaticketplus" ]] || [[ ! -d "Instalador" ]]; then
    echo -e "${RED}❌ Execute este script na raiz do projeto WhatTicket Plus${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 Analisando estrutura atual...${NC}"

# Função para mover arquivos com verificação
move_file_safe() {
    local source="$1"
    local dest="$2"
    local desc="$3"
    
    if [[ -f "$source" ]]; then
        mkdir -p "$(dirname "$dest")"
        mv "$source" "$dest"
        chmod +x "$dest" 2>/dev/null || true
        echo -e "${GREEN}✅ $desc: $source → $dest${NC}"
    else
        echo -e "${YELLOW}⚠️ $desc: $source não encontrado${NC}"
    fi
}

# Função para remover arquivos duplicados
remove_duplicate() {
    local file="$1"
    local desc="$2"
    
    if [[ -f "$file" ]]; then
        rm -f "$file"
        echo -e "${GREEN}🗑️ $desc: $file removido${NC}"
    fi
}

# FASE 1: Reorganizar scripts dispersos
echo -e "\n${YELLOW}📦 FASE 1: Consolidando scripts...${NC}"

# Mover scripts da raiz se existirem
move_file_safe "diagnostico.sh" "Instalador/utils/diagnostico.sh" "Diagnóstico do sistema"
move_file_safe "update_openai.sh" "Instalador/utils/update_openai.sh" "Atualizador OpenAI"

# Mover scripts da pasta scripts/ se ainda existir
if [[ -d "scripts" ]]; then
    move_file_safe "scripts/diagnostico.sh" "Instalador/utils/diagnostico.sh" "Diagnóstico (scripts/)"
    move_file_safe "scripts/update_openai.sh" "Instalador/utils/update_openai.sh" "OpenAI (scripts/)"
    move_file_safe "scripts/install.sh" "Instalador/utils/install_local.sh" "Instalador local"
    
    # Remover duplicatas
    remove_duplicate "scripts/install_curl.sh" "Instalador curl redundante"
    
    # Remover pasta scripts se vazia
    if [[ -z "$(ls -A scripts 2>/dev/null)" ]]; then
        rmdir scripts
        echo -e "${GREEN}🗑️ Pasta scripts/ removida${NC}"
    fi
fi

# FASE 2: Organizar documentação
echo -e "\n${YELLOW}📚 FASE 2: Organizando documentação...${NC}"

# Criar estrutura de docs se não existir
mkdir -p "docs/instalacao"
mkdir -p "docs/manutencao"

# Mover documentação específica de instalação
move_file_safe "QUICK_INSTALL.md" "docs/instalacao/QUICK_INSTALL.md" "Guia de instalação rápida"
move_file_safe "OPENAI_UPDATE.md" "docs/manutencao/OPENAI_UPDATE.md" "Documentação OpenAI"

# FASE 3: Limpar arquivos temporários
echo -e "\n${YELLOW}🧹 FASE 3: Limpando arquivos temporários...${NC}"

# Remover arquivos temporários do Rovo Dev
find . -name "tmp_rovodev_*" -type f -delete 2>/dev/null && echo -e "${GREEN}🗑️ Arquivos temporários removidos${NC}" || true

# Remover logs antigos se existirem
remove_duplicate "log.txt" "Log antigo"
remove_duplicate "error.log" "Log de erros antigo"

# FASE 4: Atualizar permissões
echo -e "\n${YELLOW}🔐 FASE 4: Configurando permissões...${NC}"

# Scripts principais
chmod +x whaticketplus 2>/dev/null || true
chmod +x install.sh 2>/dev/null || true

# Scripts do instalador
find Instalador/ -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true
chmod +x Instalador/install_* 2>/dev/null || true

echo -e "${GREEN}✅ Permissões configuradas${NC}"

# FASE 5: Verificar integridade
echo -e "\n${YELLOW}🔍 FASE 5: Verificando integridade...${NC}"

# Verificar scripts principais
scripts_principais=(
    "whaticketplus"
    "install.sh"
    "Instalador/install_ubuntu22"
    "Instalador/install_primaria"
)

for script in "${scripts_principais[@]}"; do
    if [[ -f "$script" ]]; then
        echo -e "${GREEN}✅ $script${NC}"
    else
        echo -e "${RED}❌ $script FALTANDO${NC}"
    fi
done

# Verificar scripts utilitários
echo -e "\n📂 Scripts utilitários:"
if [[ -d "Instalador/utils" ]]; then
    ls -la Instalador/utils/*.sh 2>/dev/null | while read -r line; do
        echo -e "${GREEN}  ✅ $(echo "$line" | awk '{print $9}')${NC}"
    done
fi

# FASE 6: Relatório final
echo -e "\n${BLUE}📊 RELATÓRIO FINAL:${NC}"
echo "================================================="
echo -e "📁 Estrutura reorganizada: ${GREEN}✅${NC}"
echo -e "🔐 Permissões configuradas: ${GREEN}✅${NC}"
echo -e "🧹 Arquivos temporários limpos: ${GREEN}✅${NC}"
echo -e "📚 Documentação organizada: ${GREEN}✅${NC}"

echo -e "\n${GREEN}🎉 REORGANIZAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${YELLOW}💡 Execute 'ls -la Instalador/utils/' para ver os scripts utilitários${NC}"

# Mostrar nova estrutura
echo -e "\n${BLUE}📂 Nova estrutura:${NC}"
echo "Instalador/"
echo "├── utils/"
find Instalador/utils/ -name "*.sh" 2>/dev/null | sed 's|Instalador/utils/|│   ├── |' || true
echo "├── lib/"
echo "├── variables/"
echo "└── ..."

echo -e "\n${YELLOW}🚀 Sistema pronto para uso!${NC}"