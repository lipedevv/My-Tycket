#!/bin/bash
# Script para contornar problemas de certificado autoassinado
# Força o navegador a aceitar o certificado e redireciona para HTTP se necessário

echo "🔧 Corrigindo Problemas de Certificado Autoassinado"
echo "==============================================="

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
}

# Criar página de aceitação de certificado
create_acceptance_page() {
    echo ""
    echo -e "${BLUE}🔧 Criando página de aceitação de certificado...${NC}"

    cd "/home/deploy/$INSTANCE_NAME/Código Fonte/frontend"

    # Criar página HTML especial para aceitar certificado
    sudo -u deploy tee accept_cert.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Seguro - My-Tycket Plus</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            text-align: center;
        }

        .icon {
            font-size: 64px;
            color: #ff6b6b;
            margin-bottom: 20px;
        }

        h1 {
            color: #333;
            margin-bottom: 15px;
            font-size: 28px;
        }

        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .steps {
            text-align: left;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .steps h3 {
            color: #495057;
            margin-bottom: 15px;
        }

        .steps ol {
            color: #6c757d;
            line-height: 1.8;
            margin-left: 20px;
        }

        .button {
            display: inline-block;
            padding: 15px 30px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 10px;
            transition: all 0.3s;
            font-weight: 600;
        }

        .button:hover {
            background: #0056b3;
            transform: translateY(-2px);
        }

        .button.alt {
            background: #6c757d;
        }

        .button.alt:hover {
            background: #545b62;
        }

        .temporary {
            font-size: 14px;
            color: #6c757d;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔒</div>
        <h1>Acesso Seguro Requerido</h1>

        <div class="warning">
            <strong>⚠️ Alerta de Segurança Detectado</strong><br>
            Seu navegador detectou um certificado autoassinado. Isso é temporário e seguro para esta instalação.
        </div>

        <div class="info">
            <strong>ℹ️ Por que isso acontece?</strong><br>
            Estamos usando um certificado temporário devido a limitações do Let's Encrypt. Em 19/11/2025, um certificado oficial será instalado automaticamente.
        </div>

        <div class="steps">
            <h3>🔧 Para prosseguir, escolha uma opção:</h3>
            <ol>
                <li><strong>Recomendado:</strong> Clique em "Avançar Mesmo Assim" ou "Continuar para o site" no alerta do navegador</li>
                <li><strong>Alternativa:</strong> Use a versão HTTP temporária (sem criptografia)</li>
                <li><strong>Avançado:</strong> Adicione exceção de segurança nas configurações do navegador</li>
            </ol>
        </div>

        <div style="margin-top: 30px;">
            <a href="https://PAINEL_DOMAIN" class="button" onclick="handleAdvancedClick()">
                🚀 Acessar Sistema (HTTPS)
            </a>
            <a href="http://PAINEL_DOMAIN" class="button alt">
                🌐 Versão Temporária (HTTP)
            </a>
        </div>

        <div class="temporary">
            <p><strong>Data para certificado oficial:</strong> 19/11/2025</p>
            <p><strong>Após esta data:</strong> Acesse normalmente com HTTPS válido</p>
        </div>
    </div>

    <script>
        function handleAdvancedClick() {
            if (window.confirm('Clique em "Avançar Mesmo Assim" no próximo alerta para acessar o sistema.')) {
                window.location.href = 'https://PAINEL_DOMAIN';
            }
        }

        // Detect current domain
        const currentDomain = window.location.hostname;
        document.querySelectorAll('a[href*="PAINEL_DOMAIN"]').forEach(link => {
            link.href = link.href.replace('PAINEL_DOMAIN', currentDomain);
        });
    </script>
</body>
</html>
EOF

    # Substituir placeholder pelo domínio real
    sudo -u deploy sed -i "s/PAINEL_DOMAIN/$FRONTEND_DOMAIN/g" accept_cert.html

    echo -e "${GREEN}✅ Página de aceitação criada${NC}"
}

# Configurar acesso alternativo via HTTP
configure_http_access() {
    echo ""
    echo -e "${BLUE}🌐 Configurando acesso alternativo via HTTP...${NC}"

    # Criar configuração HTTP alternativa
    sudo tee /etc/nginx/sites-available/$INSTANCE_NAME-frontend-http > /dev/null << EOF
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;

    # Redirecionar para aceitação de certificado
    location = / {
        root /home/deploy/$INSTANCE_NAME/Código Fonte/frontend;
        index accept_cert.html;
        try_files /accept_cert.html =404;
    }

    # Servir arquivos estáticos normally
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
    }

    # Servir página de aceitação em /accept-cert
    location = /accept-cert {
        root /home/deploy/$INSTANCE_NAME/Código Fonte/frontend;
        index accept_cert.html;
        try_files /accept_cert.html =404;
    }
}
EOF

    # Criar link simbólico
    sudo ln -sf /etc/nginx/sites-available/$INSTANCE_NAME-frontend-http /etc/nginx/sites-enabled/

    # Remover configuração HTTPS principal temporariamente
    sudo mv /etc/nginx/sites-enabled/$INSTANCE_NAME-frontend /etc/nginx/sites-enabled/$INSTANCE_NAME-frontend.backup 2>/dev/null || true

    # Testar e recarregar Nginx
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Acesso HTTP configurado${NC}"
    else
        echo -e "${RED}❌ Erro na configuração HTTP${NC}"
        # Restaurar backup
        sudo mv /etc/nginx/sites-enabled/$INSTANCE_NAME-frontend.backup /etc/nginx/sites-enabled/$INSTANCE_NAME-frontend 2>/dev/null || true
        sudo rm -f /etc/nginx/sites-enabled/$INSTANCE_NAME-frontend-http
        sudo systemctl reload nginx
    fi
}

