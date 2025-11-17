#!/bin/bash
# Script para diagnosticar e corrigir erros 502 Bad Gateway
# Problemas de comunicação Nginx → Backend/Frontend

echo "🔧 Corrigindo Erros 502 Bad Gateway"
echo "================================="

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
                BACKEND_PORT=${PORT:-8080}
                FRONTEND_PORT=${FRONTEND_PORT:-3000}
            else
                FRONTEND_URL="https://painel.whaticketplus.com"
                BACKEND_URL="https://wapi.whaticketplus.com"
                BACKEND_PORT=8080
                FRONTEND_PORT=3000
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
    echo -e "${BLUE}📋 Configuração detectada:${NC}"
    echo -e "   Frontend: ${YELLOW}$FRONTEND_DOMAIN${NC} (porta $FRONTEND_PORT)"
    echo -e "   Backend:  ${YELLOW}$BACKEND_DOMAIN${NC} (porta $BACKEND_PORT)"
}

# Verificar status dos serviços
check_services() {
    echo ""
    echo -e "${BLUE}🔍 Verificando status dos serviços...${NC}"

    # Verificar Nginx
    echo -e "   🌐 Nginx:"
    if systemctl is-active --quiet nginx; then
        echo -e "     ${GREEN}✅ Serviço: Ativo${NC}"
        echo -e "     📋 Porta: $(netstat -tuln | grep ':80 ' | wc -l) processos na porta 80"
        echo -e "     📋 Porta: $(netstat -tuln | grep ':443 ' | wc -l) processos na porta 443"
    else
        echo -e "     ${RED}❌ Serviço: Inativo${NC}"
        echo -e "     🔄 Tentando iniciar Nginx..."
        sudo systemctl start nginx
        sleep 2
    fi

    # Verificar PM2
    echo -e "   📊 PM2:"
    if command -v pm2 >/dev/null 2>&1; then
        echo -e "     ${GREEN}✅ PM2 instalado${NC}"

        # Verificar processos PM2
        local pm2_list=$(pm2 list 2>/dev/null)
        if [[ -n "$pm2_list" ]]; then
            echo -e "     📋 Processos online: $(echo "$pm2_list" | grep -c "online" || echo "0")"

            # Verificar backend
            if echo "$pm2_list" | grep -q "backend.*online\|whaticketplus-backend.*online"; then
                echo -e "     ${GREEN}✅ Backend PM2: Online${NC}"
            else
                echo -e "     ${RED}❌ Backend PM2: Offline${NC}"
            fi

            # Verificar frontend
            if echo "$pm2_list" | grep -q "frontend.*online\|whaticketplus-frontend.*online"; then
                echo -e "     ${GREEN}✅ Frontend PM2: Online${NC}"
            else
                echo -e "     ${RED}❌ Frontend PM2: Offline${NC}"
            fi
        else
            echo -e "     ${YELLOW}⚠️ PM2 sem processos${NC}"
        fi
    else
        echo -e "     ${RED}❌ PM2 não instalado${NC}"
    fi

    # Verificar portas dos aplicativos
    echo -e "   🔌 Portas dos aplicativos:"
    if netstat -tuln 2>/dev/null | grep -q ":$BACKEND_PORT "; then
        echo -e "     ${GREEN}✅ Porta $BACKEND_PORT: Ocupada${NC}"
    else
        echo -e "     ${RED}❌ Porta $BACKEND_PORT: Livre (backend não rodando)${NC}"
    fi

    if netstat -tuln 2>/dev/null | grep -q ":$FRONTEND_PORT "; then
        echo -e "     ${GREEN}✅ Porta $FRONTEND_PORT: Ocupada${NC}"
    else
        echo -e "     ${RED}❌ Porta $FRONTEND_PORT: Livre (frontend não rodando)${NC}"
    fi
}

