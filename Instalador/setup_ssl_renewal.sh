#!/bin/bash
# Configurar sistema de renovação automática de SSL
# Funciona tanto para Let's Encrypt quanto para certificados autoassinados

echo "🔄 Configurando Sistema de Renovação SSL"
echo "======================================"

# Detectar instalação
if [[ -d "/home/deploy" ]]; then
    INSTANCE_DIRS=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
    if [[ ! -z "$INSTANCE_DIRS" ]]; then
        INSTANCE_NAME=$(basename "$INSTANCE_DIRS")
        echo "✅ Instância encontrada: $INSTANCE_NAME"
    else
        echo "❌ Nenhuma instância encontrada"
        exit 1
    fi
else
    echo "❌ Diretório /home/deploy não encontrado"
    exit 1
fi

echo ""
echo "🔧 Configurando sistema de renovação..."

# 1. Configurar renovação automática do Certbot (Let's Encrypt)
echo "📋 1. Verificando Certbot..."
if command -v certbot >/dev/null 2>&1; then
    echo "✅ Certbot encontrado"

    # Verificar se já existe cron job do certbot
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        echo "🔄 Adicionando cron job para renovação do Certbot..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
        echo "✅ Cron job do Certbot configurado para rodar diariamente às 12h"
    else
        echo "✅ Cron job do Certbot já existe"
    fi
else
    echo "⚠️ Certbot não encontrado"
fi

# 2. Criar script de verificação para certificados autoassinados
echo ""
echo "📋 2. Criando script de verificação de certificados..."

sudo tee /usr/local/bin/check-ssl-certs.sh > /dev/null << 'EOF'
#!/bin/bash
# Script de verificação de certificados SSL
# Verifica e avisa sobre certificados prestes a expirar

LOG_FILE="/var/log/ssl-certificate-check.log"
ALERT_DAYS=30
ALERT_EMAIL="admin@localhost"

