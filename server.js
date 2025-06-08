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

async function ensureDatabaseDir() {
  const dir = path.dirname(VISITS_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readVisits() {
  try {
    await ensureDatabaseDir();
    try {
      const data = await fs.readFile(VISITS_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        const initialData = { totalVisits: 0, visits: [] };
        await fs.writeFile(
          VISITS_FILE,
          JSON.stringify(initialData, null, 2),
          "utf8"
        );
        return initialData;
      }
      throw error;
    }
  } catch (error) {
    console.error("Erro ao ler arquivo de visitas:", error);
    return { totalVisits: 0, visits: [] };
  }
}

async function saveVisits(visitsData) {
  try {
    await ensureDatabaseDir();
    await fs.writeFile(
      VISITS_FILE,
      JSON.stringify(visitsData, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Erro ao salvar visitas:", error);
  }
}

app.use(async (req, res, next) => {
  if (req.path === "/" && req.method === "GET") {
    try {
      const visitsData = await readVisits();
      const visitInfo = {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: {
          browser: req.useragent.browser,
          version: req.useragent.version,
          os: req.useragent.os,
          platform: req.useragent.platform,
          source: req.useragent.source,
          isMobile: req.useragent.isMobile,
          isDesktop: req.useragent.isDesktop,
          isBot: req.useragent.isBot,
        },
      };

      visitsData.totalVisits = (visitsData.totalVisits || 0) + 1;
      visitsData.visits = visitsData.visits || [];
      visitsData.visits.push(visitInfo);

      saveVisits(visitsData).catch(console.error);
    } catch (error) {
      console.error("Erro ao processar visita:", error);
    }
  }
  next();
});

// Endpoint para dados do GitHub
app.get("/api/server-data", async (req, res) => {
  try {
    const githubData = await readJsonFile(GITHUB_CACHE_FILE);

    if (!githubData.data) {
      return res.json({
        success: false,
        error: "Dados do GitHub não encontrados",
      });
    }

    res.json({
      success: true,
      data: githubData.data,
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

// Endpoint para registrar visita
app.post("/api/visits", async (req, res) => {
  try {
    const { userAgent, referrer, url } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const visit = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ip: ip,
      userAgent: userAgent,
      referrer: referrer || "",
      url: url || "",
      device: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      os: getOS(userAgent),
    };

    const visitsData = await readJsonFile(VISITS_FILE, { visits: [] });
    visitsData.visits.push(visit);

    // Manter apenas os últimos 1000 registros
    if (visitsData.visits.length > 1000) {
      visitsData.visits = visitsData.visits.slice(-1000);
    }

    await writeJsonFile(VISITS_FILE, visitsData);

    res.json({
      success: true,
      message: "Visita registrada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao registrar visita:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao registrar visita",
    });
  }
});

// Endpoint para estatísticas de visitas
app.get("/api/visits/stats", async (req, res) => {
  try {
    const statsProcessor = new VisitStatsProcessor(VISITS_FILE);
    const stats = await statsProcessor.processAllStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Erro ao calcular estatísticas:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao calcular estatísticas",
    });
  }
});

// Endpoint para obter todas as visitas (admin)
app.get("/api/visits/all", async (req, res) => {
  try {
    const visitsData = await readJsonFile(VISITS_FILE, { visits: [] });

    res.json({
      success: true,
      data: visitsData.visits || [],
    });
  } catch (error) {
    console.error("Erro ao carregar visitas:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar visitas",
    });
  }
});

// Servir página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function readJsonFile(filePath, defaultValue = {}) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log(`Arquivo ${filePath} não encontrado, criando...`);
    await writeJsonFile(filePath, defaultValue);
    return defaultValue;
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Erro ao escrever arquivo ${filePath}:`, error);
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

    // Esta função pode ser expandida futuramente para buscar dados do GitHub
    // Por enquanto, apenas cria um cache vazio se não existir
    const cacheData = {
      lastUpdated: new Date().toISOString(),
      repoData: {},
      // Adicionar mais dados conforme necessário
    };

    await writeJsonFile(GITHUB_CACHE_FILE, cacheData);
    console.log("Cache do GitHub atualizado com sucesso");
  } catch (error) {
    console.error("Erro ao atualizar cache do GitHub:", error);
  }
}

async function startServer() {
  try {
    server = app.listen(PORT, async () => {
      console.log(
        `[Instância ${INSTANCE_ID}] Servidor rodando em http://localhost:${PORT}`
      );
      console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
      console.log(`PID: ${process.pid}`);
      await updateGitHubDataCache();
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
