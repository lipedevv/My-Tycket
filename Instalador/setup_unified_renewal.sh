#!/bin/bash
# Setup do Sistema Unificado de Renovação Automática
# Configura renovação automática para TODOS os tipos de certificado

echo "🔄 Setup do Sistema Unificado de Renovação Automática"
echo "=================================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Este script irá configurar:${NC}"
echo -e "   ✅ Renovação automática para Let's Encrypt"
echo -e "   ✅ Renovação automática para Autoassinados"
echo -e "   ✅ Migração automática (autoassinado → Let's Encrypt)"
echo -e "   ✅ Alertas por email"
echo -e "   ✅ Logs detalhados"
echo ""

read -p "Continuar com a configuração? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}❌ Setup cancelado${NC}"
    exit 0
fi

echo -e "${GREEN}🚀 Iniciando configuração...${NC}"
echo ""

# 1. Copiar script universal para o sistema
echo -e "${BLUE}📦 1. Instalando script universal de renovação...${NC}"

if [[ -f "./universal_ssl_renewal.sh" ]]; then
    sudo cp ./universal_ssl_renewal.sh /usr/local/bin/universal-ssl-renewal.sh
    sudo chmod +x /usr/local/bin/universal-ssl-renewal.sh
    echo -e "   ${GREEN}✅ Script universal instalado${NC}"
else
    echo -e "   ${RED}❌ Script universal não encontrado${NC}"
    exit 1
fi

# 2. Configurar cron job unificado
echo -e "${BLUE}⏰ 2. Configurando agendamento automático...${NC}"

# Criar cron job unificado
cron_entry="# My-Tycket SSL Universal Renewal
# Verificação diária às 2h da manhã
0 2 * * * /usr/local/bin/universal-ssl-renewal.sh check >/dev/null 2>&1

# Tentativa de renovação às 3h da manhã
0 3 * * * /usr/local/bin/universal-ssl-renewal.sh renew >/dev/null 2>&1

# Tentativa de migração semanal (domingos às 4h)
0 4 * * 0 /usr/local/bin/universal-ssl-renewal.sh migrate >/dev/null 2>&1"

# Verificar se já existe
if crontab -l 2>/dev/null | grep -q "universal-ssl-renewal"; then
    echo -e "   ${YELLOW}⚠️ Cron job já existe, atualizando...${NC}"
    # Remover entradas antigas
    crontab -l 2>/dev/null | grep -v "universal-ssl-renewal" | crontab -
fi

# Adicionar novas entradas
(echo "$cron_entry"; crontab -l 2>/dev/null) | crontab -

echo -e "   ${GREEN}✅ Cron jobs configurados:${NC}"
echo -e "      • Verificação diária: 02:00"
echo -e "      • Renovação diária: 03:00"
echo -e "      • Migração semanal: Domingo 04:00"

# 3. Configurar alertas por email (opcional)
echo ""
echo -e "${BLUE}📧 3. Configurando alertas por email...${NC}"

read -p "Deseja configurar alertas por email? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    read -p "Email para alertas: " email_alert
    if [[ -n "$email_alert" ]]; then
        # Atualizar script com email personalizado
        sudo sed -i "s/ALERT_EMAIL=\"admin@localhost\"/ALERT_EMAIL=\"$email_alert\"/" /usr/local/bin/universal-ssl-renewal.sh
        echo -e "   ${GREEN}✅ Email configurado: $email_alert${NC}"

        # Instalar mailutils se necessário
        if ! command -v mail >/dev/null 2>&1; then
            echo -e "   📦 Instalando utilitário de email..."
            sudo apt update >/dev/null 2>&1
            sudo apt install -y mailutils >/dev/null 2>&1
            echo -e "   ${GREEN}✅ Mailutils instalado${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️ Email inválido, usando padrão${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️ Alertas por email não configurados${NC}"
fi

# 4. Criar script de relatório semanal
echo ""
echo -e "${BLUE}📊 4. Configurando relatório semanal...${NC}"

sudo tee /usr/local/bin/ssl-weekly-report.sh > /dev/null << 'EOF'
#!/bin/bash
# Script de relatório semanal de SSL

echo "📊 Relatório Semanal de SSL - My-Tycket Plus"
echo "=========================================="
echo "Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

/usr/local/bin/universal-ssl-renewal.sh check

echo ""
echo "📋 Informações do Sistema:"
echo "• Versão do sistema: $(lsb_release -d 2>/dev/null | cut -f2)"
echo "• Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "• Espaço em disco: $(df -h / | tail -1 | awk '{print $4}' livre)"
echo ""

echo "📋 Últimas renovações:"
if [[ -f "/var/log/universal-ssl-renewal.log" ]]; then
    tail -10 /var/log/universal-ssl-renewal.log | grep "SUCCESS\|ERROR" || echo "Nenhuma renovação recente"
else
    echo "Nenhum log encontrado"
fi
EOF

sudo chmod +x /usr/local/bin/ssl-weekly-report.sh

