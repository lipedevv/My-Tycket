#!/bin/bash
# 
# functions for setting up app frontend

#######################################
# installed node packages
# Arguments:
#   None
#######################################
frontend_node_dependencies() {
  print_banner
  printf "${WHITE} 💻 Instalando dependências do frontend...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/frontend
  npm install
EOF

  sleep 2
}

#######################################
# compiles frontend code
# Arguments:
#   None
#######################################
frontend_node_build() {
  print_banner
  printf "${WHITE} 💻 Compilando o código do frontend...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/frontend
  
  # Configurar variáveis de ambiente para build otimizado
  export NODE_ENV=production
  export GENERATE_SOURCEMAP=false
  export INLINE_RUNTIME_CHUNK=false
  export NODE_OPTIONS="--max-old-space-size=4096"
  
  # Limpar build anterior se existir
  echo "🧹 Limpando build anterior..."
  rm -rf build/*
  
  # Executar build principal
  echo "🏗️ Construindo aplicação..."
  npm run build
  
  # Verificar se index.html foi criado corretamente
  if [[ -f "build/index.html" ]]; then
    file_size=\$(stat -c%s "build/index.html" 2>/dev/null || stat -f%z "build/index.html" 2>/dev/null)
    if [[ "\$file_size" -gt 100 ]]; then
      echo "✅ Build criado com sucesso (\$file_size bytes)"
      # Criar backup do index.html
      cp "build/index.html" "build/index.html.bak"
      echo "💾 Backup criado: build/index.html.bak"
    else
      echo "⚠️ index.html muito pequeno (\$file_size bytes), tentando rebuild..."
      rm -rf build/*
      npm run build
    fi
  else
    echo "❌ index.html não foi criado! Tentando correção..."
    # Tentar build com configuração alternativa
    npm install --legacy-peer-deps
    npm run build
  fi
  
  # Verificação final
  if [[ -f "build/index.html" ]]; then
    echo "🎉 Frontend compilado com sucesso!"
    ls -la build/index.html
  else
    echo "❌ ERRO: Build do frontend falhou!"
    exit 1
  fi
  
  # Configurar permissões adequadas
  chmod -R 755 build/
EOF

  sleep 2
}

#######################################
# updates frontend code
# Arguments:
#   None
#######################################
frontend_update() {
  print_banner
  printf "${WHITE} 💻 Atualizando o frontend...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - deploy <<EOF
  cd /home/deploy/${empresa_atualizar}
  pm2 stop ${empresa_atualizar}-frontend
  git pull
  cd /home/deploy/${empresa_atualizar}/frontend
  
  # Configurar ambiente para build otimizado
  export NODE_ENV=production
  export GENERATE_SOURCEMAP=false
  export INLINE_RUNTIME_CHUNK=false
  export NODE_OPTIONS="--max-old-space-size=4096"
  
  npm install
  rm -rf build
  
  # Build com verificação automática
  echo "🏗️ Reconstruindo frontend..."
  npm run build
  
  # Verificar se build foi criado corretamente
  if [[ -f "build/index.html" ]]; then
    file_size=\$(stat -c%s "build/index.html" 2>/dev/null || stat -f%z "build/index.html" 2>/dev/null)
    echo "✅ Frontend atualizado com sucesso (\$file_size bytes)"
    # Criar backup
    cp "build/index.html" "build/index.html.bak"
  else
    echo "❌ ERRO: Falha na atualização do frontend!"
    exit 1
  fi
  
  # Configurar permissões
  chmod -R 755 build/
  
  pm2 start ${empresa_atualizar}-frontend
  pm2 save
EOF

  sleep 2
}


#######################################
# sets frontend environment variables
# Arguments:
#   None
#######################################
frontend_set_env() {
  print_banner
  printf "${WHITE} 💻 Configurando variáveis de ambiente (frontend)...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  # ensure idempotency
  backend_url=$(echo "${backend_url/https:\/\/}")
  backend_url=${backend_url%%/*}
  backend_url=https://$backend_url

sudo su - deploy << EOF
  cat <<[-]EOF > /home/deploy/${instancia_add}/frontend/.env
REACT_APP_BACKEND_URL=${backend_url}
REACT_APP_HOURS_CLOSE_TICKETS_AUTO = 24
[-]EOF
EOF

  sleep 2

sudo su - deploy << EOF
  cat <<[-]EOF > /home/deploy/${instancia_add}/frontend/server.js
//simple express server to run frontend production build;
const express = require("express");
const path = require("path");
const app = express();
app.use(express.static(path.join(__dirname, "build")));
app.get("/*", function (req, res) {
	res.sendFile(path.join(__dirname, "build", "index.html"));
});
app.listen(${frontend_port});

[-]EOF
EOF

  sleep 2
}

#######################################
# starts pm2 for frontend
# Arguments:
#   None
#######################################
frontend_start_pm2() {
  print_banner
  printf "${WHITE} 💻 Iniciando pm2 (frontend)...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/frontend
  pm2 start server.js --name ${instancia_add}-frontend
  pm2 save
EOF

 sleep 2
  
  sudo su - root <<EOF
   pm2 startup
  sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
EOF
  sleep 2
}

#######################################
# sets up nginx for frontend
# Arguments:
#   None
#######################################
frontend_nginx_setup() {
  print_banner
  printf "${WHITE} 💻 Configurando nginx (frontend)...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  frontend_hostname=$(echo "${frontend_url/https:\/\/}")

sudo su - root << EOF

cat > /etc/nginx/sites-available/${instancia_add}-frontend << 'END'
server {
  server_name $frontend_hostname;

  location / {
    proxy_pass http://127.0.0.1:${frontend_port};
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
END

ln -s /etc/nginx/sites-available/${instancia_add}-frontend /etc/nginx/sites-enabled
EOF

  sleep 2
}
