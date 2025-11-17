#!/bin/bash

# Atiketet - Instalação Direta via Curl
# Execute: sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/DEV7Kadu/Atiketet/main/install.sh)"

set -e

# Cores
G='\033[0;32m' Y='\033[1;33m' R='\033[0;31m' B='\033[0;34m' NC='\033[0m'

echo -e "${B}🚀 Atiketet - Instalação Automática${NC}"
echo "============================================="

# Verificar root
[[ $EUID -ne 0 ]] && { echo -e "${R}❌ Execute como root: sudo bash -c \"\$(curl -sSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/install.sh)\"${NC}"; exit 1; }

# Preparar sistema
echo -e "${Y}📦 Preparando sistema...${NC}"
apt update -qq && apt upgrade -y -qq
apt install -y -qq sudo git curl lsb-release

# Baixar e instalar
echo -e "${Y}📥 Baixando Atiketet...${NC}"
rm -rf atiketet
git clone -q https://github.com/DEV7Kadu/My-Tycket.git atiketet
cd atiketet
chmod +x ./atiketet

# Executar
echo -e "${G}🎯 Iniciando instalação...${NC}"
./atiketet