# Função para registrar logs
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Função para verificar expiração do certificado
check_cert_expiry() {
    local cert_path="$1"
    local domain="$2"

    if [[ -f "$cert_path" ]]; then
        # Obter data de expiração
        expiry_date=$(openssl x509 -in "$cert_path" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [[ ! -z "$expiry_date" ]]; then
            expiry_timestamp=$(date -d "$expiry_date" +%s)
            current_timestamp=$(date +%s)
            days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

            log "Certificado $domain expira em $days_until_expiry dias ($expiry_date)"

            if [[ $days_until_expiry -lt $ALERT_DAYS ]]; then
                if [[ $days_until_expiry -lt 0 ]]; then
                    log "🚨 ALERTA: Certificado $domain EXPIROU há ${days_until_expiry#-} dias!"
                    echo "🚨 ALERTA: Certificado $domain EXPIROU!" | mail -s "SSL Certificate Expired" "$ALERT_EMAIL" 2>/dev/null || true
                elif [[ $days_until_expiry -eq 0 ]]; then
                    log "🚨 ALERTA: Certificado $domain expira HOJE!"
                    echo "🚨 ALERTA: Certificado $domain expira HOJE!" | mail -s "SSL Certificate Expires Today" "$ALERT_EMAIL" 2>/dev/null || true
                else
                    log "⚠️ ALERTA: Certificado $domain expira em $days_until_expiry dias"
                    echo "⚠️ ALERTA: Certificado $domain expira em $days_until_expiry dias" | mail -s "SSL Certificate Warning" "$ALERT_EMAIL" 2>/dev/null || true
                fi

                return 1  # Certificado precisa de atenção
            else
                log "✅ Certificado $domain está OK (válido por $days_until_expiry dias)"
                return 0  # Certificado OK
            fi
        else
            log "❌ Não foi possível ler a data de expiração do certificado $domain"
            return 1
        fi
    else
        log "❌ Certificado não encontrado: $cert_path"
        return 1
    fi
}

# Verificar certificados Let's Encrypt
check_letsencrypt_certs() {
    if [[ -d "/etc/letsencrypt/live" ]]; then
        log "Verificando certificados Let's Encrypt..."
        for cert_dir in /etc/letsencrypt/live/*; do
            if [[ -d "$cert_dir" ]]; then
                domain=$(basename "$cert_dir")
                check_cert_expiry "$cert_dir/cert.pem" "$domain"
            fi
        done
    fi
}

# Verificar certificados autoassinados
check_selfsigned_certs() {
    if [[ -f "/etc/ssl/self-signed/combined.crt" ]]; then
        log "Verificando certificado autoassinado..."
        check_cert_expiry "/etc/ssl/self-signed/combined.crt" "self-signed-combined"
    fi
}

# Execução principal
log "Iniciando verificação de certificados SSL"

total_errors=0

check_letsencrypt_certs
((total_errors+=$?))

check_selfsigned_certs
((total_errors+=$?))

if [[ $total_errors -eq 0 ]]; then
    log "✅ Todos os certificados estão OK"
else
    log "⚠️ $total_errors certificado(s) precisam de atenção"
fi

log "Verificação concluída"
EOF

# Tornar script executável
sudo chmod +x /usr/local/bin/check-ssl-certs.sh

# 3. Adicionar verificação automática ao cron
echo ""
echo "📋 3. Configurando verificação automática..."

# Adicionar ao cron para rodar semanalmente
if ! crontab -l 2>/dev/null | grep -q "check-ssl-certs.sh"; then
    (crontab -l 2>/dev/null; echo "0 9 * * 1 /usr/local/bin/check-ssl-certs.sh") | crontab -
    echo "✅ Verificação semanal configurada (segundas às 9h)"
else
    echo "✅ Verificação semanal já existe"
fi

# 4. Criar script de renovação para certificados autoassinados
echo ""
echo "📋 4. Criando script de renovação para certificados autoassinados..."

sudo tee /usr/local/bin/renew-selfsigned-ssl.sh > /dev/null << 'EOF'
#!/bin/bash
# Script para renovar certificados autoassinados

INSTANCE_NAME=$(ls -d /home/deploy/*/ 2>/dev/null | head -1 | xargs basename)

if [[ -z "$INSTANCE_NAME" ]]; then
    echo "❌ Nenhuma instância encontrada"
    exit 1
fi

BACKEND_DOMAIN="api.whaticketplus.com"
FRONTEND_DOMAIN="app.whaticketplus.com"

# Ler configurações reais se existirem
if [[ -f "/home/deploy/$INSTANCE_NAME/backend/.env" ]]; then
    source "/home/deploy/$INSTANCE_NAME/backend/.env"
    BACKEND_DOMAIN=$(echo "$BACKEND_URL" | sed 's|https://||')
    FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||')
fi

SSL_DIR="/etc/ssl/self-signed"
LOG_FILE="/var/log/ssl-renewal.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log "Iniciando renovação de certificado autoassinado"

# Gerar novo certificado
cd /tmp
cat > openssl.cnf << EOL
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
EOL

# Fazer backup dos certificados antigos
if [[ -f "$SSL_DIR/combined.crt" ]]; then
    cp "$SSL_DIR/combined.crt" "$SSL_DIR/combined.crt.backup.$(date +%Y%m%d)"
    cp "$SSL_DIR/combined.key" "$SSL_DIR/combined.key.backup.$(date +%Y%m%d)"
    log "Backup dos certificados antigos criado"
fi

# Gerar nova chave
openssl genrsa -out "$SSL_DIR/combined-new.key" 2048

# Gerar novo certificado
openssl x509 -req -new -key "$SSL_DIR/combined-new.key" \
    -out "$SSL_DIR/combined-new.crt" \
    -days 365 \
    -extensions v3_req \
    -extfile /tmp/openssl.cnf \
    -signkey "$SSL_DIR/combined-new.key"

# Substituir os certificados
mv "$SSL_DIR/combined-new.key" "$SSL_DIR/combined.key"
mv "$SSL_DIR/combined-new.crt" "$SSL_DIR/combined.crt"

# Remover arquivo temporário
rm -f /tmp/openssl.cnf

# Recarregar Nginx
systemctl reload nginx

log "Certificado autoassinado renovado com sucesso"
log "Nginx recarregado"

echo "✅ Certificado autoassinado renovado"
echo "📅 Novo certificado válido por 365 dias"
echo "🔄 Nginx recarregado com sucesso"
EOF

sudo chmod +x /usr/local/bin/renew-selfsigned-ssl.sh

# 5. Criar script principal de gerenciamento
echo ""
echo "📋 5. Criando script de gerenciamento SSL..."

sudo tee /usr/local/bin/ssl-manager.sh > /dev/null << 'EOF'
#!/bin/bash
# Gerenciador principal de SSL

echo "🔐 Gerenciador SSL - My-Tycket"
echo "==========================="

INSTANCE_NAME=$(ls -d /home/deploy/*/ 2>/dev/null | head -1 | xargs basename)

if [[ -z "$INSTANCE_NAME" ]]; then
    echo "❌ Nenhuma instância encontrada"
    exit 1
fi

echo ""
echo "📋 Opções:"
echo "1) 📊 Verificar status dos certificados"
echo "2) 🔄 Renovar certificado autoassinado"
echo "3) 📅 Agendar verificação manual"
echo "4) 📋 Verificar logs de SSL"
echo "5) 🔄 Testar renovação automática"
echo "6) ❓ Sair"
echo ""

read -p "Escolha uma opção [1-6]: " -n 1 -r
echo ""

case $REPLY in
    1)
        echo "📊 Verificando status..."
        /usr/local/bin/check-ssl-certs.sh
        tail -20 /var/log/ssl-certificate-check.log
        ;;
    2)
        echo "🔄 Renovando certificado autoassinado..."
        /usr/local/bin/renew-selfsigned-ssl.sh
        ;;
    3)
        echo "📅 Agendando verificação manual..."
        read -p "Digite o tempo (ex: 1h, 30m, 1d): " time_str
        echo "/usr/local/bin/check-ssl-certs.sh" | at "$time_str" 2>/dev/null
        if [[ $? -eq 0 ]]; then
            echo "✅ Verificação agendada para $time_str"
        else
            echo "❌ Erro ao agendar. Tente formato como: 1h, 30m, 1d"
        fi
        ;;
    4)
        echo "📋 Logs recentes:"
        if [[ -f "/var/log/ssl-certificate-check.log" ]]; then
            tail -20 /var/log/ssl-certificate-check.log
        else
            echo "Nenhum log encontrado"
        fi
        echo ""
        if [[ -f "/var/log/ssl-renewal.log" ]]; then
            echo "--- Logs de Renovação ---"
            tail -20 /var/log/ssl-renewal.log
        fi
        ;;
    5)
        echo "🔄 Testando sistemas de renovação..."
        echo "Verificando certificado:"
        /usr/local/bin/check-ssl-certs.sh
        echo ""
        echo "Testando renovação Let's Encrypt:"
        certbot renew --dry-run
        ;;
    6)
        echo "👋 Saindo..."
        exit 0
        ;;
    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac
EOF

sudo chmod +x /usr/local/bin/ssl-manager.sh

echo ""
echo "✅ Sistema de gerenciamento SSL configurado!"
echo ""
echo "📋 Scripts criados:"
echo "   • /usr/local/bin/check-ssl-certs.sh     - Verificação de certificados"
echo "   • /usr/local/bin/renew-selfsigned-ssl.sh - Renovação autoassinado"
echo "   • /usr/local/bin/ssl-manager.sh        - Gerenciador completo"
echo ""
echo "📅 Agendamentos automáticos:"
echo "   • Certbot: Diário às 12h (renovação automática)"
echo "   • Verificação: Segundas às 9h"
echo ""
echo "💡 Uso:"
echo "   sudo ssl-manager.sh  - Para gerenciar certificados"
echo "   sudo check-ssl-certs.sh  - Para verificar manualmente"
echo "   sudo renew-selfsigned-ssl.sh  - Para renovar autoassinado"