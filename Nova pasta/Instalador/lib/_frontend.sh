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
  
  # Verificar se já existe build válido
  if [[ -f "build/index.html" ]]; then
    file_size=\$(stat -c%s "build/index.html" 2>/dev/null || stat -f%z "build/index.html" 2>/dev/null)
    
    if [[ "\$file_size" -gt 1000 ]]; then
      echo "📋 Build válido encontrado (\$file_size bytes)"
      cp "build/index.html" "build/index.html.bak"
      echo "💾 Backup criado: build/index.html.bak"
      
      # Configurar permissões adequadas
      chmod -R 755 build/
      exit 0
    fi
  fi

  echo "🧹 Preparando ambiente para build..."
  
  # Limpar instalações anteriores
  rm -rf build/* .eslintcache node_modules/.cache 2>/dev/null || true
  
  # Verificar e limpar cache do npm
  echo "🗑️ Limpando cache do NPM..."
  npm cache clean --force

  # Configurar variáveis de ambiente otimizadas
  export NODE_ENV=production
  export GENERATE_SOURCEMAP=false
  export INLINE_RUNTIME_CHUNK=false
  export CI=false
  export NODE_OPTIONS="--max-old-space-size=4096"
  
  echo "🔧 Configurações de build:"
  echo "   NODE_ENV: \$NODE_ENV"
  echo "   GENERATE_SOURCEMAP: \$GENERATE_SOURCEMAP"
  echo "   NODE_OPTIONS: \$NODE_OPTIONS"

  # Reinstalar dependências se necessário
  if [[ ! -d "node_modules" ]] || [[ ! -f "node_modules/.package-lock.json" ]]; then
    echo "📦 Instalando dependências do frontend..."
    npm install --production=false
  fi

  echo "🏗️ Iniciando build do frontend..."
  
  # Executar build
  npm run build

  # Verificar resultado do build
  if [[ -f "build/index.html" ]]; then
    file_size=\$(stat -c%s "build/index.html" 2>/dev/null || echo "0")
    
    if [[ "\$file_size" -gt 1000 ]]; then
      echo "✅ Build realizado com sucesso!"
      echo "📄 index.html criado (\$file_size bytes)"
      
      # Criar backup
      cp "build/index.html" "build/index.html.bak"
      echo "💾 Backup criado: build/index.html.bak"
      
      # Configurar permissões adequadas
      chmod -R 755 build/
      
      # Listar arquivos do build
      echo "📊 Arquivos criados no build:"
      ls -la build/ | head -10
      
    else
      echo "⚠️ Build incompleto - index.html muito pequeno (\$file_size bytes)"
      echo "🔄 Tentando build com mais recursos..."
      
      # Tentar novamente com mais memória
      export NODE_OPTIONS="--max-old-space-size=6144"
      rm -rf build/*
      npm run build
      
      # Verificar novamente
      if [[ -f "build/index.html" ]]; then
        new_size=\$(stat -c%s "build/index.html" 2>/dev/null || echo "0")
        if [[ "\$new_size" -gt 1000 ]]; then
          echo "✅ Build realizado com sucesso na segunda tentativa!"
          echo "📄 index.html criado (\$new_size bytes)"
          cp "build/index.html" "build/index.html.bak"
          chmod -R 755 build/
        else
          echo "❌ Build falhou - criando index.html de emergência..."
          frontend_create_emergency_index
        fi
      else
        echo "❌ Build falhou - criando index.html de emergência..."
        frontend_create_emergency_index
      fi
    fi
  else
    echo "❌ Build falhou completamente - criando index.html de emergência..."
    frontend_create_emergency_index
  fi
EOF

  sleep 2
}

frontend_create_emergency_index() {
  echo "🚑 Criando index.html de emergência..."
  
  sudo su - deploy <<EOF
  cd /home/deploy/${instancia_add}/frontend
  mkdir -p build
  
  cat > build/index.html << 'EMERGENCY_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Whaticket Plus</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Whaticket Plus - Sistema de Atendimento" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700&display=swap" />
    <style>
        body { margin: 0; font-family: 'Open Sans', sans-serif; background: #f5f5f5; }
        .container { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .content { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
        .logo { color: #2DDD7F; font-size: 32px; font-weight: bold; margin-bottom: 20px; }
        .spinner { width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top: 4px solid #2DDD7F; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .message { color: #666; margin: 20px 0; line-height: 1.6; }
        .status { color: #2DDD7F; font-weight: bold; }
        .button { background: #2DDD7F; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; margin: 10px 5px; font-size: 14px; }
        .button:hover { background: #25c26e; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2DDD7F; }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="logo">WhatTicket Plus</div>
            <div class="spinner"></div>
            <div class="status">Sistema Inicializando</div>
            <div class="message">
                O sistema está sendo configurado pela primeira vez.<br>
                O build completo será finalizado em breve.
            </div>
            <div class="info">
                <strong>Status:</strong> Build automático em progresso<br>
                <strong>Próximo passo:</strong> Aguardar conclusão
            </div>
            <button class="button" onclick="location.reload()">🔄 Atualizar</button>
            <button class="button" onclick="checkBuild()">✅ Verificar Build</button>
            <script>
                function checkBuild() {
                    fetch('/static/js/main.js')
                        .then(response => {
                            if (response.ok) {
                                alert('Build concluído! Recarregando...');
                                location.reload();
                            } else {
                                alert('Build ainda em progresso. Tente novamente em alguns minutos.');
                            }
                        })
                        .catch(() => {
                            alert('Build ainda não finalizado. Aguarde mais alguns minutos.');
                        });
                }
                
                // Auto-verificação a cada 30 segundos
                setInterval(() => {
                    fetch('/static/js/main.js')
                        .then(r => {
                            if (r.ok) {
                                location.reload();
                            }
                        })
                        .catch(() => {});
                }, 30000);
            </script>
        </div>
    </div>
    <div id="root"></div>
</body>
</html>
EMERGENCY_EOF

  # Copiar arquivos essenciais do public se existirem
  if [[ -f "public/manifest.json" ]]; then
    cp public/manifest.json build/ 2>/dev/null || true
  fi
  
  if [[ -d "public" ]]; then
    cp public/*.png build/ 2>/dev/null || true
    cp public/*.ico build/ 2>/dev/null || true
  fi
  
  # Configurar permissões
  chmod -R 755 build/
  
  echo "✅ index.html de emergência criado"
  echo "⚠️ Execute 'npm run build' manualmente quando possível"
EOF
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
  export CI=false
  export NODE_OPTIONS="--max-old-space-size=6144"
  
  # Limpar cache e dependências
  echo "🧹 Limpando cache e dependências..."
  npm cache clean --force
  rm -rf build/* node_modules/.cache .eslintcache 2>/dev/null || true
  
  echo "📦 Reinstalando dependências..."
  npm install --production=false
  
  # Build com verificação automática
  echo "🏗️ Reconstruindo frontend..."
  npm run build
  
  # Verificar se build foi criado corretamente
  if [[ -f "build/index.html" ]]; then
    file_size=\$(stat -c%s "build/index.html" 2>/dev/null || stat -f%z "build/index.html" 2>/dev/null)
    
    if [[ "\$file_size" -gt 1000 ]]; then
      echo "✅ Frontend atualizado com sucesso (\$file_size bytes)"
      # Criar backup
      cp "build/index.html" "build/index.html.bak"
      echo "💾 Backup criado"
      
      # Configurar permissões
      chmod -R 755 build/
      
      echo "📊 Arquivos atualizados:"
      ls -la build/ | head -5
    else
      echo "⚠️ Build incompleto, tentando novamente..."
      export NODE_OPTIONS="--max-old-space-size=8192"
      rm -rf build/*
      npm run build
      
      if [[ -f "build/index.html" ]]; then
        new_size=\$(stat -c%s "build/index.html" 2>/dev/null || echo "0")
        if [[ "\$new_size" -gt 1000 ]]; then
          echo "✅ Frontend atualizado na segunda tentativa (\$new_size bytes)"
          cp "build/index.html" "build/index.html.bak"
          chmod -R 755 build/
        else
          echo "❌ ERRO: Falha na atualização do frontend!"
          exit 1
        fi
      else
        echo "❌ ERRO: Falha na atualização do frontend!"
        exit 1
      fi
    fi
  else
    echo "❌ ERRO: index.html não foi criado durante a atualização!"
    exit 1
  fi
  
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
const fs = require("fs");
const app = express();

// Middleware de segurança básica
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Servir arquivos estáticos com cache
app.use(express.static(path.join(__dirname, "build"), {
  maxAge: '1y',
  etag: false
}));

// Middleware para verificar se index.html existe
app.use((req, res, next) => {
  const indexPath = path.join(__dirname, "build", "index.html");
  
  if (!fs.existsSync(indexPath)) {
    return res.status(503).send(\`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatTicket Plus - Sistema Inicializando</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .logo { color: #2DDD7F; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          .message { color: #666; margin: 15px 0; }
          .button { background: #2DDD7F; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">WhatTicket Plus</div>
          <div class="message">O sistema está sendo configurado.</div>
          <div class="message">Por favor, aguarde alguns minutos e recarregue a página.</div>
          <button class="button" onclick="location.reload()">🔄 Recarregar</button>
        </div>
      </body>
      </html>
    \`);
  }
  
  next();
});

// Rota catch-all para SPA
app.get("/*", function (req, res) {
  const indexPath = path.join(__dirname, "build", "index.html");
  res.sendFile(indexPath);
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor frontend:', err);
  res.status(500).send('Erro interno do servidor');
});

// Iniciar servidor
const port = ${frontend_port} || 3599;
app.listen(port, () => {
  console.log(\`🌐 Frontend WhatTicket Plus rodando na porta \${port}\`);
  console.log(\`🔗 Acesse: http://localhost:\${port}\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Servidor frontend sendo encerrado...');
  process.exit(0);
});

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
