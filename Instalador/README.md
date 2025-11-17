# Instalador Unificado WhatiTicket Plus

Este é o instalador oficial unificado do WhatiTicket Plus, que combina todas as funcionalidades dos instaladores anteriores em uma única ferramenta robusta e flexível.

## 🚀 Recursos

- **Múltiplos Modos de Instalação**: Padrão, Seguro, Atualização e Avançado
- **Backup Automático**: Proteção completa dos dados existentes
- **Validação Pós-instalação**: Verificação automática de funcionamento
- **Rollback Automático**: Reversão em caso de problemas
- **Scripts de Manutenção**: Ferramentas para backup, atualização e correção
- **Compatibilidade**: Ubuntu 22/24 LTS
- **Modo Seguro**: Verificações de segurança para proteger instalações existentes

## 📋 Modos de Instalação

### 1. 🚀 Instalação Padrão (Recomendado)
- Instalação rápida e otimizada
- Validações básicas de compatibilidade
- Ideal para novas instalações

### 2. 🔒 Instalação Segura
- Backup automático completo
- Validações detalhadas de segurança
- Verificação de instalações existentes
- Rollback automático em caso de falha
- Ideal para ambientes de produção

### 3. 🔄 Atualizar Instalação Existente
- Atualiza instalações existentes
- Preserva dados e configurações
- Backup automático antes de atualizar

### 4. ⚙️ Modo Avançado
- Configuração manual de opções
- Escolha individual de recursos
- Controle total sobre o processo

## 🛠️ Como Usar

### Pré-requisitos
- Ubuntu 22/24 LTS
- Acesso sudo
- Conexão com internet

### Execução
```bash
# Baixar e executar o instalador
curl -fsSL https://seu-dominio/install_unificado -o install_unificado
chmod +x install_unificado
sudo ./install_unificado
```

### Durante a Instalação
1. Escolha o modo de instalação desejado
2. Responda às perguntas de configuração
3. Aguarde o processo completar
4. Acesse sua instância via navegador

## 📁 Scripts de Manutenção

Após a instalação, os seguintes scripts ficam disponíveis em `/home/deploy/sua-instancia/scripts/`:

- **`fix_frontend.sh`** - Corrige problemas de build do frontend
- **`backup.sh`** - Cria backup completo da instância
- **`update.sh`** - Atualiza a instância para a versão mais recente
- **`verify_installation.sh`** - Verifica status da instalação

## 🔧 Estrutura do Instalador

```
Instalador/
├── install_unificado          # Instalador principal
├── README.md                  # Este arquivo
├── lib/                       # Bibliotecas de funções
│   ├── _system_ubuntu22.sh    # Funções do sistema Ubuntu 22+
│   ├── _backend.sh            # Funções do backend
│   ├── _frontend.sh           # Funções do frontend
│   └── _inquiry.sh            # Funções interativas
├── variables/                 # Variáveis de configuração
│   ├── manifest.sh            # Manifest principal
│   ├── _app.sh                # Variáveis da aplicação
│   ├── _general.sh            # Variáveis gerais
│   └── _fonts.sh              # Formatação de texto
├── utils/                     # Utilitários
│   ├── manifest.sh            # Utilitários gerais
│   ├── _banner.sh             # Banner e arte
│   └── verify_installation.sh # Verificação pós-instalação
└── config                     # Arquivo de configuração com senhas
```

## 🛡️ Recursos de Segurança

### Verificações Automáticas
- Detecta instalações existentes
- Verifica portas em uso
- Valida versão do Node.js
- Confirma integridade da database

### Backup Automático
- Database PostgreSQL
- Arquivos da aplicação
- Configurações de ambiente
- Estado do PM2

### Rollback
- Restauração automática do backup
- Reversão de alterações do sistema
- Recuperação de configurações

## 📝 Logs e Debug

### Logs de Instalação
```bash
# Ver logs do PM2
pm2 logs nome-instancia

# Ver logs do sistema
sudo journalctl -u nginx

# Ver logs de erro
pm2 logs nome-instancia --err
```

### Validação Manual
```bash
# Verificar status dos serviços
pm2 status

# Testar backend
curl http://localhost:8080/health

# Verificar database
sudo -u postgres psql -d nome-instancia -c "SELECT 1;"
```

## 🔄 Atualização do Instalador

Para atualizar o instalador para a versão mais recente:

```bash
# Fazer backup do instalador atual
cp -r Instalador Instalador_backup_$(date +%Y%m%d)

# Baixar nova versão
git pull origin main

# O instalador unificado substitui todos os anteriores
```

## ❓ Perguntas Frequentes

### Como mudar o modo de instalação?
Execute o instalador novamente e escolha a opção desejada no menu.

### Como fazer rollback manualmente?
```bash
# Encontrar backup mais recente
ls -la /tmp/whaticket_backup_*

# Restaurar manualmente
sudo rsync -a /tmp/whaticket_backup_NOME/instance/ /home/deploy/sua-instancia/
```

### Como corrigir problemas do frontend?
```bash
cd /home/deploy/sua-instancia
./scripts/fix_frontend.sh
```

### Como atualizar para nova versão?
```bash
cd /home/deploy/sua-instancia
./scripts/update.sh
```

## 🚨 Solução de Problemas

### Erro de Porta em Uso
- Verifique se outra aplicação usa a porta configurada
- Use modo de atualização se for uma reinstalação
- Configure uma porta diferente durante a instalação

### Erro no Build do Frontend
- Execute o script de correção: `./scripts/fix_frontend.sh`
- Verifique espaço em disco disponível
- Confirme versão do Node.js (16+)

### Erro de Database
- Verifique se PostgreSQL está rodando
- Confirme credenciais de acesso
- Execute migrações manualmente se necessário

## 📞 Suporte

Para problemas e dúvidas:
- Verifique os logs de erro
- Execute os scripts de verificação
- Consulte a documentação do projeto
- Abra issue no repositório

---

**Versão**: 2.0
**Compatibilidade**: Ubuntu 22/24 LTS
**Última Atualização**: $(date +%Y-%m-%d)