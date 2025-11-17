#!/bin/bash
# Instalador/lib/_whatsapp_provider_config.sh
# Configuração do Sistema de Providers WhatsApp (Apenas infraestrutura)

#######################################
# Instala a infraestrutura básica do sistema de providers
# A configuração específica dos providers será feita via painel
#######################################
setup_whatsapp_providers_infra() {
  print_banner
  printf "${WHITE} 🔧 Configurando infraestrutura de Providers WhatsApp...${GRAY_LIGHT}"
  printf "\n\n"

  printf "${GRAY_LIGHT} Instalando dependências básicas do sistema dual de providers${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Baileys (WhatsApp Web - Grátis)${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Notifica-me Hub (WhatsApp Oficial)${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • FlowBuilder (Automação Visual)${GRAY_LIGHT}\n"
  printf "\n\n"

  # Configurações padrão (serão personalizadas via painel)
  backend_set_env "USE_PROVIDERS_SYSTEM=true"
  backend_set_env "USE_DUAL_PROVIDERS=true"
  backend_set_env "USE_DEFAULT_PROVIDER_SELECTION=true"
  backend_set_env "USE_PROVIDER_FALLBACK=true"

  # Feature flags (controlados via painel)
  backend_set_env "USE_FLOWBUILDER=false"  # Habilitado via painel
  backend_set_env "USE_FLOW_ENGINE=false"
  backend_set_env "USE_NOTIFICATION_HUB=false"  # Habilitado via painel

  # Configurações Baileys (padrão, personalizável via painel)
  backend_set_env "BAILEYS_ENABLED=false"  # Habilitado via painel
  backend_set_env "BAILEYS_AUTO_RECONNECT=true"
  backend_set_env "BAILEYS_QR_RETRY=3"

  # Configurações Hub (padrão, personalizável via painel)
  backend_set_env "HUB_ENABLED=false"  # Habilitado via painel
  backend_set_env "HUB_BASE_URL=https://api.notificame.com.br"
  backend_set_env "HUB_AUTO_RETRY=true"
  backend_set_env "HUB_RETRY_ATTEMPTS=3"

  printf "${GREEN} ✅ Infraestrutura de providers configurada!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Pergunta sobre FlowBuilder (infraestrutura apenas)
#######################################
get_flowbuilder_infra() {
  print_banner
  printf "${WHITE} 🎯 Deseja instalar a infraestrutura do FlowBuilder (Automação Visual)?${GRAY_LIGHT}"
  printf "\n\n"
  printf "${GRAY_LIGHT} Isso instalará os componentes base, mas a habilitação será feita via painel.${GRAY_LIGHT}\n"
  printf "\n\n"

  while true; do
    read -p "> " flowbuilder_infra
    case $flowbuilder_infra in
      s|S)
        flowbuilder_infra="true"
        break
        ;;
      n|N)
        flowbuilder_infra="false"
        break
        ;;
      *)
        printf "${RED} Digite s para sim ou n para não.${GRAY_LIGHT}\n"
        ;;
    esac
  done

  if [[ "$flowbuilder_infra" == "true" ]]; then
    backend_set_env "FLOWBUILDER_INFRASTRUCTURE=true"
    printf "${GREEN} ✅ Infraestrutura FlowBuilder será instalada${GRAY_LIGHT}\n"
  else
    backend_set_env "FLOWBUILDER_INFRASTRUCTURE=false"
    printf "${YELLOW} ⚠️  Infraestrutura FlowBuilder não será instalada${GRAY_LIGHT}\n"
  fi
}

