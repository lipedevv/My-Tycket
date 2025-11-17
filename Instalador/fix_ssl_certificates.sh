#!/bin/bash
# Script para corrigir problemas de certificados SSL quando Let's Encrypt
# gera certificados separados para cada domínio

echo "🔧 Corrigindo Certificados SSL - My-Tycket Plus"
echo "=========================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detectar instalação
detect_installation() {
    if [[ -d "/home/deploy" ]]; then
        INSTANCE_DIRS=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
        if [[ ! -z "$INSTANCE_DIRS" ]]; then
            INSTANCE_NAME=$(basename "$INSTANCE_DIRS")
            echo -e "${GREEN}✅ Instância encontrada: $INSTANCE_NAME${NC}"

            # Ler configurações do arquivo .env
            if [[ -f "/home/deploy/$INSTANCE_NAME/Código Fonte/backend/.env" ]]; then
                source "/home/deploy/$INSTANCE_NAME/Código Fonte/backend/.env"
                FRONTEND_URL=${FRONTEND_URL:-"https://painel.whaticketplus.com"}
                BACKEND_URL=${BACKEND_URL:-"https://wapi.whaticketplus.com"}
            else
                FRONTEND_URL="https://painel.whaticketplus.com"
                BACKEND_URL="https://wapi.whaticketplus.com"
            fi
        else
            echo -e "${RED}❌ Nenhuma instância encontrada${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Diretório /home/deploy não encontrado${NC}"
        exit 1
    fi

    FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')
    BACKEND_DOMAIN=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')

    echo ""
    echo -e "${BLUE}📋 Domínios detectados:${NC}"
    echo -e "   Frontend: ${YELLOW}$FRONTEND_DOMAIN${NC}"
    echo -e "   Backend:  ${YELLOW}$BACKEND_DOMAIN${NC}"
}

# Verificar situação atual dos certificados
check_certificates() {
    echo ""
    echo -e "${BLUE}🔍 Verificando situação atual dos certificados...${NC}"

    # Verificar certificados existentes
    local frontend_cert_exists=false
    local backend_cert_exists=false

    if [[ -d "/etc/letsencrypt/live/$FRONTEND_DOMAIN" ]]; then
        if [[ -f "/etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem" ]]; then
            frontend_cert_exists=true
            echo -e "   ✅ Certificado Frontend: ${GREEN}Existe${NC}"

            # Verificar validade
            local expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
            if [[ -n "$expiry_date" ]]; then
                echo -e "      📅 Expira em: ${YELLOW}$expiry_date${NC}"
            fi
        else
            echo -e "   ❌ Certificado Frontend: ${RED}Arquivos faltando${NC}"
        fi
    else
        echo -e "   ❌ Certificado Frontend: ${RED}Não existe${NC}"
    fi

    if [[ -d "/etc/letsencrypt/live/$BACKEND_DOMAIN" ]]; then
        if [[ -f "/etc/letsencrypt/live/$BACKEND_DOMAIN/fullchain.pem" ]]; then
            backend_cert_exists=true
            echo -e "   ✅ Certificado Backend: ${GREEN}Existe${NC}"

            # Verificar validade
            local expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$BACKEND_DOMAIN/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
            if [[ -n "$expiry_date" ]]; then
                echo -e "      📅 Expira em: ${YELLOW}$expiry_date${NC}"
            fi
        else
            echo -e "   ❌ Certificado Backend: ${RED}Arquivos faltando${NC}"
        fi
    else
        echo -e "   ❌ Certificado Backend: ${RED}Não existe${NC}"
    fi

    echo ""
    if [[ "$frontend_cert_exists" == true ]] && [[ "$backend_cert_exists" == true ]]; then
        echo -e "   ${GREEN}✅ Ambos certificados existem${NC}"
        return 0
    else
        echo -e "   ${YELLOW}⚠️ Certificados incompletos - precisam ser gerados${NC}"
        return 1
    fi
}

# Gerar certificados individuais
generate_certificates() {
    echo ""
    echo -e "${BLUE}🔐 Gerando certificados individuais para cada domínio...${NC}"

    local email="admin@$FRONTEND_DOMAIN"

    # Gerar certificado para o frontend
    echo ""
    echo -e "${BLUE}📋 1. Gerando certificado para Frontend ($FRONTEND_DOMAIN)...${NC}"

    if sudo certbot --nginx \
            --agree-tos \
            --non-interactive \
            --domains "$FRONTEND_DOMAIN" \
            --email "$email" \
            --force-renewal; then
        echo -e "   ${GREEN}✅ Certificado Frontend gerado com sucesso${NC}"
    else
        echo -e "   ${RED}❌ Falha ao gerar certificado Frontend${NC}"
        return 1
    fi

    # Gerar certificado para o backend
    echo ""
    echo -e "${BLUE}📋 2. Gerando certificado para Backend ($BACKEND_DOMAIN)...${NC}"

    if sudo certbot --nginx \
            --agree-tos \
            --non-interactive \
            --domains "$BACKEND_DOMAIN" \
            --email "$email" \
            --force-renewal; then
        echo -e "   ${GREEN}✅ Certificado Backend gerado com sucesso${NC}"
    else
        echo -e "   ${RED}❌ Falha ao gerar certificado Backend${NC}"
        return 1
    fi

    echo ""
    echo -e "${GREEN}✅ Ambos certificados gerados com sucesso${NC}"
    return 0
}

