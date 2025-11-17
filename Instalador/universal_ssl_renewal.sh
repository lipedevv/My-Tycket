#!/bin/bash
# Sistema Universal de Renovação SSL
# Gerencia renovação automática para TODOS os tipos de certificado

echo "🔄 Sistema Universal de Renovação SSL"
echo "=================================="

# Configurações
ALERT_DAYS=30
LOG_FILE="/var/log/universal-ssl-renewal.log"
ALERT_EMAIL="admin@localhost"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Setup de logging
setup_logging() {
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo touch "$LOG_FILE"
    sudo chmod 644 "$LOG_FILE"
}

# Função de log
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | sudo tee -a "$LOG_FILE" > /dev/null
}

# Detectar tipo de certificado em uso
detect_certificate_type() {
    log "INFO" "Detectando tipo de certificado"

    local cert_type="none"
    local frontend_domain="app.whaticketplus.com"
    local backend_domain="api.whaticketplus.com"

    # Detectar domínios reais se existir instalação
    if [[ -d "/home/deploy" ]]; then
        local instance_dir=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
        if [[ -n "$instance_dir" ]] && [[ -f "$instance_dir/backend/.env" ]]; then
            source "$instance_dir/backend/.env"
            frontend_domain=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')
            backend_domain=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')
        fi
    fi

    echo -e "${BLUE}🔍 Verificando certificados para:${NC}"
    echo -e "   Frontend: ${YELLOW}$frontend_domain${NC}"
    echo -e "   Backend:  ${YELLOW}$backend_domain${NC}"

    # Verificar Let's Encrypt
    if [[ -d "/etc/letsencrypt/live/$frontend_domain" ]]; then
        cert_type="letsencrypt"
        echo -e "   ${GREEN}✅ Let's Encrypt detectado${NC}"
        log "INFO" "Certificado Let's Encrypt detectado"
    elif [[ -f "/etc/ssl/self-signed/combined.crt" ]]; then
        cert_type="selfsigned"
        echo -e "   ${YELLOW}⚠️ Autoassinado detectado${NC}"
        log "INFO" "Certificado autoassinado detectado"
    else
        echo -e "   ${RED}❌ Nenhum certificado SSL encontrado${NC}"
        log "WARN" "Nenhum certificado SSL encontrado"
    fi

    echo "$cert_type"
}

# Renovar certificado Let's Encrypt
renew_letsencrypt() {
    log "INFO" "Tentando renovar certificado Let's Encrypt"

    echo -e "${BLUE}🔐 Renovando Let's Encrypt...${NC}"

    if sudo certbot renew --quiet --nginx --non-interactive 2>/dev/null; then
        echo -e "   ${GREEN}✅ Renovação Let's Encrypt bem-sucedida${NC}"
        log "SUCCESS" "Renovação Let's Encrypt bem-sucedida"

        # Recarregar Nginx
        if sudo systemctl reload nginx 2>/dev/null; then
            echo -e "   ${GREEN}✅ Nginx recarregado${NC}"
            log "INFO" "Nginx recarregado com sucesso"
        else
            echo -e "   ${YELLOW}⚠️ Falha ao recarregar Nginx${NC}"
            log "WARN" "Falha ao recarregar Nginx"
        fi

        return 0
    else
        echo -e "   ${RED}❌ Falha na renovação Let's Encrypt${NC}"
        log "ERROR" "Falha na renovação Let's Encrypt"

        # Verificar motivo
        local output=$(sudo certbot renew --dry-run 2>&1)
        if echo "$output" | grep -q "already renewed"; then
            echo -e "   ${YELLOW}ℹ️ Certificado já renovado recentemente${NC}"
            log "INFO" "Certificado já renovado recentemente"
            return 0
        elif echo "$output" | grep -q "not due for renewal"; then
            echo -e "   ${YELLOW}ℹ️ Certificado não precisa de renovação ainda${NC}"
            log "INFO" "Certificado não precisa de renovação ainda"
            return 0
        fi

        return 1
    fi
}