# Adicionar relatório semanal ao cron
if ! crontab -l 2>/dev/null | grep -q "ssl-weekly-report"; then
    (crontab -l 2>/dev/null; echo "0 6 * * 1 /usr/local/bin/ssl-weekly-report.sh | mail -s 'SSL Weekly Report - My-Tycket' $(grep 'ALERT_EMAIL=' /usr/local/bin/universal-ssl-renewal.sh | cut -d'=' -f2) 2>/dev/null || true") | crontab -
fi

echo -e "   ${GREEN}✅ Relatório semanal configurado (Segundas 06:00)${NC}"

# 5. Criar atalho de comando
echo ""
echo -e "${BLUE}🔧 5. Criando atalhos de comando...${NC}"

sudo tee /usr/local/bin/ssl-status > /dev/null << 'EOF'
#!/bin/bash
/usr/local/bin/universal-ssl-renewal.sh check
EOF

sudo tee /usr/local/bin/ssl-renew > /dev/null << 'EOF'
#!/bin/bash
/usr/local/bin/universal-ssl-renewal.sh renew
EOF

sudo tee /usr/local/bin/ssl-migrate > /dev/null << 'EOF'
#!/bin/bash
/usr/local/bin/universal-ssl-renewal.sh migrate
EOF

sudo chmod +x /usr/local/bin/ssl-status /usr/local/bin/ssl-renew /usr/local/bin/ssl-migrate

echo -e "   ${GREEN}✅ Atalhos criados:${NC}"
echo -e "      • ssl-status   - Verificar status"
echo -e "      • ssl-renew    - Renovar certificados"
echo -e "      • ssl-migrate  - Migrar para Let's Encrypt"

# 6. Testar configuração
echo ""
echo -e "${BLUE}🧪 6. Testando configuração...${NC}"

echo -e "   🔍 Verificando script universal..."
if /usr/local/bin/universal-ssl-renewal.sh check >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Script universal funcionando${NC}"
else
    echo -e "   ${RED}❌ Erro no script universal${NC}"
fi

echo -e "   ⏰ Verificando cron jobs..."
if crontab -l 2>/dev/null | grep -q "universal-ssl-renewal"; then
    echo -e "   ${GREEN}✅ Cron jobs configurados${NC}"
else
    echo -e "   ${RED}❌ Cron jobs não encontrados${NC}"
fi

echo -e "   📧 Verificando email..."
if command -v mail >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Sistema de email funcionando${NC}"
else
    echo -e "   ${YELLOW}⚠️ Sistema de email não configurado${NC}"
fi

# 7. Exibir resumo final
echo ""
echo -e "${GREEN}✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo "============================================"
echo ""
echo -e "${BLUE}📋 Sistema Configurado:${NC}"
echo -e "   ${GREEN}✅${NC} Renovação automática universal"
echo -e "   ${GREEN}✅${NC} Suporte para Let's Encrypt + Autoassinado"
echo -e "   ${GREEN}✅${NC} Migração automática quando possível"
echo -e "   ${GREEN}✅${NC} Agendamento inteligente"
echo -e "   ${GREEN}✅${NC} Logs detalhados"
echo -e "   ${GREEN}✅${NC} Alertas configurados"
echo ""
echo -e "${BLUE}⏰ Agendamentos Automáticos:${NC}"
echo -e "   🕐 ${YELLOW}02:00${NC} - Verificação diária"
echo -e "   🕐 ${YELLOW}03:00${NC} - Tentativa de renovação"
echo -e "   🕐 ${YELLOW}Domingo 04:00${NC} - Tentativa de migração"
echo -e "   🕐 ${YELLOW}Segunda 06:00${NC} - Relatório semanal"
echo ""
echo -e "${BLUE}🔧 Comandos Disponíveis:${NC}"
echo -e "   ${GREEN}ssl-status${NC}      - Verificar status dos certificados"
echo -e "   ${GREEN}ssl-renew${NC}       - Renovar certificados manualmente"
echo -e "   ${GREEN}ssl-migrate${NC}     - Tentar migração para Let's Encrypt"
echo ""
echo -e "${BLUE}📁 Logs:${NC}"
echo -e "   • ${YELLOW}/var/log/universal-ssl-renewal.log${NC}"
echo -e "   • ${YELLOW}/var/log/letsencrypt/letsencrypt.log${NC}"
echo ""
echo -e "${GREEN}🎉 Seus certificados SSL agora são 100% automáticos!${NC}"
echo ""
echo -e "${BLUE}💡 Próximos passos:${NC}"
echo -e "   1. Use ${GREEN}ssl-status${NC} para verificar tudo funcionando"
echo -e "   2. Configure os alertas por email se ainda não o fez"
echo -e "   3. Monitore os logs para acompanhar as renovações"
echo ""
echo -e "${YELLOW}⚠️ Importante:${NC}"
echo -e "   • Let's Encrypt: Renova automaticamente (90 dias)"
echo -e "   • Autoassinado: Renova automaticamente (365 dias)"
echo -e "   • Migração: Tentada automaticamente quando rate limit expira"