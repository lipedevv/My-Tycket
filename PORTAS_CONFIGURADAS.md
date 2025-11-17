# Configuração de Portas - Instalador Whaticket Plus

## Alterações Realizadas

### Novas Funções Adicionadas
- `get_postgresql_port()` - Solicita ao usuário a porta do PostgreSQL (padrão: 5432)
- `get_docker_port()` - Solicita ao usuário a porta do Docker Daemon (padrão: 2375)

### Portas Configuráveis pelo Usuário

Agora o instalador pergunta sobre TODAS as portas do sistema:

1. 🎨 **Frontend Port** - Porta do painel web (3000-3999)
2. 🔌 **Backend Port** - Porta da API (4000-4999) 
3. 📦 **Redis Port** - Porta do Redis/Agendamento (5000-5999)
4. 🗄️ **PostgreSQL Port** - Porta do banco de dados (padrão: 5432)
5. 🐳 **Docker Daemon Port** - Porta do daemon Docker (padrão: 2375)

### Arquivos Modificados

#### Instalador Principal (`Instalador/`)
- `lib/_inquiry.sh` - Adicionadas funções para PostgreSQL e Docker
- `lib/_backend.sh` - Configuração dinâmica da porta PostgreSQL

#### Instalador Secundário (`Instalador 2/`)
- `lib/_inquiry.sh` - Adicionadas funções para PostgreSQL e Docker  
- `lib/_backend.sh` - Configuração dinâmica da porta PostgreSQL

### Benefícios

- **Flexibilidade Total**: Usuário pode configurar todas as portas conforme necessário
- **Evita Conflitos**: Especialmente importante em servidores com múltiplas instâncias
- **Segurança**: Permite usar portas não-padrão para maior segurança
- **Compatibilidade**: Mantém valores padrão como sugestão

### Uso das Variáveis

As novas variáveis `${postgresql_port}` e `${docker_port}` podem ser utilizadas em:
- Configurações de banco de dados
- Scripts de backup
- Configurações de proxy
- Monitoramento de serviços

## Resolução da Questão Original

A questão no log.txt sobre "perguntar ao usuário sobre essas portas também" foi **RESOLVIDA**.

Agora o instalador oferece controle completo sobre todas as portas do sistema.