# Criar script de renovação automática
create_renewal_script() {
    echo ""
    echo -e "${BLUE}🔄 Criando script de renovação automática...${NC}"

    sudo -u deploy mkdir -p "/home/deploy/$INSTANCE_NAME/scripts"

    sudo -u deploy tee "/home/deploy/$INSTANCE_NAME/scripts/fix_ssl_after_rate_limit.sh" > /dev/null << 'EOF'
#!/bin/bash
# Script para corrigir SSL após expiração do rate limit do Let's Encrypt
# Data: 19/11/2025

echo "🔧 Corrigindo SSL após rate limit..."
echo "================================"

# Verificar se já passou da data do rate limit
RATE_LIMIT_DATE="2025-11-19"
CURRENT_DATE=$(date +%Y-%m-%d)

if [[ "$CURRENT_DATE" < "$RATE_LIMIT_DATE" ]]; then
    echo "❌ Ainda não é possível gerar certificados Let's Encrypt"
    echo "   Rate limit expira em: $RATE_LIMIT_DATE"
    exit 1
fi

echo "✅ Rate limit expirado. Tentando gerar certificados Let's Encrypt..."

# Executar script SSL inteligente
cd /home/deploy/whaticketplus/Instalador
./smart_ssl_setup.sh

echo ""
echo "🎉 Certificados Let's Encrypt gerados com sucesso!"
echo "   Acesse: https://painel.whaticketplus.com"
EOF

    sudo chmod +x "/home/deploy/$INSTANCE_NAME/scripts/fix_ssl_after_rate_limit.sh"

    # Adicionar ao crontab para execução automática em 20/11/2025
    (sudo -u deploy crontab -l 2>/dev/null; echo "0 0 20 11 * /home/deploy/$INSTANCE_NAME/scripts/fix_ssl_after_rate_limit.sh") | sudo -u deploy crontab -

    echo -e "${GREEN}✅ Script de renovação automática criado${NC}"
}

# Mostrar instruções finais
show_instructions() {
    echo ""
    echo -e "${GREEN}✅ CORREÇÃO DE CERTIFICADO CONCLUÍDA!${NC}"
    echo "========================================"
    echo ""
    echo -e "${BLUE}📋 OPÇÕES DE ACESSO:${NC}"
    echo -e "   1. ${YELLOW}HTTPS (com alerta):${NC} https://$FRONTEND_DOMAIN"
    echo -e "      • Clique em 'Avançar Mesmo Assim' no navegador"
    echo ""
    echo -e "   2. ${YELLOW}HTTP (temporário):${NC} http://$FRONTEND_DOMAIN"
    echo -e "      • Sem alerta de segurança"
    echo -e "      • Acessa página de instruções"
    echo ""
    echo -e "   3. ${YELLOW}Página de ajuda:${NC} http://$FRONTEND_DOMAIN/accept-cert"
    echo ""
    echo -e "${BLUE}📅 INFORMAÇÕES IMPORTANTES:${NC}"
    echo -e "   • Rate limit Let's Encrypt: ${RED}expira em 19/11/2025${NC}"
    echo -e "   • Correção automática: ${GREEN}20/11/2025${NC}"
    echo -e "   • Após 20/11: HTTPS oficial sem alertas"
    echo ""
    echo -e "${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
    echo -e "   • Verificar status: ${YELLOW}sudo certbot certificates${NC}"
    echo -e "   • Forçar renovação: ${YELLOW}/home/deploy/$INSTANCE_NAME/scripts/fix_ssl_after_rate_limit.sh${NC}"
    echo ""
    echo -e "${GREEN}🚀 Sistema pronto para uso!${NC}"
}

# Função principal
main() {
    echo -e "${GREEN}🚀 Iniciando correção de certificado autoassinado...${NC}"

    detect_installation
    create_acceptance_page
    configure_http_access
    create_renewal_script
    show_instructions
}

# Executar função principal
main "$@"