# Verificar logs de erros
check_error_logs() {
    echo ""
    echo -e "${BLUE}📋 Verificando logs de erros...${NC}"

    # Logs Nginx
    echo -e "   🌐 Logs Nginx (últimas 10 linhas):"
    if [[ -f "/var/log/nginx/error.log" ]]; then
        local nginx_errors=$(tail -10 /var/log/nginx/error.log | grep -v "^[[:space:]]*$" | tail -5)
        if [[ -n "$nginx_errors" ]]; then
            echo -e "     ${RED}Erros encontrados:${NC}"
            echo "$nginx_errors" | while read line; do
                echo -e "     ${RED}  ❌ $line${NC}"
            done
        else
            echo -e "     ${GREEN}✅ Sem erros recentes${NC}"
        fi
    else
        echo -e "     ${YELLOW}⚠️ Arquivo de log não encontrado${NC}"
    fi

    # Logs PM2
    echo -e "   📊 Logs PM2 (últimas 10 linhas):"
    if pm2 list >/dev/null 2>&1; then
        local pm2_logs=$(pm2 logs --lines 10 --err 2>/dev/null | grep -v "^[[:space:]]*$" | tail -5)
        if [[ -n "$pm2_logs" ]]; then
            echo -e "     ${RED}Erros encontrados:${NC}"
            echo "$pm2_logs" | while read line; do
                echo -e "     ${RED}  ❌ $line${NC}"
            done
        else
            echo -e "     ${GREEN}✅ Sem erros recentes${NC}"
        fi
    fi
}

# Testar conectividade local
test_local_connectivity() {
    echo ""
    echo -e "${BLUE}🧪 Testando conectividade local...${NC}"

    # Testar backend localmente
    echo -e "   🔗 Testando Backend (localhost:$BACKEND_PORT):"
    if curl -s --connect-timeout 5 "http://localhost:$BACKEND_PORT" >/dev/null 2>&1; then
        echo -e "     ${GREEN}✅ Backend responde localmente${NC}"
    else
        echo -e "     ${RED}❌ Backend não responde localmente${NC}"

        # Verificar se o processo está rodando
        local backend_pid=$(lsof -ti:$BACKEND_PORT 2>/dev/null)
        if [[ -n "$backend_pid" ]]; then
            echo -e "     📋 Processo rodando: PID $backend_pid"
            echo -e "     📋 Comando: ps -p $backend_pid -o pid,cmd"
            ps -p $backend_pid -o pid,cmd 2>/dev/null || echo -e "     ${RED}❌ Não foi possível obter detalhes${NC}"
        else
            echo -e "     📋 Nenhum processo rodando na porta $BACKEND_PORT"
        fi
    fi

    # Testar frontend localmente
    echo -e "   🎨 Testando Frontend (localhost:$FRONTEND_PORT):"
    if curl -s --connect-timeout 5 "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        echo -e "     ${GREEN}✅ Frontend responde localmente${NC}"
    else
        echo -e "     ${RED}❌ Frontend não responde localmente${NC}"

        # Verificar se o processo está rodando
        local frontend_pid=$(lsof -ti:$FRONTEND_PORT 2>/dev/null)
        if [[ -n "$frontend_pid" ]]; then
            echo -e "     📋 Processo rodando: PID $frontend_pid"
            echo -e "     📋 Comando: ps -p $frontend_pid -o pid,cmd"
            ps -p $frontend_pid -o pid,cmd 2>/dev/null || echo -e "     ${RED}❌ Não foi possível obter detalhes${NC}"
        else
            echo -e "     📋 Nenhum processo rodando na porta $FRONTEND_PORT"
        fi
    fi
}

