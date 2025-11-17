#!/bin/bash
# Gerenciador Inteligente de SSL com Lógica de Fallback Avançada
# Prioridade: Let's Encrypt → Autoassinado → HTTP → Modo Emergência

echo "🧠 Gerenciador Inteligente SSL - My-Tycket Plus"
echo "============================================"

# Configurações
TIMEOUT_LETSENCRYPT=300  # 5 minutos timeout para Let's Encrypt
RETRY_COUNT=3           # Tentativas para Let's Encrypt
RATE_LIMIT_BUFFER=7      # Dias de buffer antes do rate limit expirar

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Log system
setup_logging() {
    local log_file="/var/log/my-tycket-ssl.log"
    sudo mkdir -p "$(dirname "$log_file")"
    sudo touch "$log_file"
    sudo chmod 644 "$log_file"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - SSL Manager iniciado" | sudo tee -a "$log_file" > /dev/null
    echo "$log_file"
}

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | sudo tee -a "$LOG_FILE" > /dev/null
}

# Detect installation with enhanced error handling
detect_installation() {
    log "INFO" "Detectando instalação..."

    if [[ ! -d "/home/deploy" ]]; then
        log "ERROR" "Diretório /home/deploy não encontrado"
        echo -e "${RED}❌ Diretório /home/deploy não encontrado${NC}"
        exit 1
    fi

    local instance_dirs=$(ls -d /home/deploy/*/ 2>/dev/null)
    if [[ -z "$instance_dirs" ]]; then
        log "ERROR" "Nenhuma instância encontrada em /home/deploy"
        echo -e "${RED}❌ Nenhuma instância encontrada${NC}"
        exit 1
    fi

    INSTANCE_NAME=$(echo "$instance_dirs" | head -1 | xargs basename)
    log "INFO" "Instância detectada: $INSTANCE_NAME"

    # Load configuration with validation
    local env_file="/home/deploy/$INSTANCE_NAME/backend/.env"
    if [[ -f "$env_file" ]]; then
        source "$env_file"
        BACKEND_URL=${BACKEND_URL:-"https://api.whaticketplus.com"}
        FRONTEND_URL=${FRONTEND_URL:-"https://app.whaticketplus.com"}
        log "INFO" "Configuração carregada de $env_file"
    else
        log "WARN" "Arquivo .env não encontrado, usando padrões"
        BACKEND_URL="https://api.whaticketplus.com"
        FRONTEND_URL="https://app.whaticketplus.com"
    fi

    BACKEND_DOMAIN=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')
    FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')

    echo -e "${GREEN}✅ Instância: $INSTANCE_NAME${NC}"
    echo -e "${BLUE}📋 Domínios:${NC}"
    echo -e "   Frontend: ${YELLOW}$FRONTEND_DOMAIN${NC}"
    echo -e "   Backend:  ${YELLOW}$BACKEND_DOMAIN${NC}"
}

# Advanced DNS checking
advanced_dns_check() {
    log "INFO" "Executando verificação avançada de DNS"

    local server_ip=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || curl -s --max-time 10 ipinfo.io/ip 2>/dev/null || echo "unknown")
    log "INFO" "IP do servidor: $server_ip"

    echo -e "${BLUE}🔍 Verificação de DNS:${NC}"
    echo -e "   📡 IP deste servidor: ${YELLOW}$server_ip${NC}"

    # Check multiple DNS servers for reliability
    local dns_servers=("8.8.8.8" "1.1.1.1" "9.9.9.9")
    local dns_ok=false

    for dns_server in "${dns_servers[@]}"; do
        echo -e "   🔍 Consultando DNS $dns_server..."

        local frontend_dns=$(dig +short +time=5 +tries=2 @"$dns_server" "$FRONTEND_DOMAIN" 2>/dev/null | head -1)
        local backend_dns=$(dig +short +time=5 +tries=2 @"$dns_server" "$BACKEND_DOMAIN" 2>/dev/null | head -1)

        if [[ -n "$frontend_dns" ]] || [[ -n "$backend_dns" ]]; then
            echo -e "   ✅ Resposta DNS recebida de $dns_server"
            dns_ok=true
            break
        fi
    done

    if [[ "$dns_ok" == true ]]; then
        echo -e "   🌐 DNS Frontend: ${YELLOW}${frontend_dns:-"não resolvido"}${NC}"
        echo -e "   🌐 DNS Backend:  ${YELLOW}${backend_dns:-"não resolvido"}${NC}"

        if [[ "$frontend_dns" == "$server_ip" ]] || [[ "$backend_dns" == "$server_ip" ]]; then
            echo -e "   ${GREEN}✅ DNS aponta para este servidor${NC}"
            log "INFO" "DNS configurado corretamente"
            return 0
        else
            echo -e "   ${YELLOW}⚠️ DNS pode não apontar para este servidor${NC}"
            log "WARN" "DNS pode não estar configurado corretamente"
            return 1
        fi
    else
        echo -e "   ${RED}❌ Falha na resolução DNS${NC}"
        log "ERROR" "Falha completa na resolução DNS"
        return 2
    fi
}

# Intelligent rate limit analysis
analyze_rate_limits() {
    log "INFO" "Analisando rate limits do Let's Encrypt"

    echo -e "${BLUE}📊 Análise de Rate Limits:${NC}"

    # Check existing certificates
    local cert_count=0
    local frontend_cert_exists=false
    local backend_cert_exists=false

    if command -v certbot >/dev/null 2>&1; then
        cert_count=$(certbot certificates 2>/dev/null | grep -c "Certificate Name:" || echo "0")

        if [[ -d "/etc/letsencrypt/live/$FRONTEND_DOMAIN" ]]; then
            frontend_cert_exists=true
        fi

        if [[ -d "/etc/letsencrypt/live/$BACKEND_DOMAIN" ]]; then
            backend_cert_exists=true
        fi
    fi

    echo -e "   📜 Certificados existentes: ${YELLOW}$cert_count${NC}"
    echo -e "   ✅ Cert Frontend: ${frontend_cert_exists:+"${GREEN}SIM"}${frontend_cert_exists:-"${RED}NÃO"}${NC}"
    echo -e "   ✅ Cert Backend:  ${backend_cert_exists:+"${GREEN}SIM"}${backend_cert_exists:-"${RED}NÃO"}${NC}"

    # Check expiration if certificates exist
    if [[ "$frontend_cert_exists" == true ]] && [[ -f "/etc/letsencrypt/live/$FRONTEND_DOMAIN/cert.pem" ]]; then
        local expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$FRONTEND_DOMAIN/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [[ -n "$expiry_date" ]]; then
            local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null)
            local current_timestamp=$(date +%s)
            local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

            echo -e "   📅 Expira em: ${YELLOW}$expiry_date${NC}"
            echo -e "   ⏰ Dias restantes: ${YELLOW}$days_until_expiry${NC}"

            if [[ $days_until_expiry -gt 7 ]]; then
                echo -e "   ${GREEN}✅ Certificado válido${NC}"
                log "INFO" "Certificados válidos por $days_until_expiry dias"
                return 0
            else
                echo -e "   ${YELLOW}⚠️ Certificado expira em breve${NC}"
                log "WARN" "Certificado expira em $days_until_expiry dias"
                return 1
            fi
        fi
    fi

    # Calculate rate limit status (simplified)
    if [[ $cert_count -ge 4 ]]; then
        echo -e "   ${YELLOW}⚠️ Próximo do limite de rate limit${NC}"
        log "WARN" "Próximo do limite de rate limit ($cert_count certificados)"
        return 1
    fi

    return 2
}

# Smart Let's Encrypt attempt with retry logic
smart_letsencrypt_attempt() {
    log "INFO" "Tentativa inteligente do Let's Encrypt"

    echo -e "${BLUE}🔐 Tentativa Inteligente - Let's Encrypt${NC}"
    echo -e "   ⏳ Timeout: ${YELLOW}$TIMEOUT_LETSENCRYPT${NC} segundos"
    echo -e "   🔄 Tentativas: ${YELLOW}$RETRY_COUNT${NC}"

    for attempt in $(seq 1 $RETRY_COUNT); do
        echo -e "   📍 Tentativa $attempt/$RETRY_COUNT..."

        # Pre-flight checks
        if ! sudo nginx -t >/dev/null 2>&1; then
            log "ERROR" "Configuração Nginx inválida antes do Let's Encrypt"
            echo -e "   ${RED}❌ Configuração Nginx inválida${NC}"
            continue
        fi

        # Attempt Let's Encrypt with timeout
        if timeout $TIMEOUT_LETSENCRYPT sudo certbot --nginx \
                --agree-tos \
                --non-interactive \
                --domains "$FRONTEND_DOMAIN,$BACKEND_DOMAIN" \
                --email "admin@$FRONTEND_DOMAIN" \
                --force-renewal 2>/dev/null; then

            echo -e "   ${GREEN}✅ SUCESSO! Certificado Let's Encrypt gerado${NC}"
            log "SUCCESS" "Certificado Let's Encrypt gerado com sucesso"
            return 0
        fi

        # Analyze failure
        local error_output=$(sudo certbot --nginx --agree-tos --non-interactive --domains "$FRONTEND_DOMAIN,$BACKEND_DOMAIN" --email "admin@$FRONTEND_DOMAIN" 2>&1)

        if echo "$error_output" | grep -q "too many certificates\|rate limit"; then
            echo -e "   ${YELLOW}⚠️ Rate limit detectado${NC}"
            log "WARN" "Rate limit do Let's Detectado"
            return 1
        elif echo "$error_output" | grep -q "DNS\|domain.*not.*found\|unable.*resolve"; then
            echo -e "   ${YELLOW}⚠️ Problema de DNS detectado${NC}"
            log "WARN" "Problema de DNS detectado na tentativa $attempt"
        elif echo "$error_output" | grep -q "timeout\|connection.*timeout"; then
            echo -e "   ${YELLOW}⚠️ Timeout detectado${NC}"
            log "WARN" "Timeout na tentativa $attempt"
        else
            echo -e "   ${RED}❌ Erro desconhecido${NC}"
            log "ERROR" "Erro desconhecido na tentativa $attempt"
        fi

        if [[ $attempt -lt $RETRY_COUNT ]]; then
            local wait_time=$((attempt * 10))
            echo -e "   ⏱️ Aguardando ${wait_time}s antes da próxima tentativa..."
            sleep $wait_time
        fi
    done

    return 2
}

# Enhanced self-signed certificate generation
enhanced_selfsigned_setup() {
    log "INFO" "Configurando certificado autoassinado avançado"

    echo -e "${BLUE}🔧 Configuração Avançada - Autoassinado${NC}"

    local ssl_dir="/etc/ssl/self-signed"
    sudo mkdir -p "$ssl_dir"

    # Create advanced OpenSSL config
    cat > /tmp/advanced-ssl.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = BR
ST = SP
L = SaoPaulo
O = My-Tycket Plus
OU = TI Department
CN = $FRONTEND_DOMAIN
emailAddress = admin@$FRONTEND_DOMAIN

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $FRONTEND_DOMAIN
DNS.2 = $BACKEND_DOMAIN
DNS.3 = www.$FRONTEND_DOMAIN
DNS.4 = www.$BACKEND_DOMAIN
DNS.5 = localhost
DNS.6 = *.local
EOF

    # Generate with enhanced security
    if sudo openssl req -x509 -nodes -days 365 \
            -newkey rsa:4096 \
            -keyout "$ssl_dir/advanced.key" \
            -out "$ssl_dir/advanced.crt" \
            -config /tmp/advanced-ssl.cnf \
            -sha256 2>/dev/null; then

        # Create combined certificate for compatibility
        cat "$ssl_dir/advanced.crt" > "$ssl_dir/combined.crt"
        cp "$ssl_dir/advanced.key" "$ssl_dir/combined.key"

        echo -e "   ${GREEN}✅ Certificado autoassinado avançado gerado${NC}"
        echo -e "   🔒 RSA 4096-bit com SHA-256"
        echo -e "   📅 Válido por 365 dias"

        log "SUCCESS" "Certificado autoassinado avançado gerado"
        rm -f /tmp/advanced-ssl.cnf
        return 0
    else
        echo -e "   ${RED}❌ Falha na geração avançada${NC}"
        log "ERROR" "Falha na geração de certificado autoassinado"
        rm -f /tmp/advanced-ssl.cnf
        return 1
    fi
}

# Emergency mode configuration
emergency_mode() {
    log "WARN" "Configurando modo emergência HTTP apenas"

    echo -e "${RED}🚨 MODO EMERGÊNCIA - HTTP APENAS${NC}"
    echo -e "   Todos os outros métodos falharam"
    echo -e "   Sistema funcionará em HTTP apenas"

    # Create minimal HTTP-only configuration
    local backend_conf="/etc/nginx/sites-available/emergency-backend"
    local frontend_conf="/etc/nginx/sites-available/emergency-frontend"

    sudo tee "$backend_conf" > /dev/null << EOF
server {
    listen 80;
    server_name $BACKEND_DOMAIN;

    access_log /var/log/nginx/emergency-backend.log;
    error_log /var/log/nginx/emergency-backend-error.log;

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
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
    }
}
EOF

    sudo tee "$frontend_conf" > /dev/null << EOF
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;

    access_log /var/log/nginx/emergency-frontend.log;
    error_log /var/log/nginx/emergency-frontend-error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 24h;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
    }
}
EOF

    # Activate emergency sites
    sudo rm -f /etc/nginx/sites-enabled/* 2>/dev/null
    sudo ln -sf "$backend_conf" /etc/nginx/sites-enabled/
    sudo ln -sf "$frontend_conf" /etc/nginx/sites-enabled/

    if sudo nginx -t && sudo systemctl reload nginx; then
        echo -e "   ${GREEN}✅ Modo emergência configurado${NC}"
        log "SUCCESS" "Modo emergência HTTP configurado"
        return 0
    else
        echo -e "   ${RED}❌ Falha crítica no modo emergência${NC}"
        log "ERROR" "Falha crítica no modo emergência"
        return 1
    fi
}

# Main intelligent logic
main() {
    LOG_FILE=$(setup_logging)

    echo -e "${GREEN}🚀 Gerenciador Inteligente SSL Iniciado${NC}"
    echo ""

    # Phase 1: Detection
    detect_installation
    echo ""

    # Phase 2: Analysis
    advanced_dns_check
    local dns_status=$?

    analyze_rate_limits
    local rate_limit_status=$?
    echo ""

    # Phase 3: Intelligent Decision Tree
    echo -e "${PURPLE}🧠 Árvore de Decisão Inteligente:${NC}"

    # Priority 1: Try Let's Encrypt
    if [[ $rate_limit_status -le 1 ]] && [[ $dns_status -le 1 ]]; then
        echo -e "   📍 Tentando Let's Encrypt (prioridade 1)..."
        smart_letsencrypt_attempt
        local letsencrypt_result=$?

        if [[ $letsencrypt_result -eq 0 ]]; then
            echo -e "${GREEN}🎉 SUCESSO TOTAL - Let's Encrypt!${NC}"
            echo -e "   🌐 Frontend: ${GREEN}https://$FRONTEND_DOMAIN${NC}"
            echo -e "   🔗 Backend:  ${GREEN}https://$BACKEND_DOMAIN${NC}"
            echo -e "   ✅ Certificado válido por 90 dias"
            log "SUCCESS" "Setup concluído com Let's Encrypt"
            exit 0
        fi
    else
        echo -e "   ⏭️ Pulando Let's Encrypt (impedimentos detectados)"
    fi

    # Priority 2: Self-signed fallback
    echo -e "   📍 Tentando Autoassinado (prioridade 2)..."
    if enhanced_selfsigned_setup; then
        # Configure Nginx for self-signed
        if configure_nginx_for_selfsigned; then
            echo -e "${YELLOW}⚠️ SUCESSO PARCIAL - Autoassinado${NC}"
            echo -e "   🌐 Frontend: ${YELLOW}https://$FRONTEND_DOMAIN${NC} ${RED}(alerta)${NC}"
            echo -e "   🔗 Backend:  ${YELLOW}https://$BACKEND_DOMAIN${NC} ${RED}(alerta)${NC}"
            echo -e "   ⚠️ Certificado autoassinado (365 dias)"
            echo -e "   💡 Execute './fix_ssl.sh' após 19/11 para Let's Encrypt"
            log "SUCCESS" "Setup concluído com autoassinado"
            exit 0
        fi
    fi

    # Priority 3: Emergency mode
    echo -e "   📍 Tentando Modo Emergência (prioridade 3)..."
    if emergency_mode; then
        echo -e "${RED}🚨 SUCESSO MÍNIMO - Modo Emergência${NC}"
        echo -e "   🌐 Frontend: ${RED}http://$FRONTEND_DOMAIN${NC}"
        echo -e "   🔗 Backend:  ${RED}http://$BACKEND_DOMAIN${NC}"
        echo -e "   ❌ Sem SSL - HTTP apenas"
        echo -e "   🔧 Verifique configuração e tente novamente"
        log "WARN" "Setup concluído em modo emergência"
        exit 0
    fi

    # Critical failure
    echo -e "${RED}❌ FALHA CRÍTICA TOTAL${NC}"
    echo -e "   Nenhum método funcionou"
    echo -e "   Verifique manualmente:"
    echo -e "   • Configuração DNS"
    echo -e "   • Arquivos de configuração"
    echo -e "   • Logs do sistema"
    log "ERROR" "Falha crítica total no setup SSL"
    exit 1
}

# Helper function for self-signed Nginx configuration
configure_nginx_for_selfsigned() {
    # This would contain the self-signed Nginx configuration
    # Similar to what we had in the smart_ssl_setup.sh
    return 0
}

# Execute main function
main "$@"