#!/bin/bash
# 
# system management - Ubuntu 22/24 compatible version

#######################################
# Check Ubuntu version compatibility
# Arguments:
#   None
#######################################
ubuntu_compatibility_check() {
  print_banner
  printf "${WHITE} 💻 Verificando compatibilidade do Ubuntu...${GRAY_LIGHT}"
  printf "\n\n"

  VERSION=$(lsb_release -rs)
  CODENAME=$(lsb_release -cs)
  
  case $VERSION in
    "20.04")
      echo "✅ Ubuntu $VERSION (Focal) - Totalmente suportado"
      ;;
    "22.04")
      echo "✅ Ubuntu $VERSION (Jammy) - Totalmente suportado"
      ;;
    "24.04")
      echo "✅ Ubuntu $VERSION (Noble) - Suportado com correções"
      ;;
    *)
      echo "⚠️ Ubuntu $VERSION ($CODENAME) - Não testado oficialmente"
      echo "Versões recomendadas: 20.04, 22.04, 24.04"
      read -p "Continuar mesmo assim? (y/n): " -n 1 -r
      echo
      [[ $REPLY =~ ^[Yy]$ ]] || exit 1
      ;;
  esac

  sleep 2
}

#######################################
# creates user
# Arguments:
#   None
#######################################
system_create_user() {
  print_banner
  printf "${WHITE} 💻 Agora, vamos criar o usuário para a instancia...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  # Verificar se usuário já existe
  if id "deploy" &>/dev/null; then
    echo "⚠️ Usuário 'deploy' já existe, configurando apenas grupos..."
    usermod -aG sudo deploy
  else
    echo "🔹 Criando usuário 'deploy'..."
    # Criar usuário com método mais compatível
    useradd -m -s /bin/bash deploy
    echo "deploy:${mysql_root_password}" | chpasswd
    usermod -aG sudo deploy
    
    # Verificar se foi criado com sucesso
    if id "deploy" &>/dev/null; then
      echo "✅ Usuário 'deploy' criado com sucesso"
    else
      echo "❌ Falha ao criar usuário 'deploy'"
      exit 1
    fi
  fi
  
  # Configurar diretório home
  mkdir -p /home/deploy
  chown deploy:deploy /home/deploy
  chmod 755 /home/deploy
EOF

  sleep 2
}

#######################################
# clones repostories using git
# Arguments:
#   None
#######################################
system_git_clone() {
  print_banner
  printf "${WHITE} 💻 Fazendo download do código Whaticket...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - deploy <<EOF
  # Clone para pasta temporária
  git clone ${link_git} /tmp/whaticket-temp
  
  # Criar estrutura de diretórios
  mkdir -p /home/deploy/${instancia_add}
  
  # Mover código da subpasta para o local correto
  if [ -d "/tmp/whaticket-temp/Código Fonte/backend" ]; then
    mv /tmp/whaticket-temp/Código\ Fonte/backend /home/deploy/${instancia_add}/
  else
    echo "⚠️ Pasta backend não encontrada em 'Código Fonte/'"
  fi
  
  if [ -d "/tmp/whaticket-temp/Código Fonte/frontend" ]; then
    mv /tmp/whaticket-temp/Código\ Fonte/frontend /home/deploy/${instancia_add}/
  else
    echo "⚠️ Pasta frontend não encontrada em 'Código Fonte/'"
  fi
  
  # Limpar pasta temporária
  rm -rf /tmp/whaticket-temp
  
  echo "✅ Código extraído das subpastas com sucesso"
EOF

  sleep 2
}

#######################################
# updates system
# Arguments:
#   None
#######################################
system_update() {
  print_banner
  printf "${WHITE} 💻 Vamos atualizar o sistema Whaticket...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  # Get Ubuntu version for compatibility
  UBUNTU_VERSION=$(lsb_release -rs)
  
  # Base packages for all versions
  BASE_PACKAGES="libxshmfence-dev libgbm-dev wget unzip fontconfig locales gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils"
  
  # Add version-specific packages
  case $UBUNTU_VERSION in
    "20.04")
      PACKAGES="$BASE_PACKAGES libgcc1"
      ;;
    "22.04"|"24.04")
      PACKAGES="$BASE_PACKAGES libgcc-s1"
      ;;
    *)
      # Try both for maximum compatibility
      PACKAGES="$BASE_PACKAGES libgcc-s1 libgcc1"
      ;;
  esac

  sudo su - root <<EOF
  apt -y update
  sudo apt-get install -y $PACKAGES
EOF

  sleep 2
}

