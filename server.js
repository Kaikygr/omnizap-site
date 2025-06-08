const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const useragent = require("express-useragent");
require("dotenv").config();

const VisitStatsProcessor = require("./lib/visitStats");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const VISITS_FILE = path.join(__dirname, "database", "visits.json");
const INSTANCE_ID =
  process.env.INSTANCE_ID || process.env.NODE_APP_INSTANCE || 0;

const GITHUB_API_BASE_URL = "https://api.github.com";
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || "Kaikygr";
const REPO_NAME = process.env.GITHUB_REPO_NAME || "omnizap";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_CACHE_FILE = path.join(__dirname, "database", "github-cache.json");
const CACHE_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

let githubDataCache = {
  data: null,
  lastUpdated: null,
  isFetching: false,
  error: null,
};

const app = express();

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  morgan("combined", {
    stream: { write: (message) => console.log(message.trim()) },
  })
);

app.use(useragent.express());
app.use(express.json());
app.use(express.static("public"));

// Configurar CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Paths dos arquivos
const VISITS_DIR = path.join(__dirname, "database");

// Função para garantir que o diretório existe
async function ensureDirectoryExists() {
  try {
    await fs.access(VISITS_DIR);
  } catch {
    await fs.mkdir(VISITS_DIR, { recursive: true });
  }
}

