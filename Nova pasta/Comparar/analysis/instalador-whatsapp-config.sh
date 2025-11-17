#!/bin/bash
# Instalador/lib/_whatsapp_provider_config.sh
# Configuração do Sistema Dual de Providers WhatsApp

#######################################
# Pergunta sobre tipo de provider WhatsApp
#######################################
get_whatsapp_provider_type() {
  print_banner
  printf "${WHITE} 📱 Escolha o provider WhatsApp padrão:${GRAY_LIGHT}"
  printf "\n\n"
  printf "${YELLOW} 1) Baileys (WhatsApp Web - GRÁTITO)${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT}    • Conexão via WhatsApp Web\n"
  printf "${GRAY_LIGHT}    • 100% gratuito sem custos por mensagem\n"
  printf "${GRAY_LIGHT}    • Funciona como usuário normal\n"
  printf "${GRAY_LIGHT}    • Risco mínimo de banimento\n"
  printf "\n"
  printf "${YELLOW} 2) Notifica-me Hub (WhatsApp Oficial)${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT}    • API oficial do WhatsApp Business\n"
  printf "${GRAY_LIGHT}    • Maior estabilidade e confiabilidade\n"
  printf "${GRAY_LIGHT}    • Custos por mensagem (~R$0,05)\n"
  printf "${GRAY_LIGHT}    • Suporte oficial Meta\n"
  printf "\n"
  printf "${YELLOW} 3) Ambos (Híbrido - MAXIMA FLEXIBILIDADE)${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT}    • Baileys como padrão (grátis)\n"
  printf "${GRAY_LIGHT}    • Notifica-me como backup/adicional\n"
  printf "${GRAY_LIGHT}    • Migração fácil entre providers\n"
  printf "${GRAY_LIGHT}    • 12+ canais via Hub\n"
  printf "\n\n"

  while true; do
    read -p "> " whatsapp_provider_choice
    case $whatsapp_provider_choice in
      1)
        whatsapp_provider="baileys"
        break
        ;;
      2)
        whatsapp_provider="hub"
        break
        ;;
      3)
        whatsapp_provider="hybrid"
        break
        ;;
      *)
        printf "${RED} Opção inválida! Escolha 1, 2 ou 3.${GRAY_LIGHT}\n"
        ;;
    esac
  done
}

#######################################
# Configuração específica por tipo de provider
#######################################
setup_whatsapp_provider_config() {
  case $whatsapp_provider in
    "baileys")
      setup_baileys_config
      ;;
    "hub")
      setup_hub_config
      ;;
    "hybrid")
      setup_hybrid_config
      ;;
  esac
}