#######################################
# Instalar dependências da infraestrutura
#######################################
install_providers_infra_dependencies() {
  print_banner
  printf "${WHITE} 📦 Instalando dependências da infraestrutura de providers...${GRAY_LIGHT}"
  printf "\n\n"

  cd "/home/deploy/${instancia_add}/backend"

  # Dependências Baileys (sempre instalar, mesmo que não seja usado)
  npm install @whiskeysockets/baileys@^7.0.0-rc.6 --save --no-audit --no-fund
  npm install @hapi/boom@^9.1.4 --save --no-audit --no-fund
  npm install qrcode-terminal@^0.12.0 --save --no-audit --no-fund

  printf "${GREEN} ✅ Dependências Baileys instaladas${GRAY_LIGHT}\n"

  # Dependências Hub (sempre instalar, mesmo que não seja usado)
  npm install notificamehubsdk@^0.0.21 --save --no-audit --no-fund
  npm install crypto-js@^4.1.1 --save --no-audit --no-fund

  printf "${GREEN} ✅ Dependências Notifica-me Hub instaladas${GRAY_LIGHT}\n"

  # Dependências FlowBuilder (infraestrutura)
  if [[ "$flowbuilder_infra" == "true" ]]; then
    npm install --save --no-audit --no-fund
    printf "${GREEN} ✅ Dependências FlowBuilder instaladas${GRAY_LIGHT}\n"
  fi

  printf "${GREEN} ✅ Todas as dependências da infraestrutura instaladas!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Instalar dependências Frontend (infraestrutura)
#######################################
install_frontend_infra_dependencies() {
  if [[ "$flowbuilder_infra" == "true" ]]; then
    print_banner
    printf "${WHITE} 📦 Instalando dependências Frontend (FlowBuilder infra)...${GRAY_LIGHT}"
    printf "\n\n"

    cd "/home/deploy/${instancia_add}/frontend"

    npm install reactflow@^11.11.4 --save --no-audit --no-fund
    npm install @types/reactflow@^11.11.4 --save-dev --no-audit --no-fund

    printf "${GREEN} ✅ Dependências Frontend FlowBuilder instaladas!${GRAY_LIGHT}"
    printf "\n\n"
  fi
}

#######################################
# Criar estrutura de diretórios
#######################################
setup_providers_directory_structure() {
  print_banner
  printf "${WHITE} 📁 Criando estrutura de diretórios dos providers...${GRAY_LIGHT}"
  printf "\n\n"

  # Criar diretório de providers no backend
  mkdir -p "/home/deploy/${instancia_add}/backend/src/providers"

  # Criar diretório de sessions para Baileys
  mkdir -p "/home/deploy/${instancia_add}/sessions/baileys"

  # Ajustar permissões
  chown -R deploy:deploy "/home/deploy/${instancia_add}/sessions"

  printf "${GREEN} ✅ Estrutura de diretórios criada!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Configurar Nginx para webhooks (preparação)
#######################################
setup_nginx_webhooks_preparation() {
  print_banner
  printf "${WHITE} 🌐 Preparando Nginx para webhooks...${GRAY_LIGHT}"
  printf "\n\n"

  local nginx_file="/etc/nginx/sites-available/${instancia_add}"

  # Verificar se o arquivo existe
  if [[ -f "$nginx_file" ]]; then
    # Fazer backup
    cp "$nginx_file" "$nginx_file.backup.$(date +%Y%m%d_%H%M%S)"

    # Adicionar seção de webhooks (comentada por enquanto)
    cat >> "$nginx_file" << EOF

# Webhook endpoints para providers (descomente e configure quando necessário)
# location /webhooks/hub {
#     proxy_pass http://127.0.0.1:8080;
#     proxy_set_header Host \$host;
#     proxy_set_header X-Real-IP \$remote_addr;
#     proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#     proxy_set_header X-Forwarded-Proto \$scheme;
#     proxy_read_timeout 300s;
#     proxy_connect_timeout 75s;
# }
EOF

    printf "${GREEN} ✅ Nginx preparado para webhooks${GRAY_LIGHT}\n"
    printf "${GRAY_LIGHT} • A seção de webhooks foi adicionada mas comentada${GRAY_LIGHT}\n"
    printf "${GRAY_LIGHT} • Descomente e configure quando habilitar providers via painel${GRAY_LIGHT}\n"
  else
    printf "${YELLOW} ⚠️  Arquivo Nginx não encontrado, será configurado posteriormente${GRAY_LIGHT}\n"
  fi

  printf "\n\n"
}

#######################################
# Testar instalação da infraestrutura
#######################################
test_providers_infra_installation() {
  print_banner
  printf "${WHITE} 🧪 Testando instalação da infraestrutura de providers...${GRAY_LIGHT}"
  printf "\n\n"

  # Verificar se as variáveis foram salvas
  if grep -q "USE_PROVIDERS_SYSTEM=true" "/home/deploy/${instancia_add}/backend/.env"; then
    printf "${GREEN} ✅ Sistema de providers habilitado${GRAY_LIGHT}\n"
  else
    printf "${RED} ❌ Erro ao habilitar sistema de providers${GRAY_LIGHT}\n"
    return 1
  fi

  # Verificar dependências Baileys
  if sudo -u deploy npm list @whiskeysockets/baileys --prefix="/home/deploy/${instancia_add}/backend" > /dev/null 2>&1; then
    printf "${GREEN} ✅ Baileys instalado corretamente${GRAY_LIGHT}\n"
  else
    printf "${RED} ❌ Erro na instalação do Baileys${GRAY_LIGHT}\n"
    return 1
  fi

  # Verificar dependências Hub
  if sudo -u deploy npm list notificamehubsdk --prefix="/home/deploy/${instancia_add}/backend" > /dev/null 2>&1; then
    printf "${GREEN} ✅ Notifica-me Hub SDK instalado corretamente${GRAY_LIGHT}\n"
  else
    printf "${RED} ❌ Erro na instalação do Notifica-me Hub SDK${GRAY_LIGHT}\n"
    return 1
  fi

  # Verificar FlowBuilder se foi solicitado
  if [[ "$flowbuilder_infra" == "true" ]]; then
    if [[ -d "/home/deploy/${instancia_add}/backend/src/providers" ]]; then
      printf "${GREEN} ✅ Estrutura de providers criada${GRAY_LIGHT}\n"
    else
      printf "${YELLOW} ⚠️  Estrutura de providers não encontrada (será criada ao iniciar)${GRAY_LIGHT}\n"
    fi

    if sudo -u deploy npm list reactflow --prefix="/home/deploy/${instancia_add}/frontend" > /dev/null 2>&1; then
      printf "${GREEN} ✅ FlowBuilder frontend instalado corretamente${GRAY_LIGHT}\n"
    else
      printf "${RED} ❌ Erro na instalação do FlowBuilder frontend${GRAY_LIGHT}\n"
      return 1
    fi
  fi

  # Verificar diretório de sessions
  if [[ -d "/home/deploy/${instancia_add}/sessions/baileys" ]]; then
    printf "${GREEN} ✅ Diretório de sessions criado${GRAY_LIGHT}\n"
  else
    printf "${YELLOW} ⚠️  Diretório de sessions não encontrado${GRAY_LIGHT}\n"
  fi

  printf "${GREEN} ✅ Infraestrutura de providers testada com sucesso!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Mostrar informações pós-instalação
#######################################
show_post_installation_info() {
  print_banner
  printf "${WHITE} 📋 INFRAESTRUTURA CONFIGURADA COM SUCESSO${GRAY_LIGHT}"
  printf "\n\n"

  printf "${WHITE} 📱 Sistema Dual de Providers WhatsApp:${GRAY_LIGHT}\n"
  printf "${GREEN} ✅ Baileys (WhatsApp Web - Grátis)${GRAY_LIGHT}\n"
  printf "${GREEN} ✅ Notifica-me Hub (WhatsApp Oficial)${GRAY_LIGHT}\n"

  if [[ "$flowbuilder_infra" == "true" ]]; then
    printf "${GREEN} ✅ FlowBuilder (Automação Visual)${GRAY_LIGHT}\n"
  fi

  printf "\n"

  printf "${WHITE} 🎯 PRÓXIMOS PASSOS:${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} 1. Acesse o painel administrativo: https://${frontend_url}${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} 2. Vá em Configurações > Providers WhatsApp${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} 3. Adicione e configure seus providers${GRAY_LIGHT}\n"
  printf "\n"

  printf "${WHITE} 📚 Documentação de Configuração:${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Baileys: Configure QR Code via painel${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Notifica-me Hub: Configure API Key e webhook via painel${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • FlowBuilder: Crie automações visuais via painel${GRAY_LIGHT}\n"
  printf "\n"

  printf "${WHITE} 🔐 Segurança:${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Todos os providers estão desabilitados por padrão${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Configure apenas após instalação completa${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Use chaves API seguras e webhooks com validação${GRAY_LIGHT}\n"
  printf "\n"

  printf "${GREEN} ✅ Sistema pronto para configuração via painel!${GRAY_LIGHT}"
  printf "\n\n"
}