# Renovar certificado autoassinado (GERAR NOVO)
renew_selfsigned() {
    log "INFO" "Renovando certificado autoassinado"

    echo -e "${BLUE}🔧 Renovando certificado autoassinado...${NC}"

    # Detectar domínios
    local frontend_domain="app.whaticketplus.com"
    local backend_domain="api.whaticketplus.com"

    if [[ -d "/home/deploy" ]]; then
        local instance_dir=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
        if [[ -n "$instance_dir" ]] && [[ -f "$instance_dir/backend/.env" ]]; then
            source "$instance_dir/backend/.env"
            frontend_domain=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')
            backend_domain=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')
        fi
    fi

    # Fazer backup do certificado atual
    if [[ -f "/etc/ssl/self-signed/combined.crt" ]]; then
        local backup_file="/etc/ssl/self-signed/backup-$(date +%Y%m%d-%H%M%S).crt"
        sudo cp "/etc/ssl/self-signed/combined.crt" "$backup_file"
        echo -e "   📦 Backup criado: ${YELLOW}$(basename "$backup_file")${NC}"
        log "INFO" "Backup do certificado autoassinado criado"
    fi

    # Gerar novo certificado
    cat > /tmp/renewal-ssl.cnf << EOF
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
CN = $frontend_domain
emailAddress = admin@$frontend_domain

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $frontend_domain
DNS.2 = $backend_domain
DNS.3 = www.$frontend_domain
DNS.4 = www.$backend_domain
DNS.5 = localhost
EOF

    # Gerar novo certificado
    if sudo openssl req -x509 -nodes -days 365 \
            -newkey rsa:4096 \
            -keyout /etc/ssl/self-signed/new-key.key \
            -out /etc/ssl/self-signed/new-cert.crt \
            -config /tmp/renewal-ssl.cnf \
            -sha256 2>/dev/null; then

        # Substituir certificados antigos
        sudo mv /etc/ssl/self-signed/new-key.key /etc/ssl/self-signed/combined.key
        sudo mv /etc/ssl/self-signed/new-cert.crt /etc/ssl/self-signed/combined.crt

        # Recarregar Nginx
        if sudo systemctl reload nginx 2>/dev/null; then
            echo -e "   ${GREEN}✅ Certificado autoassinado renovado com sucesso${NC}"
            echo -e "   🔄 Nginx recarregado"
            echo -e "   📅 Válido por mais 365 dias"
            log "SUCCESS" "Certificado autoassinado renovado com sucesso"
        else
            echo -e "   ${YELLOW}⚠️ Certificado renovado mas Nginx não recarregou${NC}"
            log "WARN" "Certificado renovado mas Nginx não recarregou"
        fi

        rm -f /tmp/renewal-ssl.cnf
        return 0
    else
        echo -e "   ${RED}❌ Falha na geração do novo certificado${NC}"
        log "ERROR" "Falha na geração de novo certificado autoassinado"
        rm -f /tmp/renewal-ssl.cnf
        return 1
    fi
}

# Tentar migração de autoassinado para Let's Encrypt
try_migrate_to_letsencrypt() {
    log "INFO" "Tentando migrar autoassinado para Let's Encrypt"

    echo -e "${BLUE}🚀 Tentando migração para Let's Encrypt...${NC}"

    # Detectar domínios
    local frontend_domain="app.whaticketplus.com"
    local backend_domain="api.whaticketplus.com"

    if [[ -d "/home/deploy" ]]; then
        local instance_dir=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
        if [[ -n "$instance_dir" ]] && [[ -f "$instance_dir/backend/.env" ]]; then
            source "$instance_dir/backend/.env"
            frontend_domain=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')
            backend_domain=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')
        fi
    fi

    # Verificar se rate limit ainda está ativo
    echo -e "   🔍 Verificando rate limits..."

    if sudo certbot certificates 2>&1 | grep -q "too many certificates"; then
        echo -e "   ${YELLOW}⚠️ Rate limit ainda ativo, mantendo autoassinado${NC}"
        log "INFO" "Rate limit ainda ativo, migração não possível"
        return 1
    fi

    # Tentar obter certificado Let's Encrypt
    echo -e "   🔐 Tentando Let's Encrypt..."

    if sudo certbot --nginx \
            --agree-tos \
            --non-interactive \
            --domains "$frontend_domain,$backend_domain" \
            --email "admin@$frontend_domain" \
            --force-renewal 2>/dev/null; then

        echo -e "   ${GREEN}✅ Migração para Let's Encrypt bem-sucedida!${NC}"
        log "SUCCESS" "Migração para Let's Encrypt bem-sucedida"

        # Remover certificado autoassinado antigo
        sudo rm -f /etc/ssl/self-signed/combined.crt /etc/ssl/self-signed/combined.key

        return 0
    else
        echo -e "   ${YELLOW}⚠️ Migração falhou, mantendo autoassinado${NC}"
        log "WARN" "Migração para Let's Encrypt falhou"
        return 1
    fi
}

