#!/bin/bash
# Script para gerar certificado SSL autoassinado temporário
# Usar quando o Let's Encrypt atingir rate limit

echo "🔐 Gerador de Certificado SSL Autoassinado Temporário"
echo "=================================================="

# Detectar domínios da instalação existente
if [[ -d "/home/deploy" ]]; then
    INSTANCE_DIRS=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
    if [[ ! -z "$INSTANCE_DIRS" ]]; then
        INSTANCE_NAME=$(basename "$INSTANCE_DIRS")
        echo "✅ Instância encontrada: $INSTANCE_NAME"

        # Ler configurações do arquivo .env
        if [[ -f "/home/deploy/$INSTANCE_NAME/backend/.env" ]]; then
            source "/home/deploy/$INSTANCE_NAME/backend/.env"
            BACKEND_URL=${BACKEND_URL:-"https://api.whaticketplus.com"}
            FRONTEND_URL=${FRONTEND_URL:-"https://app.whaticketplus.com"}
        else
            BACKEND_URL="https://api.whaticketplus.com"
            FRONTEND_URL="https://app.whaticketplus.com"
        fi
    else
        echo "❌ Nenhuma instância encontrada em /home/deploy/"
        exit 1
    fi
else
    echo "❌ Diretório /home/deploy não encontrado"
    exit 1
fi

# Extrair nomes dos domínios
BACKEND_DOMAIN=$(echo "$BACKEND_URL" | sed 's|https://||')
FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||')

echo ""
echo "🌐 Domínios detectados:"
echo "   Backend: $BACKEND_DOMAIN"
echo "   Frontend: $FRONTEND_DOMAIN"

# Criar diretório para certificados autoassinados
SSL_DIR="/etc/ssl/self-signed"
sudo mkdir -p "$SSL_DIR"

echo ""
echo "🔐 Gerando certificados autoassinados..."

# Gerar certificado para o backend
echo "📦 Gerando certificado para $BACKEND_DOMAIN..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/$BACKEND_DOMAIN.key" \
    -out "$SSL_DIR/$BACKEND_DOMAIN.crt" \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=MyTycket/OU=IT/CN=$BACKEND_DOMAIN"

# Gerar certificado para o frontend
echo "📦 Gerando certificado para $FRONTEND_DOMAIN..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/$FRONTEND_DOMAIN.key" \
    -out "$SSL_DIR/$FRONTEND_DOMAIN.crt" \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=MyTycket/OU=IT/CN=$FRONTEND_DOMAIN"

# Gerar certificado combinado (SAN) para ambos os domínios
echo "📦 Gerando certificado combinado para ambos domínios..."

# Criar arquivo de configuração OpenSSL para SAN
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

# Gerar chave privada
sudo openssl genrsa -out "$SSL_DIR/combined.key" 2048

# Gerar CSR
sudo openssl req -new -key "$SSL_DIR/combined.key" -out /tmp/combined.csr -config /tmp/openssl.cnf

# Gerar certificado autoassinado com SAN
sudo openssl x509 -req -in /tmp/combined.csr \
    -signkey "$SSL_DIR/combined.key" \
    -out "$SSL_DIR/combined.crt" \
    -days 365 \
    -extensions v3_req \
    -extfile /tmp/openssl.cnf

# Limpar arquivos temporários
rm -f /tmp/openssl.cnf /tmp/combined.csr

echo ""
echo "✅ Certificados gerados com sucesso!"
echo "📁 Localização: $SSL_DIR"

echo ""
echo "🔧 Configurando Nginx para usar certificados autoassinados..."

# Configurar Nginx para backend
sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-backend << EOF
server {
    listen 80;
    server_name $BACKEND_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $BACKEND_DOMAIN;

    ssl_certificate $SSL_DIR/combined.crt;
    ssl_certificate_key $SSL_DIR/combined.key;

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

# Configurar Nginx para frontend
sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-frontend << EOF
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $FRONTEND_DOMAIN;

    ssl_certificate $SSL_DIR/combined.crt;
    ssl_certificate_key $SSL_DIR/combined.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

# Ativar sites
sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-backend /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar Nginx
echo ""
echo "🔄 Testando configuração do Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração válida!"
    echo "🔄 Reiniciando Nginx..."
    sudo systemctl reload nginx
    sudo systemctl restart nginx

    echo ""
    echo "🎉 SSL autoassinado configurado com sucesso!"
    echo ""
    echo "⚠️ AVISO IMPORTANTE:"
    echo "   • Este é um certificado autoassinado temporário"
    echo "   • O navegador mostrará alerta de segurança"
    echo "   • Você precisará adicionar exceção de segurança"
    echo ""
    echo "💡 Para remover o alerta:"
    echo "   1. No navegador, clique em 'Avançado' -> 'Ir para o site'"
    echo "   2. Ou adicione exceção de segurança permanente"
    echo ""
    echo "🌐 Seus sites estão disponíveis em:"
    echo "   🔒 Frontend: https://$FRONTEND_DOMAIN (com alerta de segurança)"
    echo "   🔒 Backend:  https://$BACKEND_DOMAIN (com alerta de segurança)"
    echo ""
    echo "🔄 Quando o rate limit do Let's Encrypt expirar:"
    echo "   Execute: ./fix_ssl.sh para instalar certificados válidos"

else
    echo "❌ Erro na configuração do Nginx!"
    echo "Verifique a configuração e execute manualmente:"
    echo "   sudo nginx -t"
    exit 1
fi

echo ""
echo "🧹 Limpando arquivos temporários..."
rm -f /tmp/openssl.cnf /tmp/combined.csr 2>/dev/null || true

echo ""
echo "✅ Configuração concluída!"