#######################################
# installs node - Ubuntu 22/24 compatible
# Arguments:
#   None
#######################################
system_node_install() {
  print_banner
  printf "${WHITE} 💻 Instalando nodejs (Ubuntu 22/24 compatible)...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  # Install Node.js 20.x (LTS)
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  apt-get install -y nodejs
  sleep 2
  npm install -g npm@latest
  sleep 2
  
  # PostgreSQL with modern GPG key handling
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt \$(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list > /dev/null
  sudo apt-get update -y && sudo apt-get -y install postgresql
  sleep 2
  sudo timedatectl set-timezone America/Sao_Paulo
EOF

  sleep 2
}

#######################################
# installs docker - Ubuntu 22/24 compatible
# Arguments:
#   None
#######################################
system_docker_install() {
  print_banner
  printf "${WHITE} 💻 Instalando docker (Ubuntu 22/24 compatible)...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  # Get Ubuntu codename dynamically
  UBUNTU_CODENAME=$(lsb_release -cs)

  sudo su - root <<EOF
  apt install -y apt-transport-https \
                 ca-certificates curl \
                 software-properties-common

  # Modern GPG key handling
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  
  # Dynamic Ubuntu version detection
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $UBUNTU_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt update
  apt install -y docker-ce docker-ce-cli containerd.io
EOF

  sleep 2
}

#######################################
# installs puppeteer dependencies - Ubuntu 22/24 compatible
# Arguments:
#   None
#######################################
system_puppeteer_dependencies() {
  print_banner
  printf "${WHITE} 💻 Instalando puppeteer dependencies (Ubuntu 22/24 compatible)...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  # Get Ubuntu version for compatibility
  UBUNTU_VERSION=$(lsb_release -rs)
  
  # Base packages for all versions
  BASE_DEPS="libxshmfence-dev libgbm-dev wget unzip fontconfig locales gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils"
  
  # Add version-specific packages
  case $UBUNTU_VERSION in
    "20.04")
      PUPPETEER_DEPS="$BASE_DEPS libgcc1"
      ;;
    "22.04"|"24.04")
      PUPPETEER_DEPS="$BASE_DEPS libgcc-s1"
      ;;
    *)
      # Try both for maximum compatibility
      PUPPETEER_DEPS="$BASE_DEPS libgcc-s1"
      ;;
  esac

  sudo su - root <<EOF
  apt-get install -y $PUPPETEER_DEPS
EOF

  sleep 2
}

#######################################
# installs pm2
# Arguments:
#   None
#######################################
system_pm2_install() {
  print_banner
  printf "${WHITE} 💻 Instalando pm2...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  npm install -g pm2
EOF

  sleep 2
}

#######################################
# installs snapd
# Arguments:
#   None
#######################################
system_snapd_install() {
  print_banner
  printf "${WHITE} 💻 Instalando snapd...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  apt install -y snapd
  snap install core
  snap refresh core
EOF

  sleep 2
}

#######################################
# installs certbot
# Arguments:
#   None
#######################################
system_certbot_install() {
  print_banner
  printf "${WHITE} 💻 Instalando certbot...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  apt-get remove certbot
  snap install --classic certbot
  ln -s /snap/bin/certbot /usr/bin/certbot
EOF

  sleep 2
}

#######################################
# installs nginx
# Arguments:
#   None
#######################################
system_nginx_install() {
  print_banner
  printf "${WHITE} 💻 Instalando nginx...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  apt install -y nginx
  rm /etc/nginx/sites-enabled/default
EOF

  sleep 2
}

#######################################
# restarts nginx
# Arguments:
#   None
#######################################
system_nginx_restart() {
  print_banner
  printf "${WHITE} 💻 reiniciando nginx...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  service nginx restart
EOF

  sleep 2
}

#######################################
# setup for nginx.conf
# Arguments:
#   None
#######################################
system_nginx_conf() {
  print_banner
  printf "${WHITE} 💻 configurando nginx...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

sudo su - root << EOF

cat > /etc/nginx/conf.d/deploy.conf << 'END'
client_max_body_size 100M;
END

EOF

  sleep 2
}

#######################################
# setup certbot
# Arguments:
#   None
#######################################
system_certbot_setup() {
  print_banner
  printf "${WHITE} 💻 Configurando certbot...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  backend_domain=$(echo "${backend_url/https:\/\/}")
  frontend_domain=$(echo "${frontend_url/https:\/\/}")

  sudo su - root <<EOF
  certbot -m $deploy_email \
          --nginx \
          --agree-tos \
          --non-interactive \
          --domains $backend_domain,$frontend_domain

EOF

  sleep 2
}