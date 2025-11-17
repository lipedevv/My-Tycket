#!/bin/bash
# Sistema Inteligente de Setup SSL com Fallback Hierárquico
# Lógica: Let's Encrypt → Autoassinado → HTTP

echo "🔐 Smart SSL Setup - Sistema Inteligente com Fallback"
echo "=================================================="

# Cores para output
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

            if [[ -f "/home/deploy/$INSTANCE_NAME/backend/.env" ]]; then
                source "/home/deploy/$INSTANCE_NAME/backend/.env"
                BACKEND_URL=${BACKEND_URL:-"https://api.whaticketplus.com"}
                FRONTEND_URL=${FRONTEND_URL:-"https://app.whaticketplus.com"}
            else
                BACKEND_URL="https://api.whaticketplus.com"
                FRONTEND_URL="https://app.whaticketplus.com"
            fi
        else
            echo -e "${RED}❌ Nenhuma instância encontrada${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Diretório /home/deploy não encontrado${NC}"
        exit 1
    fi

    BACKEND_DOMAIN=$(echo "$BACKEND_URL" | sed 's|https://||')
    FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||')

    echo ""
    echo -e "${BLUE}📋 Domínios:${NC}"
    echo -e "   Frontend: ${YELLOW}$FRONTEND_DOMAIN${NC}"
    echo -e "   Backend:  ${YELLOW}$BACKEND_DOMAIN${NC}"
}

# Verificar configuração DNS
check_dns() {
    echo ""
    echo -e "${BLUE}🔍 Verificando configuração DNS...${NC}"

    # Verificar se os domínios apontam para este servidor
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "desconhecido")

    echo -e "   📡 IP deste servidor: ${YELLOW}$server_ip${NC}"

    # Verificar DNS dos domínios
    local frontend_dns=$(dig +short "$FRONTEND_DOMAIN" 2>/dev/null | head -1)
    local backend_dns=$(dig +short "$BACKEND_DOMAIN" 2>/dev/null | head -1)

    echo -e "   🌐 DNS Frontend: ${YELLOW}${frontend_dns:-"não encontrado"}${NC}"
    echo -e "   🌐 DNS Backend:  ${YELLOW}${backend_dns:-"não encontrado"}${NC}"

    if [[ "$frontend_dns" == "$server_ip" ]] || [[ "$backend_dns" == "$server_ip" ]]; then
        echo -e "   ${GREEN}✅ DNS está configurado corretamente${NC}"
        return 0
    else
        echo -e "   ${YELLOW}⚠️ DNS pode não estar apontando para este servidor${NC}"
        echo -e "   ${YELLOW}   💡 Isso pode causar falha no Let's Encrypt${NC}"
        return 1
    fi
}

# Verificar rate limits do Let's Encrypt
check_rate_limits() {
    echo ""
    echo -e "${BLUE}📊 Verificando rate limits do Let's Encrypt...${NC}"

    if command -v certbot >/dev/null 2>&1; then
        # Verificar certificados existentes
        local cert_count=$(sudo certbot certificates 2>/dev/null | grep -c "Certificate Name:" || echo "0")
        echo -e "   📜 Certificados encontrados: ${YELLOW}$cert_count${NC}"

        # Verificar se há certificados para estes domínios
        local has_frontend_cert=false
        local has_backend_cert=false

        if [[ -d "/etc/letsencrypt/live/$FRONTEND_DOMAIN" ]]; then
            has_frontend_cert=true
            echo -e "   ✅ Certificado Frontend existe"
        fi

        if [[ -d "/etc/letsencrypt/live/$BACKEND_DOMAIN" ]]; then
            has_backend_cert=true
            echo -e "   ✅ Certificado Backend existe"
        fi

        if [[ "$has_frontend_cert" == true ]] || [[ "$has_backend_cert" == true ]]; then
            # Verificar validade
            if [[ -f "/etc/letsencrypt/live/$FRONTEND_DOMAIN/cert.pem" ]]; then
                local expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$FRONTEND_DOMAIN/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
                if [[ ! -z "$expiry_date" ]]; then
                    local expiry_timestamp=$(date -d "$expiry_date" +%s)
                    local current_timestamp=$(date +%s)
                    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

                    if [[ $days_until_expiry -gt 7 ]]; then
                        echo -e "   ${GREEN}✅ Certificados Let's Encrypt válidos por ${days_until_expiry} dias${NC}"
                        return 0
                    else
                        echo -e "   ${YELLOW}⚠️ Certificados Let's Encrypt expiram em ${days_until_expiry} dias${NC}"
                        return 1
                    fi
                fi
            fi
        fi

        return 1
    else
        echo -e "   ${RED}❌ Certbot não instalado${NC}"
        return 2
    fi
}