# Corrigir problemas comuns
fix_common_issues() {
    echo ""
    echo -e "${BLUE}🔧 Corrigindo problemas comuns...${NC}"

    local issues_fixed=false

    # 1. Reiniciar serviços se necessário
    local nginx_needs_restart=false
    local pm2_needs_restart=false

    # Verificar se há processos PM2 parados
    if command -v pm2 >/dev/null 2>&1; then
        local stopped_processes=$(pm2 list 2>/dev/null | grep "stopped" | grep -c "stopped" || echo "0")
        if [[ $stopped_processes -gt 0 ]]; then
            echo -e "   🔄 Reiniciando processos PM2 parados..."
            pm2 restart all 2>/dev/null
            issues_fixed=true
            pm2_needs_restart=true
        fi
    fi

    # 2. Verificar configuração Nginx
    if ! sudo nginx -t >/dev/null 2>&1; then
        echo -e "   🔄 Configuração Nginx inválida, tentando corrigir..."
        nginx_needs_restart=true
        issues_fixed=true
    fi

    # 3. Reiniciar Nginx se necessário
    if [[ "$nginx_needs_restart" == true ]] || [[ "$pm2_needs_restart" == true ]]; then
        echo -e "   🔄 Reiniciando Nginx..."
        sudo systemctl reload nginx
        issues_fixed=true
    fi

    if [[ "$issues_fixed" == true ]]; then
        echo -e "   ${GREEN}✅ Problemas comuns corrigidos${NC}"
    else
        echo -e "   ${YELLOW}⚠️ Nenhum problema comum detectado${NC}"
    fi
}

# Iniciar serviços automaticamente
start_services() {
    echo ""
    echo -e "${BLUE}🚀 Tentando iniciar serviços automaticamente...${NC}"

    local backend_started=false
    local frontend_started=false

    # Iniciar backend
    echo -e "   📦 Iniciando Backend..."
    cd "/home/deploy/$INSTANCE_NAME/Código Fonte/backend"

    # Verificar se existe o arquivo do servidor
    if [[ -f "dist/server.js" ]]; then
        if sudo -u deploy pm2 start dist/server.js --name "${INSTANCE_NAME}-backend" >/dev/null 2>&1; then
            sleep 3
            if pm2 list | grep -q "${INSTANCE_NAME}-backend.*online"; then
                echo -e "   ${GREEN}✅ Backend iniciado com sucesso${NC}"
                backend_started=true
            else
                echo -e "   ${YELLOW}⚠️ Backend iniciado mas pode não estar online${NC}"
                backend_started=true
            fi
        else
            echo -e "   ${RED}❌ Falha ao iniciar backend${NC}"
        fi
    else
        echo -e "   ${RED}❌ Arquivo do backend não encontrado (dist/server.js)${NC}"
        echo -e "   💡 Execute: cd /home/deploy/$INSTANCE_NAME/Código Fonte/backend && npm run build"
    fi

    # Iniciar frontend
    echo -e "   🎨 Iniciando Frontend..."
    cd "/home/deploy/$INSTANCE_NAME/Código Fonte/frontend"

    # Verificar se existe build ou server.js
    if [[ -f "server.js" ]]; then
        # Parar processo anterior se existir
        sudo -u deploy pm2 stop "${INSTANCE_NAME}-frontend" 2>/dev/null || true
        sudo -u deploy pm2 delete "${INSTANCE_NAME}-frontend" 2>/dev/null || true

        if sudo -u deploy pm2 start server.js --name "${INSTANCE_NAME}-frontend" >/dev/null 2>&1; then
            sleep 3
            if pm2 list | grep -q "${INSTANCE_NAME}-frontend.*online"; then
                echo -e "   ${GREEN}✅ Frontend iniciado com sucesso${NC}"
                frontend_started=true
            else
                echo -e "   ${YELLOW}⚠️ Frontend iniciado mas pode não estar online${NC}"
                frontend_started=true
            fi
        else
            echo -e "   ${RED}❌ Falha ao iniciar frontend${NC}"
        fi
    elif [[ -f "build/index.html" ]]; then
        echo -e "   📋 Build encontrado, mas server.js ausente"
        echo -e "   🔄 Criando servidor mínimo..."

        sudo -u deploy tee server.js > /dev/null << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, 'build', req.url === '/' ? 'index.html' : req.url);

    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'build', 'index.html');
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
        case '.gif': contentType = 'image/gif'; break;
        case '.ico': contentType = 'image/x-icon'; break;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Server Error</h1>');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    server.close(() => console.log('Process terminated'));
});