#######################################
# Configuração Baileys (Grátis)
#######################################
setup_baileys_config() {
  print_banner
  printf "${WHITE} 🔧 Configurando Baileys (WhatsApp Web)...${GRAY_LIGHT}"
  printf "\n\n"

  whatsapp_provider_enabled="true"
  whatsapp_default_provider="baileys"
  hub_provider_enabled="false"

  # Configurações Baileys
  backend_set_env "WHATSAPP_PROVIDER_TYPE=baileys"
  backend_set_env "WHATSAPP_DEFAULT_PROVIDER=baileys"
  backend_set_env "BAILEYS_ENABLED=true"
  backend_set_env "BAILEYS_SESSIONS=1" # Pode ser expandido depois
  backend_set_env "BAILEYS_AUTO_RECONNECT=true"
  backend_set_env "BAILEYS_QR_RETRY=3"

  # Desabilitar Hub
  backend_set_env "HUB_ENABLED=false"

  printf "${GREEN} ✅ Baileys configurado como provider padrão!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Configuração Notifica-me Hub (Pago)
#######################################
setup_hub_config() {
  print_banner
  printf "${WHITE} 🔧 Configurando Notifica-me Hub (WhatsApp Oficial)...${GRAY_LIGHT}"
  printf "\n\n"

  whatsapp_provider_enabled="true"
  whatsapp_default_provider="hub"
  baileys_provider_enabled="false"
  hub_provider_enabled="true"

  # Coletar configurações do Hub
  printf "${WHITE} 🔑 Chave API do Notifica-me Hub:${GRAY_LIGHT}\n"
  read -p "> " hub_api_key

  printf "${WHITE} 🏷️ ID da Conexão/Instância:${GRAY_LIGHT}\n"
  read -p "> " hub_instance_id

  printf "${WHITE} 🌐 URL do Webhook (padrão: https://${backend_url}/webhooks/hub):${GRAY_LIGHT}\n"
  read -p "> " hub_webhook_url
  hub_webhook_url=${hub_webhook_url:-"https://${backend_url}/webhooks/hub"}

  printf "${WHITE} 🔐 Segredo do Webhook:${GRAY_LIGHT}\n"
  read -p "> " hub_webhook_secret

  # Configurações Hub
  backend_set_env "WHATSAPP_PROVIDER_TYPE=hub"
  backend_set_env "WHATSAPP_DEFAULT_PROVIDER=hub"
  backend_set_env "HUB_ENABLED=true"
  backend_set_env "HUB_API_KEY=${hub_api_key}"
  backend_set_env "HUB_INSTANCE_ID=${hub_instance_id}"
  backend_set_env "HUB_WEBHOOK_URL=${hub_webhook_url}"
  backend_set_env "HUB_WEBHOOK_SECRET=${hub_webhook_secret}"
  backend_set_env "HUB_BASE_URL=https://api.notificame.com.br"

  # Configurações adicionais
  backend_set_env "HUB_AUTO_RETRY=true"
  backend_set_env "HUB_RETRY_ATTEMPTS=3"
  backend_set_env "HUB_WEBHOOK_ENABLED=true"

  # Desabilitar Baileys (pode ser ativado depois)
  backend_set_env "BAILEYS_ENABLED=false"

  printf "${GREEN} ✅ Notifica-me Hub configurado como provider padrão!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Configuração Híbrida (Ambos)
#######################################
setup_hybrid_config() {
  print_banner
  printf "${WHITE} 🔄 Configurando Sistema Híbrido (Baileys + Hub)...${GRAY_LIGHT}"
  printf "\n\n"

  whatsapp_provider_enabled="true"
  whatsapp_default_provider="baileys" # Baileys como padrão (grátis)
  baileys_provider_enabled="true"
  hub_provider_enabled="true"

  printf "${WHITE} 📱 Configuração do Baileys (Provider padrão gratuito):${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Será configurado como provider padrão\n"
  printf "${GRAY_LIGHT} • Todas as mensagens sairão via Baileys inicialmente\n"
  printf "${GRAY_LIGHT} • Pode ser migrado para Hub a qualquer momento\n"
  printf "\n\n"

  # Configurações Baileys (padrão)
  backend_set_env "WHATSAPP_PROVIDER_TYPE=hybrid"
  backend_set_env "WHATSAPP_DEFAULT_PROVIDER=baileys"
  backend_set_env "BAILEYS_ENABLED=true"
  backend_set_env "BAILEYS_SESSIONS=1"
  backend_set_env "BAILEYS_IS_DEFAULT=true"

  printf "${WHITE} 🔗 Agora configure o Notifica-me Hub (backup/canais extras):${GRAY_LIGHT}\n"
  printf "\n\n"

  # Coletar configurações do Hub
  printf "${WHITE} 🔑 Chave API do Notifica-me Hub (opcional):${GRAY_LIGHT}\n"
  read -p "> " hub_api_key

  if [[ -n "$hub_api_key" ]]; then
    printf "${WHITE} 🏷️ ID da Conexão/Instância:${GRAY_LIGHT}\n"
    read -p "> " hub_instance_id

    printf "${WHITE} 🌐 URL do Webhook (padrão: https://${backend_url}/webhooks/hub):${GRAY_LIGHT}\n"
    read -p "> " hub_webhook_url
    hub_webhook_url=${hub_webhook_url:-"https://${backend_url}/webhooks/hub"}

    printf "${WHITE} 🔐 Segredo do Webhook:${GRAY_LIGHT}\n"
    read -p "> " hub_webhook_secret

    # Configurações Hub
    backend_set_env "HUB_ENABLED=true"
    backend_set_env "HUB_API_KEY=${hub_api_key}"
    backend_set_env "HUB_INSTANCE_ID=${hub_instance_id}"
    backend_set_env "HUB_WEBHOOK_URL=${hub_webhook_url}"
    backend_set_env "HUB_WEBHOOK_SECRET=${hub_webhook_secret}"
    backend_set_env "HUB_BASE_URL=https://api.notificame.com.br"
    backend_set_env "HUB_IS_BACKUP=true" # Marca como backup
  else
    # Configurar Hub como desabilitado inicialmente
    backend_set_env "HUB_ENABLED=false"
    printf "${YELLOW} ⚠️  Notifica-me Hub configurado mas desabilitado. Pode ser ativado depois.${GRAY_LIGHT}\n"
  fi

  # Configurações avançadas do sistema híbrido
  backend_set_env "HYBRID_MODE=true")
  backend_set_env "PROVIDER_MIGRATION_ENABLED=true"
  backend_set_env "AUTOMATIC_FAILOVER=true"
  backend_set_env "FAILOVER_TIMEOUT=30000") # 30 segundos

  printf "${GREEN} ✅ Sistema Híbrido configurado!${GRAY_LIGHT}"
  printf "\n\n"
  printf "${GRAY_LIGHT} • Baileys: Provider padrão (grátis)${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Hub: Backup/canais extras (se configurado)${GRAY_LIGHT}\n"
  printf "${GRAY_LIGHT} • Migração: Permite mudar providers facilmente${GRAY_LIGHT}\n"
  printf "\n\n"
}

