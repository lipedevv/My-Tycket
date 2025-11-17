#!/bin/bash
# Gerenciador de SSL para My-Tycket
# Lida com rate limits e oferece soluções alternativas

echo "🔐 Gerenciador de SSL - My-Tycket"
echo "================================="
echo ""

# Detectar instalação
if [[ -d "/home/deploy" ]]; then
    INSTANCE_DIRS=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
    if [[ ! -z "$INSTANCE_DIRS" ]]; then
        INSTANCE_NAME=$(basename "$INSTANCE_DIRS")
        echo "✅ Instância encontrada: $INSTANCE_NAME"

        if [[ -f "/home/deploy/$INSTANCE_NAME/backend/.env" ]]; then
            source "/home/deploy/$INSTANCE_NAME/backend/.env"
            BACKEND_URL=${BACKEND_URL:-"https://api.whaticketplus.com"}
            FRONTEND_URL=${FRONTEND_URL:-"https://app.whaticketplus.com"}
        else
            BACKEND_URL="https://api.whaticketplus.com"
            FRONTEND_URL="https://app.whaticketplus.com"
        fi
    else
        echo "❌ Nenhuma instância encontrada"
        exit 1
    fi
else
    echo "❌ Diretório /home/deploy não encontrado"
    exit 1
fi

BACKEND_DOMAIN=$(echo "$BACKEND_URL" | sed 's|https://||')
FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||')

echo "📋 Domínios:"
echo "   Frontend: $FRONTEND_DOMAIN"
echo "   Backend:  $BACKEND_DOMAIN"
echo ""

# Verificar status atual dos certificados
echo "🔍 Verificando status dos certificados..."

if [[ -d "/etc/letsencrypt/live/$FRONTEND_DOMAIN" ]]; then
    echo "✅ Certificado Let's Encrypt encontrado para $FRONTEND_DOMAIN"
    if [[ -f "/etc/letsencrypt/live/$FRONTEND_DOMAIN/cert.pem" ]]; then
        expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$FRONTEND_DOMAIN/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [[ ! -z "$expiry_date" ]]; then
            echo "   📅 Expira em: $expiry_date"
        fi
    fi
else
    echo "❌ Nenhum certificado Let's Encrypt para $FRONTEND_DOMAIN"
fi

if [[ -d "/etc/letsencrypt/live/$BACKEND_DOMAIN" ]]; then
    echo "✅ Certificado Let's Encrypt encontrado para $BACKEND_DOMAIN"
    if [[ -f "/etc/letsencrypt/live/$BACKEND_DOMAIN/cert.pem" ]]; then
        expiry_date=$(openssl x509 -in "/etc/letsencrypt/live/$BACKEND_DOMAIN/cert.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [[ ! -z "$expiry_date" ]]; then
            echo "   📅 Expira em: $expiry_date"
        fi
    fi
else
    echo "❌ Nenhum certificado Let's Encrypt para $BACKEND_DOMAIN"
fi

# Verificar se há certificado autoassinado
if [[ -f "/etc/ssl/self-signed/combined.crt" ]]; then
    echo "✅ Certificado autoassinado encontrado"
fi

echo ""
echo "🔧 Opções disponíveis:"
echo "1) 🔄 Tentar certificado Let's Encrypt (pode falhar por rate limit)"
echo "2) 🔐 Gerar certificado autoassinado temporário"
echo "3) ⚙️ Configurar apenas HTTP (sem SSL)"
echo "4) 📋 Verificar rate limits do Let's Encrypt"
echo "5) 🔍 Verificar configuração Nginx"
echo "6) ❓ Sair"
echo ""

read -p "Escolha uma opção [1-6]: " -n 1 -r
echo ""

case $REPLY in
    1)
        echo "🔄 Tentando gerar certificado Let's Encrypt..."
        echo "⚠️ Isso pode falhar se o rate limit ainda estiver ativo"
        echo ""

        # Tentar obter certificado
        if sudo certbot --nginx \
                --agree-tos \
                --non-interactive \
                --domains "$FRONTEND_DOMAIN,$BACKEND_DOMAIN"; then
            echo ""
            echo "🎉 Certificado Let's Encrypt gerado com sucesso!"
            echo "🌐 Seus sites estão disponíveis em:"
            echo "   https://$FRONTEND_DOMAIN"
            echo "   https://$BACKEND_DOMAIN"
        else
            echo ""
            echo "❌ Falha ao gerar certificado Let's Encrypt"
            echo "🔍 Verificando motivo..."

            if sudo certbot certificates 2>&1 | grep -q "too many certificates"; then
                echo "⚠️ Rate limit detectado! Use a opção 2 para certificado autoassinado."
                echo "📅 O rate limit expira em: 2025-11-19 01:58:42 UTC"
            fi
        fi
        ;;
    2)
        echo "🔐 Gerando certificado autoassinado..."
        if [[ -f "./generate_self_signed_ssl.sh" ]]; then
            chmod +x ./generate_self_signed_ssl.sh
            ./generate_self_signed_ssl.sh
        else
            echo "❌ Script não encontrado. Execute manualmente:"
            echo "   ./generate_self_signed_ssl.sh"
        fi
        ;;
    3)
        echo "⚙️ Configurando Nginx para HTTP apenas..."

        # Configurar Nginx HTTP apenas
        sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-backend << EOF
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
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 24h;
    }
}
EOF

        sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-frontend << EOF
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;

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

        # Testar e reiniciar
        if sudo nginx -t; then
            sudo systemctl reload nginx
            echo "✅ Nginx configurado para HTTP apenas"
            echo ""
            echo "🌐 Seus sites estão disponíveis em:"
            echo "   http://$FRONTEND_DOMAIN"
            echo "   http://$BACKEND_DOMAIN"
        else
            echo "❌ Erro na configuração do Nginx"
        fi
        ;;
    4)
        echo "📋 Verificando rate limits do Let's Encrypt..."
        echo ""
        sudo certbot certificates 2>&1 | head -20
        echo ""
        echo "📊 Estatísticas:"
        sudo certbot certificates 2>&1 | grep -i "too many\|rate\|limit" || echo "✅ Nenhum rate limit detectado"
        ;;
    5)
        echo "🔍 Verificando configuração Nginx..."
        echo ""
        echo "📋 Sites ativos:"
        ls -la /etc/nginx/sites-enabled/
        echo ""
        echo "📋 Teste de configuração:"
        if sudo nginx -t; then
            echo "✅ Configuração Nginx está correta"
        else
            echo "❌ Erro na configuração Nginx"
        fi
        echo ""
        echo "📋 Portas em uso:"
        netstat -tuln | grep -E ":80|:443" || echo "Nenhuma porta detectada"
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

echo ""
echo "💡 Dicas adicionais:"
echo "   • Rate limit do Let's Encrypt: 5 certificados por domínio a cada 7 dias"
echo "   • Use domínios diferentes para testes: test1.seudominio.com, test2.seudominio.com"
echo "   • Certificados autoassinados exigem exceção no navegador"
echo "   • Para produção, aguarde o rate limit expirar e use Let's Encrypt"