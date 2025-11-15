# WhatiTicket Plus - Ubuntu 22/24 LTS Installation Guide

## 🚀 INSTALAÇÃO COMPATÍVEL COM UBUNTU 22/24

### ✅ Versões Suportadas
- Ubuntu 20.04 LTS (Focal)
- Ubuntu 22.04 LTS (Jammy) - **RECOMENDADO**
- Ubuntu 24.04 LTS (Noble)

### 🔧 CORREÇÕES IMPLEMENTADAS

1. **Docker**: Detecção automática da versão do Ubuntu
2. **PostgreSQL**: Método moderno de chaves GPG
3. **Bibliotecas**: Compatibilidade com libgcc-s1 (Ubuntu 22+)
4. **Verificação**: Checagem automática de compatibilidade

---

## 📋 PRIMEIRA INSTALAÇÃO (Ubuntu 22/24)

### Comando Atualizado:
```bash
sudo apt update && sudo apt install -y git && git clone https://github.com/seuusergit/suapasta-whaticketplus && sudo chmod -R 777 suapasta-whaticketplus && cd suapasta-whaticketplus && sudo ./install_ubuntu22
```

### Comando Passo a Passo:
```bash
# 1. Atualizar sistema
sudo apt update

# 2. Instalar git
sudo apt install -y git

# 3. Clonar repositório
git clone https://github.com/seuusergit/suapasta-whaticketplus

# 4. Dar permissões
sudo chmod -R 777 suapasta-whaticketplus

# 5. Entrar no diretório
cd suapasta-whaticketplus

# 6. Executar instalação compatível
sudo ./install_ubuntu22
```

---

## 📋 INSTALAÇÕES ADICIONAIS (Novas Instâncias)

### Para criar instâncias adicionais no mesmo servidor:
```bash
cd ./suapasta-whaticketplus && sudo ./install_instancia_ubuntu22
```

---

## 🛡️ VERIFICAÇÕES DE SEGURANÇA

### O script verifica automaticamente:
- ✅ Versão do Ubuntu
- ✅ Compatibilidade das dependências
- ✅ Disponibilidade dos repositórios
- ✅ Permissões necessárias

### Se aparecer aviso de versão não testada:
```
⚠️ Ubuntu X.X (codename) - Não testado oficialmente
Versões recomendadas: 20.04, 22.04, 24.04
Continuar mesmo assim? (y/n):
```
**Recomendação**: Digite `n` e use Ubuntu 22.04 LTS

---

## 🔍 DIFERENÇAS DOS SCRIPTS ORIGINAIS

### `install_ubuntu22` vs `install_primaria`:
- ✅ Detecção automática da versão Ubuntu
- ✅ Docker com repositório dinâmico
- ✅ PostgreSQL com chaves GPG modernas
- ✅ Bibliotecas compatíveis com Ubuntu 22+
- ✅ Verificação prévia de compatibilidade

### `install_instancia_ubuntu22` vs `install_instancia`:
- ✅ Mesmas correções de compatibilidade
- ✅ Mantém estrutura de múltiplas instâncias
- ✅ Verificação antes de instalar nova instância

---

## 🚨 IMPORTANTE

### Para Ubuntu 20.04:
- Pode usar scripts originais (`install_primaria`, `install_instancia`)
- Ou usar os novos scripts (também compatível)

### Para Ubuntu 22.04/24.04:
- **OBRIGATÓRIO** usar os novos scripts
- Scripts originais **FALHARÃO** na instalação do Docker

---

## 🆘 RESOLUÇÃO DE PROBLEMAS

### Se Docker falhar:
```bash
# Verificar versão do Ubuntu
lsb_release -a

# Se não for 22.04/24.04, verificar repositórios
sudo apt update
```

### Se PostgreSQL der warnings:
```
Warning: apt-key is deprecated
```
**Solução**: Use `install_ubuntu22` que corrige isso

### Se faltar libgcc1:
```
Package 'libgcc1' has no installation candidate
```
**Solução**: Scripts corrigidos usam `libgcc-s1` automaticamente

---

## ✅ VALIDAÇÃO PÓS-INSTALAÇÃO

### Verificar serviços rodando:
```bash
# PM2 processes
sudo -u deploy pm2 list

# Docker containers
sudo docker ps

# Nginx status
sudo systemctl status nginx

# PostgreSQL status
sudo systemctl status postgresql
```

### Verificar portas:
```bash
sudo netstat -tlnp | grep -E ':(80|443|5432|6379)'
```

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verificar logs**:
   ```bash
   sudo -u deploy pm2 logs
   ```

2. **Verificar Ubuntu**:
   ```bash
   lsb_release -a
   ```

3. **Reinstalação limpa**:
   - Use Ubuntu 22.04 LTS
   - Execute `install_ubuntu22`

---

## 🎯 RESUMO

- ✅ **Ubuntu 22.04 LTS**: Recomendado e totalmente suportado
- ✅ **Ubuntu 24.04 LTS**: Suportado com scripts atualizados  
- ⚠️ **Ubuntu 20.04 LTS**: Funciona com ambos os scripts
- ❌ **Outras versões**: Não recomendadas

**Use `install_ubuntu22` para máxima compatibilidade!**