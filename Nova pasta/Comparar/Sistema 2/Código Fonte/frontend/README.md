# Frontend - My-Tycket

Sistema frontend completo para o My-Tycket com WhatsApp integration.

## 🚀 Tecnologias Utilizadas

- **React 17** - Framework principal
- **Material-UI** - Componentes UI
- **React Router** - Gerenciamento de rotas
- **Socket.io Client** - Comunicação em tempo real
- **Axios** - Client HTTP
- **React Query** - Gerenciamento de cache e dados
- **i18next** - Internacionalização
- **Chart.js** - Gráficos e dashboards

## 📦 Instalação

### Pré-requisitos
- Node.js 18.x - 20.x LTS (**IMPORTANTE**: Node.js 25.x não é compatível)
- npm ou yarn

```bash
# Clonar o repositório
git clone <repositório>
cd frontend

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm start
```

## 🔧 Build para Produção

```bash
# Build padrão
npm run build

# Build com análise de bundle
npm run build:prod
```

Os arquivos de produção serão gerados na pasta `build/`.

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
REACT_APP_BACKEND_URL=https://seu-backend.com
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

## 🐛 Troubleshooting

### Build Errors com Node.js 25+
Se você encontrar erros de `localStorage` durante o build:
1. **Solução Recomendada**: Faça downgrade para Node.js 20.x LTS
2. **Alternativa**: Use nvm para gerenciar versões do Node.js

```bash
# Usando nvm
nvm install 20
nvm use 20
npm run build
```

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── context/       # Contextos React
├── hooks/         # Hooks personalizados
├── pages/         # Páginas da aplicação
├── services/      # Serviços e APIs
├── utils/         # Utilitários
└── setupStorage.js # Polyfill para localStorage
```

## 🔐 Funcionalidades

- **Autenticação e Autorização**
- **WhatsApp Integration**
- **Dashboard Analytics**
- **Gerenciamento de Tickets**
- **Chat em tempo real**
- **Upload de arquivos**
- **Relatórios e exportações**
- **Multi-idioma**
- **Tema claro/escuro**

## 📱 Build para Deploy

O projeto está pronto para deploy em:
- Servidores estáticos (Nginx, Apache)
- CDNs (Cloudflare, AWS S3)
- Plataformas (Vercel, Netlify)

## 📝 Notas Importantes

- Verifique `BUILD_NOTES.md` para informações detalhadas sobre build
- O projeto inclui polyfill para compatibilidade durante o build
- Dependências já otimizadas para produção
- Configuração de CORS e headers incluída

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para o branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença proprietária.