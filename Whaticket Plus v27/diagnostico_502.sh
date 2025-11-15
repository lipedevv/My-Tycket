#!/bin/bash

echo "🔍 DIAGNÓSTICO DO ERRO 502 - WhatiTicket Plus"
echo "=============================================="

echo ""
echo "1. 📊 STATUS DOS SERVIÇOS:"
echo "------------------------"

echo "🔹 Nginx:"
sudo systemctl status nginx --no-pager -l

echo ""
echo "🔹 PostgreSQL:"
sudo systemctl status postgresql --no-pager -l

echo ""
echo "🔹 Processos PM2:"
sudo -u deploy pm2 list

echo ""
echo "🔹 Docker (Redis):"
sudo docker ps

echo ""
echo "2. 📡 PORTAS EM USO:"
echo "-------------------"
sudo netstat -tlnp | grep -E ':(80|443|3000|8080|5432|6379)'

echo ""
echo "3. 📋 LOGS DO PM2:"
echo "------------------"
sudo -u deploy pm2 logs --lines 10

echo ""
echo "4. 📝 CONFIGURAÇÃO NGINX:"
echo "-------------------------"
sudo nginx -t

echo ""
echo "5. 🔍 SITES NGINX ATIVOS:"
echo "-------------------------"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "6. 📊 ESPAÇO EM DISCO:"
echo "---------------------"
df -h

echo ""
echo "7. 🧠 USO DE MEMÓRIA:"
echo "--------------------"
free -h

echo ""
echo "DIAGNÓSTICO CONCLUÍDO!"
echo "======================"