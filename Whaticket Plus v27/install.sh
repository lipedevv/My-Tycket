#!/bin/bash

# WhatiTicket Plus - Instalador One-Liner
# Compatível com Ubuntu 20.04, 22.04 e 24.04 LTS

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 WhatiTicket Plus - Instalação Automática${NC}"
echo "================================================="

# Verificar se é root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ Este script precisa ser executado como root${NC}"
    echo -e "   💡 Execute: ${GREEN}sudo bash -c \"\$(curl -sSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/install.sh)\"${NC}"
    exit 1
fi

# Atualizar sistema
echo -e "${YELLOW}📦 Atualizando sistema...${NC}"
apt update && apt upgrade -y
apt install -y sudo git curl lsb-release

# Remover instalação anterior
echo -e "${YELLOW}🧹 Limpando instalações anteriores...${NC}"
rm -rf My-Tycket

# Clonar repositório
echo -e "${YELLOW}📥 Baixando WhatiTicket Plus...${NC}"
git clone https://github.com/DEV7Kadu/My-Tycket.git
cd My-Tycket

# Tornar executável
chmod +x ./whaticketplus

# Executar instalador
echo -e "${GREEN}🎯 Iniciando instalação...${NC}"
./whaticketplus