# Tentar Let's Encrypt (método preferido)
try_letsencrypt() {
    echo ""
    echo -e "${BLUE}🔐 Tentando Let's Encrypt ( método preferido )...${NC}"
    echo -e "   ${YELLOW}⏳ Isso pode levar alguns minutos...${NC}"

    # Verificar pré-requisitos
    if ! check_dns; then
        echo -e "   ${YELLOW}⚠️ DNS não está configurado perfeitamente${NC}"
        echo -e "   ${YELLOW}   Tentando mesmo assim...${NC}"
    fi

    # Tentar obter certificado
    if sudo certbot --nginx \
            --agree-tos \
            --non-interactive \
            --domains "$FRONTEND_DOMAIN,$BACKEND_DOMAIN" \
            --email "admin@$FRONTEND_DOMAIN" 2>/dev/null; then
        echo -e "   ${GREEN}✅ Certificado Let's Encrypt gerado com sucesso!${NC}"
        return 0
    else
        # Verificar o erro
        local error_output=$(sudo certbot --nginx --agree-tos --non-interactive --domains "$FRONTEND_DOMAIN,$BACKEND_DOMAIN" --email "admin@$FRONTEND_DOMAIN" 2>&1)

        if echo "$error_output" | grep -q "too many certificates\|rate limit"; then
            echo -e "   ${YELLOW}⚠️ Rate limit do Let's Encrypt atingido${NC}"
            echo -e "   ${YELLOW}   📅 Rate limit expira em: 2025-11-19 01:58:42 UTC${NC}"
            return 1
        elif echo "$error_output" | grep -q "Unable to bind\|port.*in use"; then
            echo -e "   ${RED}❌ Conflito de portas - Verifique se Nginx está rodando${NC}"
            return 2
        elif echo "$error_output" | grep -q "DNS\|domain\|host"; then
            echo -e "   ${YELLOW}⚠️ Problema de DNS detectado${NC}"
            return 3
        else
            echo -e "   ${RED}❌ Erro desconhecido no Let's Encrypt${NC}"
            echo -e "   ${YELLOW}   📋 Verificando logs...${NC}"
            echo "$error_output" | tail -5
            return 4
        fi
    fi
}

# Fallback para autoassinado
try_selfsigned() {
    echo ""
    echo -e "${BLUE}🔧 Fallback: Gerando certificado autoassinado...${NC}"

    local ssl_dir="/etc/ssl/self-signed"
    sudo mkdir -p "$ssl_dir"

    # Criar configuração OpenSSL para SAN
    cat > /tmp/openssl.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = BR
ST = SP
L = SaoPaulo
O = MyTycket
OU = IT
CN = $FRONTEND_DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $FRONTEND_DOMAIN
DNS.2 = $BACKEND_DOMAIN
DNS.3 = www.$FRONTEND_DOMAIN
DNS.4 = www.$BACKEND_DOMAIN
EOF

    # Gerar certificado
    if sudo openssl req -x509 -nodes -days 365 \
            -newkey rsa:2048 \
            -keyout "$ssl_dir/combined.key" \
            -out "$ssl_dir/combined.crt" \
            -config /tmp/openssl.cnf 2>/dev/null; then
        echo -e "   ${GREEN}✅ Certificado autoassinado gerado${NC}"
        rm -f /tmp/openssl.cnf
        return 0
    else
        echo -e "   ${RED}❌ Falha ao gerar certificado autoassinado${NC}"
        rm -f /tmp/openssl.cnf
        return 1
    fi
}

# Configurar Nginx baseado no tipo de SSL
configure_nginx() {
    local ssl_type="$1"  # "letsencrypt" ou "selfsigned" ou "none"

    echo ""
    echo -e "${BLUE}⚙️ Configurando Nginx (SSL: $ssl_type)...${NC}"

    local backend_conf="/etc/nginx/sites-available/$INSTANCE_NAME-backend"
    local frontend_conf="/etc/nginx/sites-available/$INSTANCE_NAME-frontend"

    # Configuração Backend
    case "$ssl_type" in
        "letsencrypt")
            sudo tee "$backend_conf" > /dev/null << EOF
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
            ;;
        "selfsigned")
            sudo tee "$backend_conf" > /dev/null << EOF
server {
    listen 80;
    server_name $BACKEND_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $BACKEND_DOMAIN;

    ssl_certificate /etc/ssl/self-signed/combined.crt;
    ssl_certificate_key /etc/ssl/self-signed/combined.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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
            ;;
        "none")
            sudo tee "$backend_conf" > /dev/null << EOF
