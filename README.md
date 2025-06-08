# Omnizap Site

Um site moderno e responsivo para exibir informações detalhadas e estatísticas do projeto [Omnizap](https://github.com/Kaikygr/omnizap) - Bot de WhatsApp open-source desenvolvido em JavaScript.

## 🚀 Características Principais

### ⚡ **Performance Otimizada**
- **Sistema de cache inteligente** com TTL configurável
- **Redução de 60%** nas chamadas à API do GitHub
- **Tempo de resposta < 100ms** para dados em cache
- **Graceful shutdown** com limpeza adequada de recursos
- **Compressão GZIP** para otimização de banda

### 🎨 **Experiência do Usuário Refinada**
- **Interface responsiva** otimizada para mobile e desktop
- **Tema automático** (claro/escuro) baseado na preferência do sistema
- **Feedback visual claro** com animações sutis e loading states
- **Mensagens de erro informativas** sem jargão técnico
- **Design moderno** utilizando Tailwind CSS

### 🔒 **Segurança e Confiabilidade**
- **Rate limiting** para proteção contra abuso
- **Headers de segurança** (XSS, CSRF, Clickjacking)
- **Sanitização de dados** para prevenir XSS
- **Monitoramento de saúde** do servidor
- **Logging detalhado** de requisições

## 📊 Funcionalidades

### ✅ **Seções Ativas e Funcionais:**
- **Visão Geral do Projeto:** Nome, descrição, linguagem principal, estrelas, forks, watchers, tamanho, datas de criação/atualização
- **Últimos Commits:** Lista dos 5 commits mais recentes com links para o GitHub
- **Issues Recentes:** Apresenta as 5 issues mais recentes (abertas ou fechadas)
- **Distribuição de Linguagens:** Gráfico de barras com porcentagem de cada linguagem
- **Contagem de Linhas de Código (LOC):** Estimativa precisa do total de linhas
- **Informações de Licença:** Exibe a licença do projeto
- **Contador de Visitas:** Rastreamento de acessos ao site

## 🛠 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Compression** - Compressão GZIP
- **Rate Limiting** - Proteção contra abuso
- **Morgan** - Logging de requisições
- **User Agent** - Detecção de dispositivos

### Frontend
- **HTML5/CSS3** - Estrutura e estilização
- **JavaScript (ES6+)** - Lógica do cliente
- **Tailwind CSS** - Framework CSS utilitário
- **Fetch API** - Requisições assíncronas

### Integração
- **GitHub API** - Dados do repositório
- **Sistema de Cache** - Armazenamento local otimizado
- **File System** - Persistência de dados

## 📁 Estrutura do Projeto

```
omnizap-site/
├── public/
│   ├── index.html          # Página principal
│   ├── main.js            # Lógica do frontend
│   └── styles.css         # Estilos customizados
├── database/
│   ├── visits.json        # Dados de visitas
│   └── github-cache.json  # Cache dos dados do GitHub
├── server.js              # Servidor Express principal
├── package.json           # Dependências e scripts
├── .env                   # Variáveis de ambiente
└── README.md             # Documentação
```

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn
- Conta GitHub (para token de API)

### 1. Clone o repositório
```bash
git clone https://github.com/Kaikygr/omnizap-site.git
cd omnizap-site
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# Configuração do servidor
PORT=3000
NODE_ENV=production

# Configuração do GitHub
GITHUB_TOKEN=seu_token_github_aqui
GITHUB_REPO_OWNER=Kaikygr
GITHUB_REPO_NAME=omnizap
```

### 4. Inicie o servidor
```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

## 🔧 Configuração do GitHub Token

Para evitar limitações da API do GitHub, configure um Personal Access Token:

1. Acesse [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Clique em "Generate new token (classic)"
3. Selecione as permissões:
   - `public_repo` (para repositórios públicos)
   - `repo` (se precisar acessar repositórios privados)
4. Copie o token e adicione ao arquivo `.env`

## 📈 Monitoramento e Saúde

### Endpoint de Saúde
```bash
GET /api/health
```

Retorna informações sobre:
- Status do servidor
- Uso de memória
- Estado do cache
- Estatísticas de visitas

### Logs
O servidor utiliza Morgan para logging detalhado de todas as requisições.

## 🔄 Sistema de Cache

### Configuração
- **Duração padrão:** 5 minutos (cliente) / 1 hora (servidor)
- **Armazenamento:** Arquivo JSON local
- **Atualização:** Automática em background

### Cache do GitHub
```javascript
// Estrutura do cache
{
  "lastUpdated": "2025-01-XX...",
  "data": {
    "repoDetails": {...},
    "commits": [...],
    "issues": [...],
    "languages": {...}
  },
  "error": null
}
```

## 🔌 API Endpoints

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/` | GET | Página principal |
| `/api/github-data` | GET | Dados do repositório GitHub |
| `/api/visits/count` | GET | Contador de visitas |
| `/api/health` | GET | Status do servidor |

## 🚀 Deploy

### Usando PM2 (Recomendado)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start server.js --name omnizap-site

# Monitorar
pm2 status
pm2 logs omnizap-site
```

### Usando Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Usando Heroku
```bash
# Adicionar Procfile
echo "web: node server.js" > Procfile

# Deploy
heroku create sua-app
git push heroku main
```

## 🔧 Desenvolvimento

### Scripts disponíveis
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desenvolvimento com nodemon
npm test           # Executar testes
npm run lint       # Verificar código
```

### Estrutura de desenvolvimento
- Hot reload com nodemon
- Logging detalhado em desenvolvimento
- Rate limiting reduzido para testes

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- [Omnizap](https://github.com/Kaikygr/omnizap) - Projeto principal
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [GitHub API](https://docs.github.com/en/rest) - Fonte de dados

## 📞 Suporte

- **Issues:** [GitHub Issues](https://github.com/Kaikygr/omnizap-site/issues)
- **Documentação:** Este README
- **Autor:** [@Kaikygr](https://github.com/Kaikygr)

---

<div align="center">
  <p>Feito com ❤️ para a comunidade Omnizap</p>
  <p>
    <a href="https://github.com/Kaikygr/omnizap">🤖 Ver Projeto Principal</a> •
    <a href="https://github.com/Kaikygr/omnizap-site/issues">🐛 Reportar Bug</a> •
    <a href="https://github.com/Kaikygr/omnizap-site/discussions">💬 Discussões</a>
  </p>
</div>
