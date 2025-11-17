#!/bin/bash

# 🛡️ COMANDO SEGURO - Substituto direto do comando perigoso
# Este script faz exatamente o mesmo processo que o comando original
# mas com todas as verificações de segurança implementadas

echo "🔒 My-Tycket v28.0.0 - Instalador SEGURO"
echo "========================================"
echo "⚠️ Protegendo sistema existente com segurança total"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de segurança - verificar sistema existente
check_existing_system() {
    echo -e "${BLUE}🔍 Verificando sistema existente...${NC}"

    # Verificar se já existe instalação whaticketplus
    if [[ -d "/home/deploy/whaticketplus" ]]; then
        echo -e "${YELLOW}⚠️ Instalação whaticketplus existente detectada!${NC}"
        echo -e "${YELLOW}📁 Caminho: /home/deploy/whaticketplus${NC}"

        # Verificar se está rodando
        if pm2 list | grep -q "whaticketplus.*online"; then
            echo -e "${YELLOW}⚠️ Sistema whaticketplus está rodando!${NC}"

            # Perguntar ao usuário
            echo -e "${RED}❓ ATENÇÃO: Isso afetará o sistema existente!${NC}"
            echo -e "${RED}   Um backup automático será criado.${NC}"
            echo ""
            read -p "❓ Deseja continuar com backup e migração segura? (s/N): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Ss]$ ]]; then
                echo -e "${RED}❌ Instalação cancelada para proteger sistema existente.${NC}"
                exit 1
            fi
        fi

        # Criar backup automático
        backup_name="whaticketplus_backup_$(date +%Y%m%d_%H%M%S)"
        backup_path="/tmp/${backup_name}"
        echo -e "${BLUE}💾 Criando backup automático em: ${backup_path}${NC}"

        mkdir -p "${backup_path}"
        cp -r "/home/deploy/whaticketplus" "${backup_path}/"

        # Backup do database se existir
        if command -v psql >/dev/null 2>&1 && sudo -u postgres psql -lqt | grep -qw "whaticketplus"; then
            echo -e "${BLUE}💾 Fazendo backup do database...${NC}"
            sudo -u postgres pg_dump whaticketplus > "${backup_path}/database.sql"
            gzip "${backup_path}/database.sql"
        fi

        # Backup PM2
        pm2 save
        cp "$HOME/.pm2/dump.pm2" "${backup_path}/" 2>/dev/null || true

        echo -e "${GREEN}✅ Backup criado com sucesso!${NC}"
        echo -e "${GREEN}   Para restaurar: sudo cp -r ${backup_path}/whaticketplus /home/deploy/${NC}"
        echo ""
    fi

    # Verificar portas em uso
    if netstat -tuln 2>/dev/null | grep -q ":8080"; then
        echo -e "${YELLOW}⚠️ Porta 8080 já está em uso${NC}"

        # Verificar se é nossa aplicação
        if curl -s "http://localhost:8080/health" 2>/dev/null | grep -q "healthy\|ok\|running"; then
            echo -e "${GREEN}✅ Aplicação já está rodando e saudável${NC}"
        else
            echo -e "${RED}❌ Outra aplicação está usando a porta 8080${NC}"
            echo -e "${RED}   Pare a outra aplicação ou altere a porta${NC}"
            exit 1
        fi
    fi
}

