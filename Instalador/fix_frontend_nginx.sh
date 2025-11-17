#!/bin/bash
# Script para corrigir problemas de Nginx com frontend
# MIME types, 503 errors, arquivos estáticos

echo "🔧 Corrigindo Configuração Nginx - Frontend"
echo "======================================="

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

            if [[ -f "/home/deploy/$INSTANCE_NAME/backend/.env" ]]; then
                source "/home/deploy/$INSTANCE_NAME/backend/.env"
                FRONTEND_URL=${FRONTEND_URL:-"https://app.whaticketplus.com"}
                FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||')
            else
                FRONTEND_DOMAIN="app.whaticketplus.com"
            fi
        else
            echo -e "${RED}❌ Nenhuma instância encontrada${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Diretório /home/deploy não encontrado${NC}"
        exit 1
    fi
}

# Verificar status dos serviços
check_services() {
    echo ""
    echo -e "${BLUE}🔍 Verificando status dos serviços...${NC}"

    # Verificar Nginx
    if systemctl is-active --quiet nginx; then
        echo -e "   ✅ Nginx: Ativo"
    else
        echo -e "   ❌ Nginx: Inativo"
        echo -e "   🔄 Iniciando Nginx..."
        sudo systemctl start nginx
        sleep 2
    fi

    # Verificar PM2
    if command -v pm2 >/dev/null 2>&1; then
        local pm2_status=$(pm2 list 2>/dev/null | grep -c "online" || echo "0")
        echo -e "   📊 PM2: $pm2_status processos online"

        # Verificar se frontend está rodando
        if pm2 list 2>/dev/null | grep -q "frontend.*online\|whaticketplus-frontend.*online"; then
            echo -e "   ✅ Frontend PM2: Online"
        else
            echo -e "   ❌ Frontend PM2: Offline"
            echo -e "   🔄 Tentando iniciar frontend..."
            cd "/home/deploy/$INSTANCE_NAME/Código Fonte/frontend"
            sudo -u deploy pm2 start server.js --name "whaticketplus-frontend" 2>/dev/null || \
            sudo -u deploy pm2 start build --name "whaticketplus-frontend" --spa 2>/dev/null || \
            echo -e "   ${YELLOW}⚠️ Não foi possível iniciar frontend automaticamente${NC}"
        fi

        # Verificar se backend está rodando
        if pm2 list 2>/dev/null | grep -q "backend.*online\|whaticketplus-backend.*online"; then
            echo -e "   ✅ Backend PM2: Online"
        else
            echo -e "   ❌ Backend PM2: Offline"
            echo -e "   🔄 Tentando iniciar backend..."
            cd "/home/deploy/$INSTANCE_NAME/Código Fonte/backend"
            sudo -u deploy pm2 start dist/server.js --name "whaticketplus-backend" 2>/dev/null || \
            echo -e "   ${YELLOW}⚠️ Não foi possível iniciar backend automaticamente${NC}"
        fi
    else
        echo -e "   ❌ PM2: Não encontrado"
    fi
}

