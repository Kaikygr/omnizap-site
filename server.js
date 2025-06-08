const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const useragent = require("express-useragent");
require("dotenv").config();

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

app.get("/api/visits/count", async (req, res) => {
  try {
    const visitsData = await readVisits();
    res.json({ totalVisits: visitsData.totalVisits || 0 });
  } catch (error) {
    console.error("Erro ao obter contagem de visitas:", error);
    res
      .status(500)
      .json({ error: "Erro ao obter contagem de visitas", totalVisits: 0 });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    const cache = await readGithubCache();
    const visitsData = await readVisits();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cache: {
        lastUpdated: cache.lastUpdated,
        hasData: !!cache.data,
        hasError: !!cache.error,
      },
      visits: {
        total: visitsData.totalVisits || 0,
        hasData: !!visitsData.visits,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

async function fetchGitHubAPI(endpoint) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "omnizap-site/1.0.0",
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
      headers,
      timeout: 10000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `GitHub API Error for ${endpoint}: ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(
        `GitHub API Error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar ${endpoint}:`, error.message);
    throw error;
  }
}

async function readGithubCache() {
  try {
    const data = await fs.readFile(GITHUB_CACHE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { lastUpdated: null, data: null, error: null };
  }
}

async function saveGithubCache(cacheData) {
  try {
    await fs.writeFile(
      GITHUB_CACHE_FILE,
      JSON.stringify(cacheData, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Erro ao salvar cache do GitHub:", error);
  }
}

async function shouldUpdateCache() {
  const cache = await readGithubCache();
  if (!cache.lastUpdated) return true;

  const lastUpdate = new Date(cache.lastUpdated).getTime();
  const now = Date.now();
  return now - lastUpdate > CACHE_UPDATE_INTERVAL_MS;
}

async function updateGitHubDataCache() {
  if (githubDataCache.isFetching) {
    console.log("Atualização já em progresso. Pulando.");
    return;
  }

  if (!(await shouldUpdateCache())) {
    console.log("Cache ainda válido. Pulando atualização.");
    return;
  }

  githubDataCache.isFetching = true;
  console.log("Buscando dados atualizados do GitHub...");

  try {
    const apiPromises = [
      fetchGitHubAPI(`/repos/${REPO_OWNER}/${REPO_NAME}`),
      fetchGitHubAPI(`/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=5`),
      fetchGitHubAPI(
        `/repos/${REPO_OWNER}/${REPO_NAME}/issues?per_page=5&state=all`
      ),
      fetchGitHubAPI(`/repos/${REPO_OWNER}/${REPO_NAME}/languages`),
      fetchGitHubAPI(`/repos/${REPO_OWNER}/${REPO_NAME}/license`).catch(
        (err) => {
          if (err.message && err.message.includes("404"))
            return { name: "Não especificada" };
          throw err;
        }
      ),
    ];

    const [repoDetails, commits, issues, languages, license] =
      await Promise.all(apiPromises);

    let locCount = 0;
    if (languages && Object.keys(languages).length > 0) {
      const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
      const APPROX_BYTES_PER_LINE_OF_CODE = 30;
      locCount = Math.round(totalBytes / APPROX_BYTES_PER_LINE_OF_CODE);
    }

    const cacheData = {
      lastUpdated: new Date().toISOString(),
      data: {
        repoDetails,
        commits,
        issues,
        languages,
        licenseInfo: license.license || license,
        locCount,
      },
      error: null,
    };

    await saveGithubCache(cacheData);
    githubDataCache.data = cacheData.data;
    githubDataCache.lastUpdated = cacheData.lastUpdated;
    githubDataCache.error = null;

    console.log("Cache do GitHub atualizado com sucesso.");
  } catch (error) {
    console.error("Erro ao atualizar cache do GitHub:", error);
    githubDataCache.error = error.message;

    await saveGithubCache({
      lastUpdated: new Date().toISOString(),
      data: null,
      error: error.message,
    });
  } finally {
    githubDataCache.isFetching = false;
  }
}

app.get("/", async (req, res) => {
  try {
    const filePath = path.join(PUBLIC_DIR, "index.html");
    const content = await fs.readFile(filePath, "utf8");
    res.status(200).type("text/html").send(content);
  } catch (err) {
    console.error(`Erro ao ler index.html:`, err);
    res.status(500).send("Erro interno do servidor.");
  }
});

app.get("/api/github-data", async (req, res) => {
  try {
    const cache = await readGithubCache();

    if (cache.data) {
      res.json({
        ...cache.data,
        serverLastUpdated: cache.lastUpdated,
        serverError: cache.error,
      });
    } else if (cache.error) {
      res.status(500).json({
        error: "Falha ao buscar dados do GitHub",
        details: cache.error,
        serverLastUpdated: cache.lastUpdated,
      });
    } else {
      res.status(503).json({
        error: "Dados ainda não disponíveis",
        serverLastUpdated: null,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao ler cache do GitHub" });
  }
});

app.use(express.static(PUBLIC_DIR));

let server;
let updateInterval;

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