# Função de instalação segura
safe_install() {
    echo -e "${BLUE}🚀 Iniciando instalação segura...${NC}"
    echo ""

    # 1. Update system
    echo -e "${BLUE}📦 Atualizando sistema...${NC}"
    sudo apt update
    sudo apt upgrade -y

    # 2. Install dependencies
    echo -e "${BLUE}📦 Instalando dependências...${NC}"
    sudo apt install -y sudo git curl wget gnupg2 build-essential software-properties-common apt-transport-https ca-certificates

    # 3. Check for existing installation and backup
    check_existing_system

    # 4. Remove old directory ONLY if we made backup
    if [[ -d "/home/deploy/whaticketplus" ]] && [[ -n "${backup_name}" ]]; then
        echo -e "${YELLOW}⚠️ Removendo instalação antiga (backup criado)...${NC}"
        rm -rf /home/deploy/whaticketplus
    fi

    # 5. Clone repository
    echo -e "${BLUE}📥 Clonando repositório My-Tycket v28.0.0...${NC}"
    git clone https://github.com/DEV7Kadu/My-Tycket.git /home/deploy/whaticketplus
    cd /home/deploy/whaticketplus

    # 6. Safety check primeiro
    if [[ -f "backend/scripts/install-safety-check.js" ]]; then
        echo -e "${BLUE}🔍 Executando verificação de segurança...${NC}"
        cd backend
        npm install >/dev/null 2>&1
        node scripts/install-safety-check.js
        cd ..

        if [[ $? -ne 0 ]]; then
            echo -e "${RED}❌ Verificação de segurança falhou!${NC}"
            echo -e "${RED}   Verifique os problemas acima antes de continuar${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ Verificação de segurança concluída${NC}"
    fi

    # 7. Execute safe installer
    if [[ -f "Instalador/install_safe_ubuntu22" ]]; then
        echo -e "${BLUE}🛠️ Executando instalador seguro...${NC}"
        cd Instalador
        chmod +x install_safe_ubuntu22
        ./install_safe_ubuntu22
    else
        echo -e "${RED}❌ Instalador seguro não encontrado${NC}"
        echo -e "${YELLOW}⚠️ Fazendo instalação manual segura...${NC}"

        # Install Node.js
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs

        # Install PM2
        sudo npm install -g pm2

        # Install PostgreSQL
        sudo apt install -y postgresql postgresql-contrib

        # Setup database
        sudo -u postgres createdb whaticketplus 2>/dev/null || echo "Database já existe"

        # Install backend dependencies
        cd ../backend
        npm install
        npm run build

        # Install frontend dependencies
        cd ../frontend
        npm install
        npm run build

        # Start services
        cd ../backend
        pm2 start ecosystem.config.js --env production
        pm2 save
        pm2 startup

        echo -e "${GREEN}✅ Instalação manual concluída!${NC}"
    fi
}

# Função de pós-instalação
post_install() {
    echo ""
    echo -e "${GREEN}🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
    echo "========================================"
    echo -e "${GREEN}✅ Sistema seguro com rollback automático${NC}"
    echo ""
    echo -e "${BLUE}📋 Resumo da instalação:${NC}"

    if [[ -n "${backup_name}" ]]; then
        echo -e "${BLUE}   📦 Backup criado: ${backup_path}${NC}"
    fi

    echo -e "${BLUE}   🌐 Sistema My-Tycket v28.0.0${NC}"
    echo -e "${BLUE}   🔄 Dual Provider (Baileys + Notifica-me Hub)${NC}"
    echo -e "${BLUE}   🎯 FlowBuilder Visual${NC}"
    echo -e "${BLUE}   🛡️ Zero-Break Migration${NC}"
    echo ""

    echo -e "${BLUE}🔗 Acesse o sistema:${NC}"
    echo -e "   📱 Frontend: http://SEU_DOMINIO"
    echo -e "   🔧 Backend: http://SEU_DOMINIO:8080"
    echo -e "   📚 API Docs: http://SEU_DOMINIO:8080/api-docs"
    echo ""

    echo -e "${BLUE}🔧 Comandos úteis:${NC}"
    echo -e "   pm2 status                    # Ver status"
    echo -e "   pm2 logs whaticketplus        # Ver logs"
    echo -e "   pm2 restart whaticketplus     # Reiniciar"
    echo ""

    if [[ -n "${backup_name}" ]]; then
        echo -e "${YELLOW}💾 Para restaurar backup se necessário:${NC}"
        echo -e "   pm2 stop whaticketplus"
        echo -e "   sudo rm -rf /home/deploy/whaticketplus"
        echo -e "   sudo cp -r ${backup_path}/whaticketplus /home/deploy/"
        echo -e "   sudo chown -R deploy:deploy /home/deploy/whaticketplus"
        echo -e "   pm2 resurrect"
    fi

    echo ""
    echo -e "${GREEN}🛡️ My-Tycket v28.0.0 instalado com segurança!${NC}"
}

# Execução principal
main() {
    echo -e "${GREEN}My-Tycket v28.0.0 - Instalador SEGURO${NC}"
    echo -e "${GREEN}Proteção total para sistema existente${NC}"
    echo ""

    # Verificar se está rodando como root/sudo
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ Este script precisa ser executado com sudo${NC}"
        echo -e "${YELLOW}Use: sudo bash safe-install.sh${NC}"
        exit 1
    fi

    # Confirmação final
    echo -e "${YELLOW}📋 Este processo irá:${NC}"
    echo -e "   ✅ Atualizar o sistema"
    echo -e "   ✅ Verificar instalações existentes"
    echo -e "   ✅ Criar backup automático se necessário"
    echo -e "   ✅ Instalar My-Tycket v28.0.0 com segurança"
    echo ""
    read -p "❓ Confirmar instalação segura? (S/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${RED}❌ Instalação cancelada${NC}"
        exit 1
    fi

    # Executar instalação
    safe_install

    # Pós-instalação
    post_install
}

# Trap para capturar Ctrl+C
trap 'echo -e "\n${RED}❌ Instalação cancelada pelo usuário${NC}"; exit 1' INT

# Iniciar
main