# Verificar arquivos do frontend
check_frontend_files() {
    echo ""
    echo -e "${BLUE}📁 Verificando arquivos do frontend...${NC}"

    local frontend_path="/home/deploy/$INSTANCE_NAME/Código Fonte/frontend"

    if [[ -d "$frontend_path" ]]; then
        echo -e "   ✅ Diretório frontend encontrado"

        # Verificar build
        if [[ -d "$frontend_path/build" ]]; then
            local build_size=$(du -sh "$frontend_path/build" 2>/dev/null | cut -f1)
            local file_count=$(find "$frontend_path/build" -type f | wc -l)
            echo -e "   ✅ Build encontrado (${build_size}, ${file_count} arquivos)"

            # Verificar arquivos principais
            if [[ -f "$frontend_path/build/index.html" ]]; then
                local index_size=$(stat -c%s "$frontend_path/build/index.html" 2>/dev/null || echo "0")
                if [[ $index_size -gt 1000 ]]; then
                    echo -e "   ✅ index.html: OK (${index_size} bytes)"
                else
                    echo -e "   ${YELLOW}⚠️ index.html: Possivelmente corrompido (${index_size} bytes)${NC}"
                fi
            else
                echo -e "   ${RED}❌ index.html: Não encontrado${NC}"
            fi

            # Verificar arquivos estáticos
            if [[ -d "$frontend_path/build/static" ]]; then
                local css_count=$(find "$frontend_path/build/static" -name "*.css" | wc -l)
                local js_count=$(find "$frontend_path/build/static" -name "*.js" | wc -l)
                echo -e "   ✅ Arquivos estáticos: ${css_count} CSS, ${js_count} JS"

                if [[ $css_count -eq 0 ]] || [[ $js_count -eq 0 ]]; then
                    echo -e "   ${YELLOW}⚠️ Arquivos estáticos incompletos${NC}"
                fi
            else
                echo -e "   ${RED}❌ Diretório static não encontrado${NC}"
            fi
        else
            echo -e "   ${RED}❌ Build não encontrado${NC}"
            echo -e "   🔄 Tentando fazer build..."
            cd "$frontend_path"
            sudo -u deploy npm run build 2>/dev/null || echo -e "   ${YELLOW}⚠️ Build falhou${NC}"
        fi
    else
        echo -e "   ${RED}❌ Diretório frontend não encontrado${NC}"
    fi
}