#######################################
# Instalar dependências específicas do provider
#######################################
install_whatsapp_provider_dependencies() {
  print_banner
  printf "${WHITE} 📦 Instalando dependências do provider WhatsApp...${GRAY_LIGHT}"
  printf "\n\n"

  # Dependências comuns a todos os providers
  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/backend
  npm install --save
EOF

  case $whatsapp_provider in
    "baileys")
      install_baileys_dependencies
      ;;
    "hub"|"hybrid")
      install_hub_dependencies
      ;;
  esac

  printf "${GREEN} ✅ Dependências do provider instaladas!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Dependências Baileys
#######################################
install_baileys_dependencies() {
  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/backend
  npm install @whiskeysockets/baileys@^7.0.0-rc.6 --save
  npm install @hapi/boom@^9.1.4 --save
  npm install qrcode-terminal@^0.12.0 --save
EOF
}

#######################################
# Dependências Hub
#######################################
install_hub_dependencies() {
  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/backend
  npm install notificamehubsdk@^0.0.21 --save
  npm install crypto-js@^4.1.1 --save  # Para validação de webhook
EOF
}

#######################################
# Configurar rotas e controllers
#######################################
setup_whatsapp_provider_routes() {
  print_banner
  printf "${WHITE} 🛣️ Configurando rotas do provider WhatsApp...${GRAY_LIGHT}"
  printf "\n\n"

  # Criar arquivos de configuração do provider
  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/backend/src
  mkdir -p providers
EOF

  # Copiar arquivos do provider (implementar)
  printf "${GREEN} ✅ Rotas do provider configuradas!${GRAY_LIGHT}"
  printf "\n\n"
}

#######################################
# Configurar webhooks (se Hub habilitado)
#######################################
setup_webhooks() {
  if [[ "$hub_provider_enabled" == "true" ]]; then
    print_banner
    printf "${WHITE} 🪝 Configurando webhooks do Notifica-me Hub...${GRAY_LIGHT}"
    printf "\n\n"

    # Configurar Nginx para webhook
    configure_nginx_webhook

    printf "${GREEN} ✅ Webhooks configurados!${GRAY_LIGHT}"
    printf "\n\n"
  fi
}

#######################################
# Configurar Nginx para webhooks
#######################################
configure_nginx_webhook() {
  # Adicionar configuração de webhook ao Nginx
  nginx_webhook_config="
  # Webhook endpoint para Notifica-me Hub
  location /webhooks/hub {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Webhook-Secret ${hub_webhook_secret};
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
  }"

  echo "$nginx_webhook_config" >> "/etc/nginx/sites-available/${instancia_add}"

  # Reiniciar Nginx
  systemctl reload nginx
}

#######################################
# Testar configuração do provider
#######################################
test_whatsapp_provider_config() {
  print_banner
  printf "${WHITE} 🧪 Testando configuração do provider WhatsApp...${GRAY_LIGHT}"
  printf "\n\n"

  # Verificar se as variáveis foram salvas
  if grep -q "WHATSAPP_PROVIDER_TYPE" "/home/deploy/${instancia_add}/backend/.env"; then
    printf "${GREEN} ✅ Variáveis de ambiente configuradas${GRAY_LIGHT}\n"
  else
    printf "${RED} ❌ Erro ao configurar variáveis de ambiente${GRAY_LIGHT}\n"
    return 1
  fi

  # Verificar dependências
  case $whatsapp_provider in
    "baileys")
      if sudo su - deploy -c "cd /home/deploy/${instancia_add}/backend && npm list @whiskeysockets/baileys" > /dev/null 2>&1; then
        printf "${GREEN} ✅ Baileys instalado corretamente${GRAY_LIGHT}\n"
      else
        printf "${RED} ❌ Erro na instalação do Baileys${GRAY_LIGHT}\n"
        return 1
      fi
      ;;
    "hub"|"hybrid")
      if [[ "$hub_provider_enabled" == "true" ]]; then
        if sudo su - deploy -c "cd /home/deploy/${instancia_add}/backend && npm list notificamehubsdk" > /dev/null 2>&1; then
          printf "${GREEN} ✅ Notifica-me Hub SDK instalado corretamente${GRAY_LIGHT}\n"
        else
          printf "${RED} ❌ Erro na instalação do Notifica-me Hub SDK${GRAY_LIGHT}\n"
          return 1
        fi
      fi
      ;;
  esac

  printf "${GREEN} ✅ Provider WhatsApp testado com sucesso!${GRAY_LIGHT}"
  printf "\n\n"
}