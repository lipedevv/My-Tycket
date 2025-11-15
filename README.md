# 🚀 Atiketet - Sistema de Atendimento WhatsApp

## 📱 Sistema completo de atendimento via WhatsApp com múltiplas instâncias

### ✨ Recursos principais:
- 📞 Atendimento via WhatsApp
- 👥 Múltiplos usuários e departamentos
- 🏢 Múltiplas empresas/instâncias
- 📊 Dashboard e relatórios
- 🤖 Chatbot integrado
- 📋 Gestão de tickets
- 🎫 Sistema de filas
- 📎 Envio de arquivos
- 🔔 Notificações em tempo real

---

## ⚡ **INSTALAÇÃO RÁPIDA**

### **Ubuntu Server 22.04 LTS**:
```bash
sudo bash -c "apt update && apt upgrade -y && apt install sudo git -y && rm -rf atiketet && git clone https://github.com/DEV7Kadu/My-Tycket.git atiketet && cd atiketet && chmod +x ./atiketet && ./atiketet"
```

### **Comando alternativo via curl**:
```bash
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/install.sh)"
```

---

## 🏢 **NOVA INSTÂNCIA (Segunda empresa)**

Após ter o sistema principal instalado:
```bash
cd atiketet && sudo ./Instalador/install_instancia_ubuntu22
```

---

## 🖥️ **REQUISITOS DO SISTEMA**

- **Sistema Operacional**: Ubuntu 20.04, 22.04 ou 24.04 LTS
- **RAM**: Mínimo 2GB (Recomendado 4GB)
- **Armazenamento**: Mínimo 20GB de espaço livre
- **Usuário**: Acesso root ou sudo
- **Internet**: Conexão estável para download das dependências

---

## 🎯 **COMPATIBILIDADE**

| Ubuntu Version | Status | Script |
|---|---|---|
| **20.04 LTS** | ✅ Suportado | `install_primaria` |
| **22.04 LTS** | ✅ **Recomendado** | `install_ubuntu22` |
| **24.04 LTS** | ✅ Suportado | `install_ubuntu22` |

---

## 🛠️ **TECNOLOGIAS UTILIZADAS**

### **Backend**:
- Node.js 20.x LTS
- TypeScript
- Express.js
- Sequelize ORM
- PostgreSQL
- Redis
- Socket.io
- Puppeteer

### **Frontend**:
- React 17.x
- Material-UI
- Socket.io Client

### **Infraestrutura**:
- Docker (Redis)
- Nginx (Proxy reverso)
- Certbot (SSL/HTTPS)
- PM2 (Process Manager)

---

## 🚀 **FUNCIONALIDADES**

### 📞 **Atendimento**:
- ✅ Múltiplas conexões WhatsApp
- ✅ Chat em tempo real
- ✅ Transferência de atendimento
- ✅ Mensagens rápidas
- ✅ Notas internas
- ✅ Histórico de conversas

### 👥 **Gestão**:
- ✅ Usuários e permissões
- ✅ Departamentos/Filas
- ✅ Relatórios detalhados
- ✅ Dashboard analítico
- ✅ Campanhas de disparo
- ✅ Agendamento de mensagens

### 🏢 **Multi-tenancy**:
- ✅ Múltiplas empresas
- ✅ Configurações independentes
- ✅ Bancos separados
- ✅ Domínios personalizados

---

## 🆘 **SUPORTE E RESOLUÇÃO DE PROBLEMAS**

### **Erro comum**: "curl: command not found"
```bash
sudo apt update && sudo apt install -y curl
```

### **Erro comum**: "git: command not found"
```bash
sudo apt update && sudo apt install -y git
```

### **Erro comum**: "Permission denied"
```bash
# Sempre execute com sudo
sudo ./atiketet
```

### **Verificar instalação**:
```bash
# Verificar serviços
sudo -u deploy pm2 list
sudo docker ps
sudo systemctl status nginx postgresql

# Verificar portas
sudo netstat -tlnp | grep -E ':(80|443|3000|8080)'
```

---

## 🔒 **SEGURANÇA**

- ✅ HTTPS/SSL automático
- ✅ Autenticação JWT
- ✅ Senhas criptografadas
- ✅ Isolamento de instâncias
- ✅ Backup automático

---

## 📄 **LICENÇA**

Este projeto está licenciado sob a [Licença MIT](LICENSE).

---

## 👨‍💻 **DESENVOLVEDOR**

Desenvolvido e mantido por **DEV7Kadu**

- 🏠 **GitHub**: [DEV7Kadu](https://github.com/DEV7Kadu)
- 📁 **Repositório**: [My-Tycket](https://github.com/DEV7Kadu/My-Tycket)

---

## 🎉 **INSTALAÇÃO COMPLETA EM 1 COMANDO**

```bash
sudo bash -c "apt update && apt upgrade -y && apt install sudo git -y && rm -rf atiketet && git clone https://github.com/DEV7Kadu/My-Tycket.git atiketet && cd atiketet && chmod +x ./atiketet && ./atiketet"
```

**Após a instalação, acesse:** `https://seu-dominio.com`

---

⭐ **Se este projeto foi útil, deixe uma estrela no repositório!** ⭐