process.on('SIGINT', () => {
    console.log('SIGINT received');
    server.close(() => console.log('Process terminated'));
});
EOF

        sudo chmod +x server.js

        if sudo -u deploy pm2 start server.js --name "${INSTANCE_NAME}-frontend" >/dev/null 2>&1; then
            sleep 3
            if pm2 list | grep -q "${INSTANCE_NAME}-frontend.*online"; then
                echo -e "   ${GREEN}✅ Frontend iniciado (servidor mínimo)${NC}"
                frontend_started=true
            else
                echo -e "   ${YELLOW}⚠️ Frontend iniciado mas pode não estar online${NC}"
                frontend_started=true
            fi
        else
            echo -e "   ${RED}❌ Falha ao iniciar frontend${NC}"
        fi
    else
        echo -e "   ${RED}❌ Build e server.js não encontrados${NC}"
        echo -e "   💡 Execute: cd /home/deploy/$INSTANCE_NAME/Código Fonte/frontend && npm run build"
    fi

    return $([[ "$backend_started" == true ]] && [[ "$frontend_started" == true ]] && echo 0 || echo 1)
}

# Verificar se os serviços estão rodando corretamente após correção
verify_fix() {
    echo ""
    echo -e "${BLUE}✅ Verificando se as correções funcionaram...${NC}"

    sleep 5  # Dar tempo para os serviços iniciarem

    # Testar backend novamente
    echo -e "   🔗 Testando Backend novamente:"
    if curl -s --connect-timeout 5 "http://localhost:$BACKEND_PORT" >/dev/null 2>&1; then
        echo -e "     ${GREEN}✅ Backend respondendo${NC}"
    else
        echo -e "     ${RED}❌ Backend ainda não responde${NC}"
    fi

    # Testar frontend novamente
    echo -e "   🎨 Testando Frontend novamente:"
    if curl -s --connect-timeout 5 "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        echo -e "     ${GREEN}✅ Frontend respondendo${NC}"
    else
        echo -e "     ${RED}❌ Frontend ainda não responde${NC}"
    fi

    # Testar através dos domínios
    echo -e "   🌐 Testando Frontend através do domínio:"
    if curl -s -k --connect-timeout 5 "https://$FRONTEND_DOMAIN" | head -1 >/dev/null 2>&1; then
        echo -e "     ${GREEN}✅ Domínio Frontend acessível${NC}"
    else
        echo -e "     ${RED}❌ Domínio Frontend inacessível${NC}"
    fi
}

# Função principal
main() {
    echo -e "${GREEN}🚀 Iniciando correção de erros 502...${NC}"

    detect_installation
    check_services
    check_error_logs
    test_local_connectivity
    fix_common_issues

    # Se houver problemas de conectividade, tentar iniciar serviços
    if ! curl -s --connect-timeout 3 "http://localhost:$BACKEND_PORT" >/dev/null 2>&1 || \
       ! curl -s --connect-timeout 3 "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        echo ""
        echo -e "${YELLOW}⚠️ Problemas de conectividade detectados, tentando iniciar serviços...${NC}"
        start_services
    fi

    verify_fix

    echo ""
    echo -e "${GREEN}✅ Diagnóstico e correção de erros 502 concluídos!${NC}"
    echo ""
    echo -e "${BLUE}📋 Resumo:${NC}"
    echo -e "   🌐 Domínios: ${YELLOW}$FRONTEND_DOMAIN / $BACKEND_DOMAIN${NC}"
    echo -e "   🔌 Portas: ${YELLOW}$FRONTEND_PORT / $BACKEND_PORT${NC}"
    echo ""
    echo -e "${BLUE}💡 Se os erros 502 persistirem:${NC}"
    echo -e "   1. Verifique logs: ${YELLOW}pm2 logs${NC}"
    echo -e "   2. Verifique Nginx: ${YELLOW}sudo nginx -t && sudo systemctl reload nginx${NC}"
    echo -e "   3. Reinicie tudo: ${YELLOW}pm2 restart all && sudo systemctl restart nginx${NC}"
    echo -e "   4. Execute script de frontend: ${YELLOW}./fix_frontend_nginx.sh${NC}"
}

# Executar função principal
main "$@"