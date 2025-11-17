#!/bin/bash
# Script de correção para instalação SSL com Certbot
# Usa quando o Certbot não conseguiu instalar o certificado automaticamente

echo "🔧 Corrigindo instalação SSL com Certbot"
echo "======================================="

# Detectar domínios da instalação existente
echo "🔍 Detectando configuração existente..."

# Encontrar instância
if [[ -d "/home/deploy" ]]; then
    INSTANCE_DIRS=$(ls -d /home/deploy/*/ 2>/dev/null | head -1)
    if [[ ! -z "$INSTANCE_DIRS" ]]; then
        INSTANCE_NAME=$(basename "$INSTANCE_DIRS")
        echo "✅ Instância encontrada: $INSTANCE_NAME"

        # Tentar ler configurações do arquivo .env
        if [[ -f "/home/deploy/$INSTANCE_NAME/backend/.env" ]]; then
            source "/home/deploy/$INSTANCE_NAME/backend/.env"
            BACKEND_URL=${BACKEND_URL:-"https://api.whaticketplus.com"}
            FRONTEND_URL=${FRONTEND_URL:-"https://app.whaticketplus.com"}
            echo "📋 Domínios detectados:"
            echo "   Backend: $BACKEND_URL"
            echo "   Frontend: $FRONTEND_URL"
        else
            # Usar domínios padrão
            BACKEND_URL="https://api.whaticketplus.com"
            FRONTEND_URL="https://app.whaticketplus.com"
            echo "📋 Usando domínios padrão:"
            echo "   Backend: $BACKEND_URL"
            echo "   Frontend: $FRONTEND_URL"
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
echo "🌐 Domínios para SSL:"
echo "   Backend: $BACKEND_DOMAIN"
echo "   Frontend: $FRONTEND_DOMAIN"

# Verificar se os certificados já foram gerados
echo ""
echo "🔍 Verificando certificados existentes..."
if [[ -d "/etc/letsencrypt/live/$BACKEND_DOMAIN" ]]; then
    echo "✅ Certificado para $BACKEND_DOMAIN encontrado"
else
    echo "❌ Certificado para $BACKEND_DOMAIN não encontrado"
fi

if [[ -d "/etc/letsencrypt/live/$FRONTEND_DOMAIN" ]]; then
    echo "✅ Certificado para $FRONTEND_DOMAIN encontrado"
else
    echo "❌ Certificado para $FRONTEND_DOMAIN não encontrado"
fi

# Opções para o usuário
echo ""
echo "📋 O que você deseja fazer?"
echo "1) 🔧 Reinstalar certificados (recomendado)"
echo "2) ⚙️ Configurar Nginx manualmente"
echo "3) 🔄 Tentar instalação manual do Certbot"
echo "4) ❓ Sair"
echo ""
read -p "Escolha uma opção [1-4]: " -n 1 -r
echo

case $REPLY in
    1)
        echo "🔄 Reinstalando certificados..."
        ;;
    2)
        echo "⚙️ Configurando Nginx manualmente..."
        ;;
    3)
        echo "🔄 Tentando instalação manual do Certbot..."
        ;;
    4)
        echo "👋 Saindo..."
        exit 0
        ;;
    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac

# Opção 1: Reinstalar certificados
if [[ $REPLY == "1" ]]; then
    echo ""
    echo "🔧 Etapa 1: Verificando configuração Nginx..."

    # Verificar se os server blocks existem
    if [[ ! -f "/etc/nginx/sites-available/$INSTANCE_NAME-backend" ]]; then
        echo "⚠️ Server block do backend não encontrado, criando..."

        sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-backend > /dev/null <<EOF
server {
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
  }
}
EOF

        sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-backend /etc/nginx/sites-enabled/
        echo "✅ Server block do backend criado"
    fi

    if [[ ! -f "/etc/nginx/sites-available/$INSTANCE_NAME-frontend" ]]; then
        echo "⚠️ Server block do frontend não encontrado, criando..."

        sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-frontend > /dev/null <<EOF
server {
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
  }
}
EOF

        sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-frontend /etc/nginx/sites-enabled/
        echo "✅ Server block do frontend criado"
    fi

    # Remover configuração default se existir
    sudo rm -f /etc/nginx/sites-enabled/default

    # Testar configuração Nginx
    echo ""
    echo "🧪 Testando configuração Nginx..."
    sudo nginx -t
    if [[ $? -eq 0 ]]; then
        echo "✅ Configuração Nginx está correta"
    else
        echo "❌ Erro na configuração Nginx - corrija antes de continuar"
        exit 1
    fi

    # Reiniciar Nginx
    echo ""
    echo "🔄 Reiniciando Nginx..."
    sudo systemctl reload nginx
    sudo systemctl restart nginx

    # Instalar certificados
    echo ""
    echo "🔒 Instalando certificados SSL..."

    # Obter email para o Certbot
    if [[ ! -z "$DEPLOY_EMAIL" ]]; then
        EMAIL="$DEPLOY_EMAIL"
    else
        read -p "📧 Digite seu email para o Certbot: " EMAIL
    fi

    # Solicitar certificados
    echo "🔐 Solicitando certificado para: $BACKEND_DOMAIN,$FRONTEND_DOMAIN"
    sudo certbot certonly --nginx \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive \
        --domains "$BACKEND_DOMAIN,$FRONTEND_DOMAIN" \
        --force-renewal

    if [[ $? -eq 0 ]]; then
        echo "✅ Certificados instalados com sucesso!"

        # Reiniciar Nginx para aplicar os certificados
        sudo systemctl reload nginx

        echo ""
        echo "🎉 SSL configurado com sucesso!"
        echo "🌐 Acesse:"
        echo "   Backend: $BACKEND_URL"
        echo "   Frontend: $FRONTEND_URL"

    else
        echo "❌ Falha ao instalar certificados"
        echo "Tente a opção 3 (instalação manual)"
    fi
fi

# Opção 2: Configurar Nginx manualmente
if [[ $REPLY == "2" ]]; then
    echo ""
    echo "⚙️ Configurando Nginx manualmente..."

    echo "📝 Criando server blocks manualmente..."

    # Backend
    sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-backend > /dev/null <<EOF
server {
    listen 80;
    server_name $BACKEND_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

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
    }
}
EOF

    # Frontend
    sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-frontend > /dev/null <<EOF
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

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
    }
}
EOF

    # Ativar sites
    sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-backend /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-frontend /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Testar e reiniciar
    sudo nginx -t && sudo systemctl reload nginx

    echo "✅ Nginx configurado manualmente"
    echo "Agora execute: sudo certbot --nginx"
fi

# Opção 3: Instalação manual do Certbot
if [[ $REPLY == "3" ]]; then
    echo ""
    echo "🔄 Tentando instalação manual do Certbot..."

    # Verificar se os server blocks existem
    echo "🔍 Verificando server blocks..."
    if [[ -f "/etc/nginx/sites-available/$INSTANCE_NAME-backend" ]] && [[ -f "/etc/nginx/sites-available/$INSTANCE_NAME-frontend" ]]; then
        echo "✅ Server blocks encontrados"

        # Garantir que estão ativados
        sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-backend /etc/nginx/sites-enabled/
        sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-frontend /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default

        # Testar Nginx
        sudo nginx -t
        if [[ $? -eq 0 ]]; then
            sudo systemctl reload nginx

            # Instalar manualmente
            echo "🔒 Instalando certificados manualmente..."
            echo "Execute os seguintes comandos:"
            echo ""
            echo "# Para o certificado existente:"
            echo "sudo certbot install --cert-name $BACKEND_DOMAIN"
            echo ""
            echo "# Ou gerar novo certificado:"
            echo "sudo certbot --nginx -d $BACKEND_DOMAIN -d $FRONTEND_DOMAIN"
            echo ""

        else
            echo "❌ Erro na configuração Nginx - execute a opção 2 primeiro"
        fi
    else
        echo "❌ Server blocks não encontrados - execute a opção 2 primeiro"
    fi
fi

echo ""
echo "🎯 Próximos passos:"
echo "1. Verifique se os sites estão acessíveis via HTTP"
echo "2. Execute o comando do Certbot se necessário"
echo "3. Verifique o redirecionamento HTTPS"
echo ""
echo "📋 Comandos úteis:"
echo "   sudo nginx -t                 # Testar configuração Nginx"
echo "   sudo systemctl reload nginx   # Recarregar Nginx"
echo "   sudo certbot certificates     # Listar certificados"
echo "   sudo certbot renew --dry-run  # Testar renovação"