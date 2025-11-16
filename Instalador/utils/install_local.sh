#!/bin/bash

# Atiketet - Script de Instalação Rápida
# Ubuntu Server 22.04 LTS - Otimizado

set -e

# Cores para melhor visualização
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
clear
echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║            🚀 ATIKETET INSTALLER v2.0                  ║"
echo "║                                                        ║"
echo "║         📱 Sistema de Atendimento WhatsApp             ║"
echo "║         ⚡ Instalação Otimizada Ubuntu 22.04           ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Verificar privilégios
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ Execute como root: sudo bash install.sh${NC}"
    exit 1
fi

# Detectar sistema
UBUNTU_VERSION=$(lsb_release -rs 2>/dev/null || echo "unknown")
echo -e "${CYAN}🔍 Sistema detectado: Ubuntu ${UBUNTU_VERSION}${NC}"

# Validar compatibilidade
case $UBUNTU_VERSION in
    "20.04"|"22.04"|"24.04")
        echo -e "${GREEN}✅ Sistema compatível${NC}"
        ;;
    *)
        echo -e "${YELLOW}⚠️ Sistema não testado - Versões recomendadas: 20.04, 22.04, 24.04${NC}"
        read -p "Continuar? (y/N): " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
        ;;
esac

# Atualizar sistema
echo -e "\n${YELLOW}📦 Preparando sistema...${NC}"
apt update -qq && apt upgrade -y -qq
apt install -y -qq sudo git curl wget lsb-release software-properties-common

# Executar instalação baseada na versão
if [[ "$UBUNTU_VERSION" == "22.04" ]] || [[ "$UBUNTU_VERSION" == "24.04" ]]; then
    echo -e "${GREEN}🎯 Usando instalador otimizado Ubuntu 22/24${NC}"
    exec ./Instalador/install_ubuntu22
else
    echo -e "${GREEN}🎯 Usando instalador Ubuntu 20.04${NC}"
    exec ./Instalador/install_primaria
fi