# Verificar status de todos os certificados
check_all_certificates() {
    log "INFO" "Verificando status de todos os certificados"

    echo -e "${BLUE}📊 Status dos Certificados SSL${NC}"
    echo "=================================="

    local needs_renewal=false
    local cert_type=$(detect_certificate_type)

    case "$cert_type" in
        "letsencrypt")
            echo ""
            echo -e "${GREEN}🔐 Certificado Let's Encrypt:${NC}"

            if [[ -d "/etc/letsencrypt/live/app.whaticketplus.com" ]] && [[ -f "/etc/letsencrypt/live/app.whaticketplus.com/cert.pem" ]]; then
                local expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/app.whaticketplus.com/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
                if [[ -n "$expiry_date" ]]; then
                    local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null)
                    local current_timestamp=$(date +%s)
                    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

                    echo -e "   📅 Expira em: ${YELLOW}$expiry_date${NC}"
                    echo -e "   ⏰ Dias restantes: ${YELLOW}$days_until_expiry${NC}"

                    if [[ $days_until_expiry -lt $ALERT_DAYS ]]; then
                        echo -e "   ${RED}🚨 PRECISA RENOVAR!${NC}"
                        needs_renewal=true
                    elif [[ $days_until_expiry -lt 60 ]]; then
                        echo -e "   ${YELLOW}⚠️ Atenção: renovação em breve${NC}"
                    else
                        echo -e "   ${GREEN}✅ Certificado OK${NC}"
                    fi
                else
                    echo -e "   ${RED}❌ Não foi possível ler data de expiração${NC}"
                    needs_renewal=true
                fi
            else
                echo -e "   ${RED}❌ Certificado não encontrado${NC}"
                needs_renewal=true
            fi
            ;;

        "selfsigned")
            echo ""
            echo -e "${YELLOW}🔧 Certificado Autoassinado:${NC}"

            if [[ -f "/etc/ssl/self-signed/combined.crt" ]]; then
                local expiry_date=$(openssl x509 -in "/etc/ssl/self-signed/combined.crt" -noout -enddate 2>/dev/null | cut -d= -f2)
                if [[ -n "$expiry_date" ]]; then
                    local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null)
                    local current_timestamp=$(date +%s)
                    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

                    echo -e "   📅 Expira em: ${YELLOW}$expiry_date${NC}"
                    echo -e "   ⏰ Dias restantes: ${YELLOW}$days_until_expiry${NC}"

                    if [[ $days_until_expiry -lt $ALERT_DAYS ]]; then
                        echo -e "   ${RED}🚨 PRECISA RENOVAR!${NC}"
                        needs_renewal=true
                    elif [[ $days_until_expiry -lt 60 ]]; then
                        echo -e "   ${YELLOW}⚠️ Atenção: renovação em breve${NC}"
                    else
                        echo -e "   ${GREEN}✅ Certificado OK${NC}"
                    fi

                    # Sugerir migração
                    echo -e "   💡 ${BLUE}Sugestão: Tente migrar para Let's Encrypt${NC}"
                else
                    echo -e "   ${RED}❌ Não foi possível ler data de expiração${NC}"
                    needs_renewal=true
                fi
            else
                echo -e "   ${RED}❌ Certificado não encontrado${NC}"
                needs_renewal=true
            fi
            ;;

        "none")
            echo -e "${RED}❌ Nenhum certificado SSL configurado${NC}"
            needs_renewal=true
            ;;
    esac

    echo ""
    if [[ "$needs_renewal" == true ]]; then
        echo -e "${RED}🔄 Ação necessária: Renovação recomendada${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Status OK: Nenhuma ação necessária${NC}"
        return 0
    fi
}

# Sistema principal unificado
main() {
    setup_logging

    log "INFO" "Sistema Universal de Renovação SSL iniciado"

    # Detectar modo de operação
    local mode="${1:-check}"

    case "$mode" in
        "check")
            echo -e "${GREEN}🔍 Modo: Verificação${NC}"
            check_all_certificates
            ;;
        "renew")
            echo -e "${GREEN}🔄 Modo: Renovação${NC}"

            local cert_type=$(detect_certificate_type)
            local renewal_success=false

            case "$cert_type" in
                "letsencrypt")
                    if renew_letsencrypt; then
                        renewal_success=true
                    fi
                    ;;
                "selfsigned")
                    # Tentar migrar primeiro
                    echo -e "${BLUE}🚀 Tentando migração automática para Let's Encrypt...${NC}"
                    if try_migrate_to_letsencrypt; then
                        renewal_success=true
                    else
                        echo -e "${BLUE}🔄 Migração falhou, renovando autoassinado...${NC}"
                        if renew_selfsigned; then
                            renewal_success=true
                        fi
                    fi
                    ;;
                "none")
                    echo -e "${RED}❌ Nenhum certificado para renovar${NC}"
                    ;;
            esac

            if [[ "$renewal_success" == true ]]; then
                echo -e "${GREEN}✅ Renovação concluída com sucesso${NC}"
                log "SUCCESS" "Renovação concluída com sucesso"
            else
                echo -e "${RED}❌ Falha na renovação${NC}"
                log "ERROR" "Falha na renovação"
                exit 1
            fi
            ;;
        "migrate")
            echo -e "${GREEN}🚀 Modo: Migração para Let's Encrypt${NC}"

            if try_migrate_to_letsencrypt; then
                echo -e "${GREEN}✅ Migração bem-sucedida${NC}"
                log "SUCCESS" "Migração para Let's Encrypt bem-sucedida"
            else
                echo -e "${RED}❌ Migração falhou${NC}"
                log "ERROR" "Migração para Let's Encrypt falhou"
                exit 1
            fi
            ;;
        *)
            echo -e "${YELLOW}📋 Modos disponíveis:${NC}"
            echo -e "   ${BLUE}check${NC}   - Verificar status (padrão)"
            echo -e "   ${BLUE}renew${NC}   - Renovar certificados"
            echo -e "   ${BLUE}migrate${NC} - Tentar migrar para Let's Encrypt"
            echo ""
            echo -e "Exemplos:"
            echo -e "  $0                    # Verificar status"
            echo -e "  $0 check              # Verificar status"
            echo -e "  $0 renew              # Renovar certificados"
            echo -e "  $0 migrate            # Migrar para Let's Encrypt"
            exit 1
            ;;
    esac
}

# Executar função principal
main "$@"