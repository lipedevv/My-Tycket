# 🚀 WHATICKET PLUS - INSTALAÇÃO RÁPIDA

## ⚡ COMANDO ONE-LINER

### **Para Ubuntu 22.04/24.04 LTS (Recomendado)**:
```bash
sudo bash -c "apt update && apt upgrade -y && apt install sudo git curl lsb-release -y && rm -rf My-Tycket && git clone https://github.com/DEV7Kadu/My-Tycket.git && cd My-Tycket && chmod +x ./whaticketplus && ./whaticketplus"
```

### **Versão Compacta**:
```bash
curl -sSL https://raw.githubusercontent.com/DEV7Kadu/My-Tycket/main/install.sh | sudo bash
```

---

## 📋 **O QUE O COMANDO FAZ**

1. **Atualiza o sistema** (`apt update && apt upgrade`)
2. **Instala dependências básicas** (`git`, `curl`, `lsb-release`)
3. **Remove instalação anterior** se existir
4. **Clona o repositório** do GitHub
5. **Executa o instalador inteligente** que detecta sua versão do Ubuntu
6. **Instala automaticamente** com o script correto

---

## 🎯 **DETECÇÃO AUTOMÁTICA**

O instalador detecta automaticamente:
- ✅ **Ubuntu 20.04**: Usa `install_primaria`
- ✅ **Ubuntu 22.04**: Usa `install_ubuntu22` 
- ✅ **Ubuntu 24.04**: Usa `install_ubuntu22`
- ⚠️ **Outras versões**: Pergunta se quer continuar

---

## 🛠️ **INSTALAÇÃO MANUAL (Se preferir)**

```bash
# 1. Baixar
git clone https://github.com/DEV7Kadu/My-Tycket.git
cd My-Tycket

# 2. Executar instalador inteligente
sudo ./whaticketplus

# 3. OU escolher script específico:
# Ubuntu 20.04:
sudo ./Instalador/install_primaria

# Ubuntu 22.04/24.04:
sudo ./Instalador/install_ubuntu22
```

---

## 📁 **NOVA INSTÂNCIA (Servidor já configurado)**

```bash
cd My-Tycket && sudo ./Instalador/install_instancia_ubuntu22
```

---

## ⚠️ **REQUISITOS**

- **Sistema**: Ubuntu 20.04, 22.04 ou 24.04 LTS
- **Usuário**: Root ou sudo
- **Internet**: Conexão estável
- **Hardware**: Mínimo 2GB RAM, 20GB espaço

---

## 🆘 **RESOLUÇÃO DE PROBLEMAS**

### Erro: "comando não encontrado"
```bash
# Instalar dependências primeiro
sudo apt update
sudo apt install -y git curl lsb-release
```

### Erro de permissão:
```bash
# Executar com sudo
sudo ./whaticketplus
```

### Script não executa:
```bash
# Dar permissão
chmod +x ./whaticketplus
```

---

## 📞 **SUPORTE**

- 📁 **Repositório**: https://github.com/DEV7Kadu/My-Tycket
- 📖 **Documentação**: [README_Ubuntu22.md](Instalador/README_Ubuntu22.md)
- 🔧 **Guia Técnico**: [COMPATIBILITY_REPORT.md](Instalador/COMPATIBILITY_REPORT.md)