# Criar configuração Nginx robusta
create_nginx_config() {
    echo ""
    echo -e "${BLUE}⚙️ Criando configuração Nginx robusta...${NC}"

    sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-frontend > /dev/null << EOF
# Frontend Configuration for My-Tycket Plus
# Optimized for static file serving and SPA routing

server {
    listen 80;
    server_name $FRONTEND_DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $FRONTEND_DOMAIN;

    # SSL Configuration (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/$FRONTEND_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FRONTEND_DOMAIN/privkey.pem;

    # Fallback to self-signed if Let's Encrypt doesn't exist
    ssl_certificate /etc/ssl/self-signed/combined.crt;
    ssl_certificate_key /etc/ssl/self-signed/combined.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Enable HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Root directory
    root /home/deploy/$INSTANCE_NAME/Código Fonte/frontend/build;
    index index.html;

    # Logging
    access_log /var/log/nginx/$INSTANCE_NAME-frontend-access.log;
    error_log /var/log/nginx/$INSTANCE_NAME-frontend-error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Serve static files directly with proper MIME types
    location ~* \.(?:css|js)$ {
        expires 1y;
        add_header Cache-Control "public";

        # Try files first, then proxy
        try_files \$uri @frontend_proxy;
    }

    # Serve other static assets
    location ~* \.(?:png|jpe?g|gif|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public";

        # Try files first, then proxy
        try_files \$uri @frontend_proxy;
    }

    # Handle static files with correct MIME types
    location /static/ {
        expires 1y;
        add_header Cache-Control "public";

        # Ensure proper MIME types
        location ~* \.css$ {
            add_header Content-Type text/css;
        }

        location ~* \.js$ {
            add_header Content-Type application/javascript;
        }

        # Try files first, then proxy
        try_files \$uri @frontend_proxy;
    }

    # Proxy fallback for dynamic requests
    location @frontend_proxy {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 24h;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;

        # Handle CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';

        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }

    # Main location - serve static files, then proxy
    location / {
        try_files \$uri \$uri/ @frontend_proxy;

        # SPA fallback - serve index.html for non-existent files
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }

    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Ativar o site
    sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-frontend /etc/nginx/sites-enabled/
    echo -e "   ✅ Configuração Nginx criada"
}

# Verificar e corrigir permissões
fix_permissions() {
    echo ""
    echo -e "${BLUE}🔧 Corrigindo permissões...${NC}"

    local frontend_path="/home/deploy/$INSTANCE_NAME/Código Fonte/frontend"

    # Permissões do diretório frontend
    if [[ -d "$frontend_path" ]]; then
        sudo chown -R deploy:deploy "$frontend_path"
        sudo chmod -R 755 "$frontend_path"
        echo -e "   ✅ Permissões do frontend corrigidas"
    fi

    # Permissões do build
    if [[ -d "$frontend_path/build" ]]; then
        sudo chmod -R 644 "$frontend_path/build"/*
        sudo find "$frontend_path/build" -type d -exec chmod 755 {} \;
        echo -e "   ✅ Permissões dos arquivos build corrigidas"
    fi
}

# Testar e recarregar Nginx
test_reload_nginx() {
    echo ""
    echo -e "${BLUE}🔄 Testando e recarregando Nginx...${NC}"

    # Testar configuração
    if sudo nginx -t; then
        echo -e "   ✅ Configuração Nginx válida"

        # Recarregar Nginx
        if sudo systemctl reload nginx; then
            echo -e "   ✅ Nginx recarregado com sucesso"
        else
            echo -e "   ${YELLOW}⚠️ Reload falhou, tentando restart...${NC}"
            if sudo systemctl restart nginx; then
                echo -e "   ✅ Nginx reiniciado com sucesso"
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
}

# Testar acesso ao frontend
test_frontend_access() {
    echo ""
    echo -e "${BLUE}🧪 Testando acesso ao frontend...${NC}"

    # Testar HTTP
    echo -e "   🌐 Testando HTTP..."
    if curl -s -I "http://$FRONTEND_DOMAIN" | head -1; then
        echo -e "   ✅ HTTP: Responde"
    else
        echo -e "   ❌ HTTP: Sem resposta"
    fi

    # Testar HTTPS
    echo -e "   🔒 Testando HTTPS..."
    if curl -s -k -I "https://$FRONTEND_DOMAIN" | head -1; then
        echo -e "   ✅ HTTPS: Responde"
    else
        echo -e "   ❌ HTTPS: Sem resposta"
    fi

    # Testar arquivos estáticos
    echo -e "   📁 Testando arquivos estáticos..."
    if curl -s -k -I "https://$FRONTEND_DOMAIN/static/css/main.*.css" 2>/dev/null | head -1 | grep -q "200"; then
        echo -e "   ✅ CSS: Arquivo encontrado"
    else
        echo -e "   ❌ CSS: Arquivo não encontrado"
    fi

    if curl -s -k -I "https://$FRONTEND_DOMAIN/static/js/main.*.js" 2>/dev/null | head -1 | grep -q "200"; then
        echo -e "   ✅ JS: Arquivo encontrado"
    else
        echo -e "   ❌ JS: Arquivo não encontrado"
    fi

    # Verificar se há processo rodando na porta 3000
    if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
        echo -e "   ✅ Porta 3000: Servidor rodando"
    else
        echo -e "   ❌ Porta 3000: Nenhum servidor rodando"
        echo -e "   💡 O frontend pode precisar ser iniciado manualmente"
    fi
}

# Função principal
main() {
    echo -e "${GREEN}🚀 Iniciando correção do frontend...${NC}"

    detect_installation
    check_services
    check_frontend_files
    create_nginx_config
    fix_permissions
    test_reload_nginx
    test_frontend_access

    echo ""
    echo -e "${GREEN}✅ Correção do frontend concluída!${NC}"
    echo ""
    echo -e "${BLUE}📋 Resumo:${NC}"
    echo -e "   🌐 Domínio: ${YELLOW}$FRONTEND_DOMAIN${NC}"
    echo -e "   🔧 Serviços verificados"
    echo -e "   📁 Arquivos estáticos verificados"
    echo -e "   ⚙️ Nginx reconfigurado"
    echo -e "   🔐 Permissões corrigidas"
    echo ""
    echo -e "${BLUE}💡 Se os problemas persistirem:${NC}"
    echo -e "   1. Verifique se o frontend PM2 está rodando: ${YELLOW}pm2 list${NC}"
    echo -e "   2. Verifique logs do Nginx: ${YELLOW}tail -f /var/log/nginx/$INSTANCE_NAME-frontend-error.log${NC}"
    echo -e "   3. Verifique logs do frontend: ${YELLOW}pm2 logs whaticketplus-frontend${NC}"
    echo -e "   4. Teste build manual: ${YELLOW}cd /home/deploy/$INSTANCE_NAME/Código Fonte/frontend && npm run build${NC}"
}

# Executar função principal
main "$@"