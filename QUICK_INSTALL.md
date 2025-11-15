# ⚡ INSTALAÇÃO RÁPIDA - ATIKETET

## 🚀 Comando de Instalação Única

### Ubuntu Server 22.04 LTS (Comando solicitado):
```bash
sudo bash -c "apt update && apt upgrade -y && apt install sudo git -y && rm -rf atiketet && git clone https://github.com/DEV7Kadu/Atiketet.git atiketet && cd atiketet && chmod +x ./atiketet && ./atiketet"
```

### Alternativa via curl (mais simples):
```bash
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/DEV7Kadu/Atiketet/main/install.sh)"
```

---

## 📋 Como Funciona

1. **Atualiza sistema** (`apt update && upgrade`)
2. **Instala dependências** (`git`, `sudo`) 
3. **Remove instalação anterior** (se existir)
4. **Clona repositório** do GitHub
5. **Executa instalador inteligente** (detecta Ubuntu automaticamente)
6. **Instala sistema completo** com todas as dependências

---

## 🎯 Compatibilidade Automática

- **Ubuntu 20.04**: Script `install_primaria`
- **Ubuntu 22.04**: Script `install_ubuntu22` 
- **Ubuntu 24.04**: Script `install_ubuntu22`

---

## 🔧 Comandos Auxiliares

### Diagnóstico do sistema:
```bash
cd atiketet && sudo ./scripts/diagnostico.sh
```

### Nova instância (segunda empresa):
```bash
cd atiketet && sudo ./Instalador/install_instancia_ubuntu22
```

---

## 📊 Requisitos Mínimos

- **OS**: Ubuntu Server 22.04 LTS
- **RAM**: 2GB (recomendado 4GB)
- **Disk**: 20GB livres
- **User**: root ou sudo
- **Network**: Internet estável

---

**Após instalação, acesse:** `https://seu-dominio.com`