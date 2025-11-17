# 🔧 Guia de Correção Rápida - Problema SSL Certbot

## ❌ **Problema Identificado**
O Certbot gerou os certificados mas não conseguiu instalá-los porque os server blocks do Nginx não foram configurados antes da execução do Certbot.

## ✅ **Solução Imediata (3 comandos)**

### 1. Instalar manualmente o certificado gerado:
```bash
sudo certbot install --cert-name api.whaticketplus.com
```

### 2. Verificar se o frontend também foi configurado:
```bash
sudo certbot install --cert-name app.whaticketplus.com
```

### 3. Reiniciar o Nginx:
```bash
sudo systemctl reload nginx
```

## 🔧 **Solução Automática (Script)**

Execute o script de correção criado:
```bash
cd /home/deploy/NOME_DA_INSTANCIA
curl -fsSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/Instalador/fix_ssl.sh -o fix_ssl.sh
chmod +x fix_ssl.sh
sudo ./fix_ssl.sh
```

Ou diretamente do repositório:
```bash
cd whaticketplus/Instalador
sudo ./fix_ssl.sh
```

## 📋 **Comandos para Diagnóstico**

### Verificar status dos certificados:
```bash
sudo certbot certificates
```

### Verificar configuração Nginx:
```bash
sudo nginx -t
```

### Verificar sites ativos:
```bash
ls -la /etc/nginx/sites-enabled/
```

### Verificar logs do Certbot:
```bash
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## 🚨 **Se Nenhum Certificado Foi Gerado**

Execute este comando para gerar do zero:
```bash
sudo certbot --nginx \
  --email seu-email@exemplo.com \
  --agree-tos \
  --non-interactive \
  -d api.whaticketplus.com \
  -d app.whaticketplus.com
```

## 🔄 **Procedimento Completo (se necessário)**

### 1. Verificar instalação atual:
```bash
# Verificar se os certificados existem
ls -la /etc/letsencrypt/live/

# Verificar configuração Nginx
sudo nginx -t

# Verificar se PM2 está rodando
pm2 status
```

### 2. Criar server blocks manualmente (se necessário):
```bash
# Backend
sudo tee /etc/nginx/sites-available/whaticketplus-backend > /dev/null <<'EOF'
server {
  server_name api.whaticketplus.com;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
EOF

# Frontend
sudo tee /etc/nginx/sites-available/whaticketplus-frontend > /dev/null <<'EOF'
server {
  server_name app.whaticketplus.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
}
EOF

# Ativar sites
sudo ln -sf /etc/nginx/sites-available/whaticketplus-backend /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/whaticketplus-frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar e reiniciar
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Instalar certificados:
```bash
sudo certbot install --cert-name api.whaticketplus.com
sudo certbot install --cert-name app.whaticketplus.com
```

## 🎯 **Verificação Final**

### Testar acesso HTTPS:
```bash
curl -I https://api.whaticketplus.com/health
curl -I https://app.whaticketplus.com
```

### Verificar renovação automática:
```bash
sudo certbot renew --dry-run
```

### Verificar agendamento:
```bash
systemctl list-timers | grep certbot
```

## 📞 **Em Caso de Problemas**

1. **Erros de configuração Nginx**: Verifique `sudo nginx -t`
2. **Certificados não encontrados**: Verifique `sudo certbot certificates`
3. **Portas em uso**: Verifique `sudo netstat -tlnp | grep :80`
4. **Permissões**: Verifique se os arquivos de certificado estão acessíveis

## ⚡ **Comando Mágico (Tente este Primeiro)**

```bash
sudo certbot install --cert-name api.whaticketplus.com && sudo systemctl reload nginx && echo "✅ SSL configurado com sucesso!"
```

Este comando deve resolver a maioria dos casos onde o certificado foi gerado mas não instalado.