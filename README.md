# Omnizap Site

## Índice

1.  [Visão Geral](#visão-geral)
2.  [Funcionalidades](#funcionalidades)
3.  [Tecnologias Utilizadas](#tecnologias-utilizadas)
4.  [Estrutura do Projeto](#estrutura-do-projeto)
5.  [Pré-requisitos](#pré-requisitos)
6.  [Configuração](#configuração)
    *   [Variáveis de Ambiente](#variáveis-de-ambiente)
7.  [Como Executar Localmente](#como-executar-localmente)
8.  [Scripts NPM](#scripts-npm)
9.  [Mecanismo de Cache](#mecanismo-de-cache)
    *   [Cache do Lado do Cliente (Frontend)](#cache-do-lado-do-cliente-frontend)
    *   [Cache do Lado do Servidor (Backend)](#cache-do-lado-do-servidor-backend)
10. [Rastreamento de Visitas](#rastreamento-de-visitas)
11. [API Endpoints](#api-endpoints)
12. [Autor](#autor)
13. [Licença](#licença)

## Visão Geral

O **Omnizap Site** é uma aplicação web front-end e back-end desenvolvida para exibir informações detalhadas e estatísticas do projeto [Omnizap](https://github.com/Kaikygr/omnizap) hospedado no GitHub. O projeto Omnizap em si é um bot de WhatsApp open-source e educacional, construído em JavaScript com a biblioteca Baileys, focado em automação e aprendizado.

Este site busca dados diretamente da API do GitHub para fornecer informações atualizadas sobre o repositório Omnizap, como detalhes do projeto, commits recentes, issues, distribuição de linguagens e contagem de linhas de código. Além disso, o site rastreia o número total de visitas.

## Funcionalidades

*   **Visão Geral do Projeto:** Exibe o nome, descrição, linguagem principal, número de estrelas, forks, watchers, tamanho do repositório, data de criação, última atualização e último push do projeto Omnizap.
*   **Últimos Commits:** Lista os 5 commits mais recentes do repositório, mostrando a mensagem do commit, autor e data.
*   **Issues Recentes:** Apresenta as 5 issues mais recentes (abertas ou fechadas), com título e status.
*   **Distribuição de Linguagens:** Mostra um gráfico de barras com a porcentagem de cada linguagem de programação utilizada no projeto.
*   **Contagem de Linhas de Código (LOC):** Exibe uma estimativa do total de linhas de código do projeto.
*   **Informações de Licença:** Apresenta a licença sob a qual o projeto Omnizap é distribuído.
*   **Link para o GitHub:** Fornece um link direto para o repositório Omnizap no GitHub.
*   **Contador de Visitas:** Registra e exibe o número total de visitas que o site recebeu.
*   **Design Responsivo:** Adaptável a diferentes tamanhos de tela.
*   **Tema Escuro/Claro:** Suporte a tema claro e escuro, seguindo a preferência do sistema do usuário.
*   **Cache de Dados:** Implementa cache no lado do servidor para dados do GitHub e no lado do cliente para otimizar o carregamento e reduzir requisições à API.

## Tecnologias Utilizadas

*   **Frontend:**
    *   HTML5
    *   CSS3
        *   [Tailwind CSS](https://tailwindcss.com/) (utilizado via CDN para estilização rápida e responsiva)
        *   CSS customizado (`public/styles.css`) para estilos adicionais.
    *   JavaScript (Vanilla JS) para manipulação do DOM, requisições AJAX e lógica do cliente.

*   **Backend:**
    *   Node.js
    *   Express.js para o servidor web e API.

*   **APIs Externas:**
    *   GitHub API v3 para buscar informações do repositório.

*   **Outras Ferramentas e Bibliotecas:**
    *   `dotenv`: Para gerenciamento de variáveis de ambiente.
    *   `compression`: Middleware de compressão para Express.
    *   `express-rate-limit`: Para limitar a taxa de requisições às APIs.
    *   `morgan`: Logger de requisições HTTP.
    *   `express-useragent`: Para parsear informações do User-Agent do visitante.
    *   `node-fetch`: Para realizar requisições HTTP no backend (para a API do GitHub).
    *   `nodemon`: Para reiniciar automaticamente o servidor durante o desenvolvimento.
    *   `eslint`: Para linting de código JavaScript.
    *   `prettier`: Para formatação de código.

## Pré-requisitos

*   Node.js (versão >=18.0.0, conforme `package.json`)
*   npm (versão >=9.0.0, conforme `package.json`)

## Configuração

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/Kaikygr/omnizap-site.git
    cd omnizap-site
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto, baseado no arquivo `.env.example` (se existir) ou conforme as variáveis abaixo.

    ```
    PORT=3000
    GITHUB_TOKEN="seu_github_personal_access_token"
    GITHUB_REPO_OWNER="Kaikygr"
    GITHUB_REPO_NAME="omnizap"
    # ALLOWED_ORIGINS=http://localhost:3000,https://seu-dominio.com
    ```

    *   `PORT`: A porta em que o servidor será executado (padrão: 3000).
    *   `GITHUB_TOKEN`: (Opcional, mas recomendado) Um Personal Access Token do GitHub. Necessário para aumentar o limite de taxa de requisições à API do GitHub e acessar repositórios privados (se aplicável, embora o Omnizap seja público). Não são necessárias permissões especiais no token para repositórios públicos.
        **Importante:** Nunca comite seu token diretamente no código. Utilize o arquivo `.env`.
    *   `GITHUB_REPO_OWNER`: O nome do proprietário do repositório no GitHub (padrão: "Kaikygr").
    *   `GITHUB_REPO_NAME`: O nome do repositório no GitHub (padrão: "omnizap").
    *   `ALLOWED_ORIGINS`: (Opcional) Lista de origens permitidas para CORS, separadas por vírgula. Atualmente, o CORS não está explicitamente configurado para todos os endpoints no `server.js`, mas é uma boa prática para futuras expansões.

## Como Executar Localmente

1.  Certifique-se de ter seguido os passos de Configuração.
2.  Inicie o servidor:
    *   Para desenvolvimento (com reinício automático usando Nodemon):
        ```bash
        npm run dev
        ```
    *   Para produção:
        ```bash
        npm start
        ```
3.  Abra seu navegador e acesse `http://localhost:PORT` (substitua `PORT` pelo valor definido no seu `.env` ou 3000 por padrão).

## Scripts NPM

*   `npm start`: Inicia o servidor em modo de produção usando `node server.js`.
*   `npm run dev`: Inicia o servidor em modo de desenvolvimento usando `nodemon server.js`, que reinicia automaticamente o servidor após alterações nos arquivos.
*   `npm run lint`: Executa o ESLint para verificar a qualidade do código JavaScript.
*   `npm run format`: Formata o código usando Prettier.
*   `npm run build:css`: Compila o arquivo `public/styles.css` usando Tailwind CSS e o salva em `public/dist/styles.css`. (Nota: O `index.html` atual usa Tailwind via CDN e `public/styles.css` para estilos customizados. Este script seria útil se você quisesse gerar um arquivo CSS estático a partir de classes Tailwind usadas no HTML/JS).
*   `npm run watch:css`: Similar ao `build:css`, mas observa alterações nos arquivos e recompila automaticamente.

## Mecanismo de Cache

O site utiliza duas estratégias de cache para melhorar o desempenho e reduzir a carga na API do GitHub:

### Cache do Lado do Cliente (Frontend)

*   Implementado em `public/main.js`.
*   Armazena as respostas das requisições à API do backend (`/api/github-data` e `/api/visits/count`) na memória do navegador.
*   Por padrão, os dados em cache expiram após 5 minutos (`CACHE_DURATION`).
*   Isso evita que o navegador do usuário faça requisições repetidas ao backend para os mesmos dados em um curto período.

### Cache do Lado do Servidor (Backend)

*   Implementado em `server.js`.
*   Armazena os dados buscados da API do GitHub em um arquivo local: `database/github-cache.json`.
*   O cache é atualizado automaticamente em intervalos definidos (padrão: 1 hora - `CACHE_UPDATE_INTERVAL_MS`).
*   Quando o endpoint `/api/github-data` é acessado, ele serve os dados do cache se ainda forem válidos. Se o cache estiver desatualizado ou não existir, uma nova busca à API do GitHub é iniciada (de forma não bloqueante para a requisição atual, que pode receber dados mais antigos ou um aviso).
*   Isso reduz significativamente o número de chamadas diretas à API do GitHub, ajudando a evitar limites de taxa e acelerando as respostas para os clientes.

## Rastreamento de Visitas

*   O servidor (`server.js`) intercepta requisições `GET` para a rota raiz (`/`).
*   Para cada visita à página inicial, as seguintes informações são registradas:
    *   Timestamp da visita.
    *   Endereço IP do visitante (ou o mais próximo que o Express pode fornecer).
    *   Detalhes do User-Agent (navegador, versão, sistema operacional, plataforma, se é mobile, desktop ou bot).
*   Os dados de visita, incluindo um contador total (`totalVisits`) e um array com os detalhes de cada visita (`visits`), são armazenados no arquivo `database/visits.json`.
*   O endpoint `/api/visits/count` retorna o número total de visitas.

## API Endpoints

O servidor expõe os seguintes endpoints:

*   `GET /`: Serve a página principal `index.html`.
*   `GET /api/github-data`: Retorna os dados cacheados do projeto Omnizap do GitHub. Inclui detalhes do repositório, commits, issues, linguagens, informações de licença e contagem de linhas de código.
*   `GET /api/visits/count`: Retorna o número total de visitas registradas no site.
*   Arquivos estáticos em `/public` (como `main.js`, `styles.css`) são servidos automaticamente.

## Autor

*   **Kaikygr** (GitHub Profile)

## Licença

Este projeto é distribuído sob a Licença MIT. Veja o arquivo `LICENSE` (se existir no repositório) para mais detalhes, ou consulte o `package.json`.