# Configurar Nginx com certificados individuais
configure_nginx() {
    echo ""
    echo -e "${BLUE}⚙️ Configurando Nginx com certificados individuais...${NC}"

    # Configuração para o Frontend
    sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-frontend > /dev/null << EOF
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $FRONTEND_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FRONTEND_DOMAIN/privkey.pem;

    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 24h;
    }
}
EOF

    # Configuração para o Backend
    sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-backend > /dev/null << EOF
server {
    listen 80;
    server_name $BACKEND_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $BACKEND_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$BACKEND_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$BACKEND_DOMAIN/privkey.pem;

    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 24h;
    }
}
EOF

    # Ativar sites
    sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-frontend /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-backend /etc/nginx/sites-enabled/

    echo -e "   ${GREEN}✅ Configurações Nginx criadas${NC}"
}

# Testar e recarregar Nginx
test_reload_nginx() {
    echo ""
    echo -e "${BLUE}🔄 Testando e recarregando Nginx...${NC}"

    # Testar configuração
    if sudo nginx -t; then
        echo -e "   ${GREEN}✅ Configuração Nginx válida${NC}"

        # Recarregar Nginx
        if sudo systemctl reload nginx; then
            echo -e "   ${GREEN}✅ Nginx recarregado com sucesso${NC}"
        else
            echo -e "   ${YELLOW}⚠️ Reload falhou, tentando restart...${NC}"
            if sudo systemctl restart nginx; then
                echo -e "   ${GREEN}✅ Nginx reiniciado com sucesso${NC}"
            else
                echo -e "   ${RED}❌ Falha ao reiniciar Nginx${NC}"
                return 1
            fi
        fi
    else
        echo -e "   ${RED}❌ Erro na configuração do Nginx${NC}"
        echo -e "   📋 Verificando erros:"
        sudo nginx -t 2>&1 | head -10
        return 1
    fi

    return 0
}

# Testar acesso aos domínios
test_access() {
    echo ""
    echo -e "${BLUE}🧪 Testando acesso aos domínios...${NC}"

    # Testar Frontend
    echo -e "   🌐 Testando Frontend: https://$FRONTEND_DOMAIN"
    if curl -s -k -I "https://$FRONTEND_DOMAIN" | head -1 | grep -q "200\|301\|302"; then
        echo -e "   ${GREEN}✅ Frontend: Respondendo${NC}"
    else
        echo -e "   ${YELLOW}⚠️ Frontend: Pode estar com problemas${NC}"
    fi

    # Testar Backend
    echo -e "   🔗 Testando Backend: https://$BACKEND_DOMAIN"
    if curl -s -k -I "https://$BACKEND_DOMAIN" | head -1 | grep -q "200\|301\|302"; then
        echo -e "   ${GREEN}✅ Backend: Respondendo${NC}"
    else
        echo -e "   ${YELLOW}⚠️ Backend: Pode estar com problemas${NC}"
    fi
}

# Mostrar resumo final
show_summary() {
    echo ""
    echo -e "${GREEN}✅ CORREÇÃO DE CERTIFICADOS CONCLUÍDA!${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}📋 Certificados configurados:${NC}"
    echo -e "   🌐 Frontend: ${GREEN}https://$FRONTEND_DOMAIN${NC}"
    echo -e "   🔗 Backend:  ${GREEN}https://$BACKEND_DOMAIN${NC}"
    echo ""
    echo -e "${BLUE}📋 Informações dos certificados:${NC}"

    if [[ -f "/etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem" ]]; then
        local expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        echo -e "   📅 Expiração Frontend: ${YELLOW}$expiry_date${NC}"
    fi

    if [[ -f "/etc/letsencrypt/live/$BACKEND_DOMAIN/fullchain.pem" ]]; then
        local expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$BACKEND_DOMAIN/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        echo -e "   📅 Expiração Backend: ${YELLOW}$expiry_date${NC}"
    fi

    echo ""
    echo -e "${BLUE}🔄 Renovação automática:${NC}"
    echo -e "   ✅ Configurada via Certbot (verifica diariamente)"
    echo ""
    echo -e "${BLUE}🔧 Comandos úteis:${NC}"
    echo -e "   • Verificar status: ${YELLOW}sudo certbot certificates${NC}"
    echo -e "   • Renovar manual: ${YELLOW}sudo certbot renew${NC}"
    echo -e "   • Testar Nginx: ${YELLOW}sudo nginx -t${NC}"
    echo -e "   • Recarregar Nginx: ${YELLOW}sudo systemctl reload nginx${NC}"
    echo ""
    echo -e "${GREEN}🎉 Seus domínios agora estão protegidos com SSL individual!${NC}"
}

# Função principal
main() {
    echo -e "${GREEN}🚀 Iniciando correção de certificados SSL...${NC}"

    detect_installation

    # Verificar situação atual
    if check_certificates; then
        echo ""
        echo -e "${GREEN}✅ Certificados já estão configurados corretamente${NC}"

        # Mesmo assim, configurar Nginx para garantir
        configure_nginx
        test_reload_nginx
    else
        echo ""
        echo -e "${YELLOW}⚠️ Certificados incompletos, gerando novos...${NC}"

        if generate_certificates; then
            configure_nginx
            test_reload_nginx
        else
            echo -e "${RED}❌ Falha ao gerar certificados${NC}"
            exit 1
        fi
    fi

    test_access
    show_summary
}

# Executar função principal
main "$@"