// Função para gerar ID único
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Função para detectar informações do User Agent (melhorada)
function parseUserAgent(userAgentString) {
  const ua = userAgentString || "";

  // Detectar browser
  let browser = "Desconhecido";
  if (ua.includes("Chrome") && !ua.includes("Edge")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Opera")) browser = "Opera";

  // Detectar OS
  let os = "Desconhecido";
  if (ua.includes("Windows NT")) os = "Windows";
  else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Detectar tipo de dispositivo
  let device = "desktop";
  let isMobile = false;
  let isDesktop = false;
  let isTablet = false;
  let isBot = false;

  // Detectar bots
  if (
    ua.toLowerCase().includes("bot") ||
    ua.toLowerCase().includes("crawler") ||
    ua.toLowerCase().includes("spider")
  ) {
    device = "bot";
    isBot = true;
  }
  // Detectar mobile
  else if (
    ua.includes("Mobile") ||
    ua.includes("iPhone") ||
    ua.includes("Android")
  ) {
    device = "mobile";
    isMobile = true;
  }
  // Detectar tablet
  else if (ua.includes("Tablet") || ua.includes("iPad")) {
    device = "tablet";
    isTablet = true;
  }
  // Desktop por padrão
  else {
    device = "desktop";
    isDesktop = true;
  }

  return {
    browser,
    os,
    device,
    isMobile,
    isDesktop,
    isTablet,
    isBot,
    platform: os, // Para compatibilidade
  };
}

// Endpoint para registrar visita
app.post("/api/visit", async (req, res) => {
  try {
    await ensureDirectoryExists();

    const userAgentData = parseUserAgent(req.headers["user-agent"]);

    const visitData = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ip:
        req.ip ||
        req.connection.remoteAddress ||
        req.headers["x-forwarded-for"]?.split(",")[0],
      userAgent: userAgentData, // Armazenar objeto completo
      userAgentString: req.headers["user-agent"], // String original para referência
      referrer: req.headers.referer || req.body.referrer || "",
      url: req.body.url || req.headers.referer || "",
      browser: userAgentData.browser,
      os: userAgentData.os,
      device: userAgentData.device,
    };

    // Carregar dados existentes
    let visitsData = { totalVisits: 0, visits: [] };
    try {
      const data = await fs.readFile(VISITS_FILE, "utf8");
      visitsData = JSON.parse(data);
    } catch (error) {
      console.log("Arquivo de visitas não existe, criando novo...");
    }

    // Adicionar nova visita
    visitsData.visits.push(visitData);
    visitsData.totalVisits = visitsData.visits.length;

    // Salvar dados atualizados
    await fs.writeFile(VISITS_FILE, JSON.stringify(visitsData, null, 2));

    res.json({ success: true, visitId: visitData.id });
    console.log(`Nova visita registrada: ${visitData.id} de ${visitData.ip}`);
  } catch (error) {
    console.error("Erro ao registrar visita:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para dados do GitHub
app.get("/api/server-data", async (req, res) => {
  try {
    const githubData = await readJsonFile(GITHUB_CACHE_FILE);

    if (!githubData.repoData) {
      console.log("API do GitHub indisponível, retornando dados de fallback.");
      return res.json({
        success: true,
        data: {
          stars: 0,
          forks: 0,
          issues: 0,
        },
        lastUpdated: new Date().toISOString(),
      });
    }

    // Transformar os dados do cache no formato esperado pelo frontend
    const transformedData = {
      repoDetails: githubData.repoData,
      commits: githubData.commits || [],
      issues: githubData.issues || [],
      languages: githubData.languages || {},
      licenseInfo: githubData.repoData.license,
      locCount: githubData.locCount || 3277,
    };

    res.json({
      success: true,
      data: transformedData,
      lastUpdated: githubData.lastUpdated,
    });
  } catch (error) {
    console.error("Erro ao carregar dados do GitHub:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// Endpoint para estatísticas de visitas
app.get("/api/visit-stats", async (req, res) => {
  try {
    await ensureDirectoryExists();

    const processor = new VisitStatsProcessor(VISITS_FILE);
    const stats = await processor.processAllStats();

    res.json(stats);
    console.log("Estatísticas de visitas enviadas");
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res.status(500).json({ error: "Erro ao processar estatísticas" });
  }
});

// Rota para obter dados brutos de visitas (para debug)
app.get("/api/visits/raw", async (req, res) => {
  try {
    const data = await fs.readFile(VISITS_FILE, "utf8");
    const visitsData = JSON.parse(data);
    res.json(visitsData);
  } catch (error) {
    console.error("Erro ao obter dados brutos:", error);
    res.status(500).json({ error: "Erro ao carregar dados" });
  }
});

// Servir página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/visit-stats.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "visit-stats.html"));
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// Middleware para tratamento de erros
app.use((error, req, res, next) => {
  console.error("Erro do servidor:", error);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// Funções auxiliares para manipulação de arquivos JSON
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log(
      `Arquivo ${filePath} não encontrado ou inválido, retornando objeto vazio`
    );
    return {};
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await ensureDirectoryExists();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error(`Erro ao escrever arquivo ${filePath}:`, error);
    throw error;
  }
}

// Funções de visitas
function getDeviceType(userAgent) {
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return "Mobile";
  if (/Tablet/.test(userAgent)) return "Tablet";
  return "Desktop";
}

function getBrowser(userAgent) {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Outro";
}

function getOS(userAgent) {
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iOS")) return "iOS";
  return "Outro";
}

let server;
let updateInterval;

// Função para atualizar cache do GitHub
async function updateGitHubDataCache() {
  try {
    console.log("Atualizando cache do GitHub...");
    const fallbackData = {
      lastUpdated: new Date().toISOString(),
      repoData: {
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        name: "omnizap",
        description: "Bot de WhatsApp open-source",
        language: "JavaScript",
      },
      commits: [],
      issues: [],
      languages: { JavaScript: 91410 },
      locCount: 3277,
    };

    // Buscar dados do GitHub
    const cacheData = await fetchGitHubData().catch((error) => {
      console.error("Erro ao buscar dados do GitHub, usando fallback:", error);
      return fallbackData;
    });

    // Salvar cache
    await writeJsonFile(GITHUB_CACHE_FILE, cacheData);
    console.log(`Cache do GitHub salvo com sucesso em ${GITHUB_CACHE_FILE}`);

    return cacheData;
  } catch (error) {
    console.error("Erro ao atualizar cache do GitHub:", error);
    throw error;
  }
}

// Função para buscar dados do GitHub
async function fetchGitHubData() {
  const repoUrl = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}`;
  const commitsUrl = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=5`;
  const issuesUrl = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&per_page=5`;
  const languagesUrl = `${GITHUB_API_BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/languages`;

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "User-Agent": "omnizap-site",
  };

  try {
    console.log(`Buscando dados do GitHub na URL: ${repoUrl}`);

    // Buscar dados do repositório
    const repoResponse = await fetch(repoUrl, { headers });
    if (!repoResponse.ok) {
      throw new Error(`Erro na API do GitHub: ${repoResponse.statusText}`);
    }
    const repoData = await repoResponse.json();

    // Buscar commits (opcional - se falhar, continua sem)
    let commits = [];
    try {
      const commitsResponse = await fetch(commitsUrl, { headers });
      if (commitsResponse.ok) {
        commits = await commitsResponse.json();
      }
    } catch (error) {
      console.warn("Não foi possível buscar commits:", error.message);
    }

    // Buscar issues (opcional - se falhar, continua sem)
    let issues = [];
    try {
      const issuesResponse = await fetch(issuesUrl, { headers });
      if (issuesResponse.ok) {
        issues = await issuesResponse.json();
      }
    } catch (error) {
      console.warn("Não foi possível buscar issues:", error.message);
    }

    // Buscar linguagens (opcional - se falhar, continua sem)
    let languages = {};
    try {
      const languagesResponse = await fetch(languagesUrl, { headers });
      if (languagesResponse.ok) {
        languages = await languagesResponse.json();
      }
    } catch (error) {
      console.warn("Não foi possível buscar linguagens:", error.message);
    }

    console.log("Dados do GitHub obtidos com sucesso");

    return {
      lastUpdated: new Date().toISOString(),
      repoData: repoData,
      commits: commits,
      issues: issues,
      languages: languages,
      locCount: 3277, // Pode ser calculado dinamicamente se necessário
    };
  } catch (error) {
    console.error("Erro ao buscar dados do GitHub:", error.message);
    throw error;
  }
}

async function startServer() {
  try {
    // Atualizar o cache do GitHub antes de iniciar o servidor
    console.log("Inicializando cache do GitHub...");
    const githubData = await updateGitHubDataCache();

    server = app.listen(PORT, () => {
      console.log(
        `[Instância ${INSTANCE_ID}] Servidor rodando em http://localhost:${PORT}`
      );
      console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
      console.log(`PID: ${process.pid}`);
      // Configurar apenas o intervalo de atualização após o servidor iniciar
      updateInterval = setInterval(
        updateGitHubDataCache,
        CACHE_UPDATE_INTERVAL_MS
      );
    });

    const shutdown = async (signal) => {
      console.log(
        `\n[Instância ${INSTANCE_ID}] Recebido sinal ${signal}. Iniciando shutdown graceful...`
      );

      if (updateInterval) {
        clearInterval(updateInterval);
        console.log("Interval de atualização cancelado.");
      }

      if (server) {
        server.close(() => {
          console.log("Servidor HTTP fechado.");
          process.exit(0);
        });

        setTimeout(() => {
          console.log("Forçando fechamento do servidor...");
          process.exit(1);
        }, 10000);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGUSR2", () => shutdown("SIGUSR2"));
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();