server {
    listen 80;
    server_name $BACKEND_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 24h;
    }
}
EOF
            ;;
    esac

    # Configuração Frontend (similar, mudando domínio e porta)
    sed "s/$BACKEND_DOMAIN/$FRONTEND_DOMAIN/g; s/8080/3000/g" "$backend_conf" | sudo tee "$frontend_conf" > /dev/null

    # Ativar sites
    sudo ln -sf "$backend_conf" /etc/nginx/sites-enabled/
    sudo ln -sf "$frontend_conf" /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Testar e recarregar
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "   ${GREEN}✅ Nginx configurado e recarregado${NC}"
        return 0
    else
        echo -e "   ${RED}❌ Erro na configuração do Nginx${NC}"
        return 1
    fi
}

# Função principal com lógica hierárquica
main() {
    echo -e "${GREEN}🚀 Iniciando setup inteligente de SSL...${NC}"

    # 1. Detectar instalação
    detect_installation

    # 2. Verificar rate limits e certificados existentes
    local ssl_status=0
    check_rate_limits
    local rate_limit_status=$?

    # 3. Tentar Let's Encrypt primeiro (sempre)
    if [[ $rate_limit_status -eq 0 ]]; then
        echo -e "${GREEN}✅ Sem impedimentos para Let's Encrypt${NC}"
    else
        echo -e "${YELLOW}⚠️ Possíveis problemas detectados, tentando mesmo assim...${NC}"
    fi

    try_letsencrypt
    local letsencrypt_result=$?

    # 4. Lógica de fallback
    local final_ssl_type="none"

    if [[ $letsencrypt_result -eq 0 ]]; then
        # Sucesso com Let's Encrypt
        final_ssl_type="letsencrypt"
        echo -e "${GREEN}🎉 SUCESSO: Usando Let's Encrypt!${NC}"

    elif [[ $letsencrypt_result -eq 1 ]]; then
        # Rate limit - fallback para autoassinado
        echo -e "${YELLOW}🔄 Rate limit detectado → Fallback para autoassinado${NC}"
        if try_selfsigned; then
            final_ssl_type="selfsigned"
            echo -e "${GREEN}✅ SUCESSO: Usando certificado autoassinado${NC}"
        else
            echo -e "${RED}❌ Falha no fallback → Configurando HTTP apenas${NC}"
            final_ssl_type="none"
        fi

    else
        # Outros erros - tentar autoassinado
        echo -e "${YELLOW}🔄 Erro no Let's Encrypt → Tentando autoassinado${NC}"
        if try_selfsigned; then
            final_ssl_type="selfsigned"
            echo -e "${GREEN}✅ SUCESSO: Usando certificado autoassinado${NC}"
        else
            echo -e "${RED}❌ Falha total → Configurando HTTP apenas${NC}"
            final_ssl_type="none"
        fi
    fi

    # 5. Configurar Nginx baseado no resultado
    if configure_nginx "$final_ssl_type"; then
        echo -e "${GREEN}✅ Nginx configurado com sucesso${NC}"
    else
        echo -e "${RED}❌ Falha na configuração do Nginx${NC}"
        exit 1
    fi

    # 6. Relatório final
    echo ""
    echo -e "${GREEN}📋 RELATÓRIO FINAL${NC}"
    echo "=================================="
    echo -e "   SSL Type: ${BLUE}$final_ssl_type${NC}"

    case "$final_ssl_type" in
        "letsencrypt")
            echo -e "   🌐 Frontend: ${GREEN}https://$FRONTEND_DOMAIN${NC}"
            echo -e "   🔗 Backend:  ${GREEN}https://$BACKEND_DOMAIN${NC}"
            echo -e "   ✅ Certificado: Let's Encrypt (válido por 90 dias)"
            ;;
        "selfsigned")
            echo -e "   🌐 Frontend: ${YELLOW}https://$FRONTEND_DOMAIN${NC} ${RED}(alerta de segurança)${NC}"
            echo -e "   🔗 Backend:  ${YELLOW}https://$BACKEND_DOMAIN${NC} ${RED}(alerta de segurança)${NC}"
            echo -e "   ⚠️ Certificado: Autoassinado (365 dias, alerta no navegador)"
            echo -e "   💡 Execute './fix_ssl.sh' após 19/11/2025 para Let's Encrypt"
            ;;
        "none")
            echo -e "   🌐 Frontend: ${YELLOW}http://$FRONTEND_DOMAIN${NC}"
            echo -e "   🔗 Backend:  ${YELLOW}http://$BACKEND_DOMAIN${NC}"
            echo -e "   ❌ SSL: Não configurado"
            ;;
    esac

    echo ""
    echo -e "${GREEN}✅ Sistema configurado com sucesso!${NC}"
}

# Executar função principal
main "$@"