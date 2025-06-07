const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const useragent = require("express-useragent");
const cheerio = require("cheerio"); // Adicionado Cheerio
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const VISITS_FILE = path.join(__dirname, "database", "visits.json");

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_BASE_URL = "https://github.com"; // Para scraping
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || "Kaikygr";
const REPO_NAME = process.env.GITHUB_REPO_NAME || "omnizap";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_CACHE_FILE = path.join(__dirname, "database", "github-cache.json");
const CACHE_UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

let githubDataCache = {
  data: null,
  lastUpdated: null,
  isFetching: false,
  error: null,
};

const app = express();

// Middlewares de segurança
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use(
  morgan("combined", {
    stream: {
      write: (message) => console.log(message.trim()),
    },
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
    next();
  } else {
    next();
  }
});

app.get("/api/visits/count", async (req, res) => {
  try {
    const visitsData = await readVisits();
    res.json({ totalVisits: visitsData.totalVisits || 0 });
  } catch (error) {
    console.error("Erro ao obter contagem de visitas:", error);
    res.status(500).json({
      error: "Erro ao obter contagem de visitas",
      totalVisits: 0,
    });
  }
});

// Endpoint de saúde do servidor
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
      timeout: 10000, // 10 segundos de timeout
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

// Função melhorada para buscar e raspar uma página HTML
async function fetchAndScrapePage(urlPath, parserFunction) {
  const url = `${GITHUB_BASE_URL}${urlPath}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "omnizap-site/1.0.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000, // 15 segundos de timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    return parserFunction($);
  } catch (error) {
    console.error(`Erro ao raspar ${url}:`, error.message);
    throw error;
  }
}

// Parser melhorado para a página de Releases
function parseReleasesPage($) {
  const releases = [];

  // Tenta múltiplos seletores para compatibilidade
  const selectors = [
    "div.repository-content div.Box > div.Box-row",
    "[data-testid='release-card']",
    ".release-entry",
  ];

  let releaseElements = $();
  for (const selector of selectors) {
    releaseElements = $(selector);
    if (releaseElements.length > 0) break;
  }

  releaseElements.each((i, el) => {
    try {
      const $el = $(el);
      const nameAndTag = $el
        .find("h2 a, .release-header a, .f1 a")
        .first()
        .text()
        .trim();
      const href = $el
        .find("h2 a, .release-header a, .f1 a")
        .first()
        .attr("href");
      const html_url = href ? GITHUB_BASE_URL + href : null;
      const published_at_text = $el
        .find("relative-time, .datetime")
        .attr("datetime");
      const body_html = $el.find(".markdown-body, .release-body").html();

      if (nameAndTag && html_url && published_at_text) {
        let name = nameAndTag;
        let tag_name = nameAndTag;

        // Tenta extrair tag se há um padrão reconhecível
        const tagMatch = nameAndTag.match(/^(.*?)\s*(v?\d+\.\d+\.\d+.*)$/);
        if (tagMatch) {
          name = tagMatch[1].trim() || nameAndTag;
          tag_name = tagMatch[2].trim();
        }

        releases.push({
          name: name,
          tag_name: tag_name,
          html_url: html_url,
          published_at: published_at_text,
          body: body_html
            ? body_html
                .trim()
                .replace(/<[^>]*>/g, "")
                .substring(0, 200) + "..."
            : "Sem descrição.",
        });
      }
    } catch (error) {
      console.warn("Erro ao processar release:", error.message);
    }
  });

  return releases.slice(0, 5);
}

// Parser melhorado para a página de Forks
function parseForksPage($) {
  const forks = [];

  // Tenta múltiplos seletores para compatibilidade
  const selectors = [
    "div[data-testid='list-view-item-container']",
    ".fork-entry",
    ".Box-row",
  ];

  let forkElements = $();
  for (const selector of selectors) {
    forkElements = $(selector);
    if (forkElements.length > 0) break;
  }

  forkElements.each((i, el) => {
    try {
      const $el = $(el);
      const full_name_anchor = $el
        .find("a[data-hovercard-type='repository'], .f4 a, h3 a")
        .first();
      const full_name = full_name_anchor.text().trim().replace(/\s+/g, "");
      const href = full_name_anchor.attr("href");
      const html_url = href ? GITHUB_BASE_URL + href : null;

      // Tenta extrair informações adicionais se disponíveis
      const description = $el.find(".f6, .text-gray").first().text().trim();
      const starCount = $el
        .find("[data-testid='star-count'], .octicon-star")
        .parent()
        .text()
        .trim();

      if (full_name && html_url) {
        const forkData = {
          full_name: full_name,
          html_url: html_url,
        };

        if (description) forkData.description = description;
        if (starCount) forkData.stargazers_count = parseInt(starCount) || 0;

        forks.push(forkData);
      }
    } catch (error) {
      console.warn("Erro ao processar fork:", error.message);
    }
  });

  return forks.slice(0, 5);
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
  console.log("Buscando dados atualizados do GitHub (API e Scraping)...");

  try {
    // Dados que continuarão vindo da API por confiabilidade e disponibilidade
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

    // Busca de dados via API com tratamento de erro individual
    let codeFrequency = [];
    // Removido: coleta de dados de frequência de código não é mais necessária
    // para evitar seções vazias na interface

    // Dados via Scraping com retry logic - REMOVIDOS
    // Removido: scraping de releases e forks não é mais necessário
    let releases = [];
    let forksList = [];

    // Calcula LOC de forma mais precisa
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
        // Removidas seções que causavam mensagens de "sem dados":
        // releases, codeFrequency, forksList
        updateStats: {
          apiCallsSuccessful: true,
          scrapingSuccessful: {
            releases: false, // Removido intencionalmente
            forks: false, // Removido intencionalmente
          },
        },
      },
      error: null,
    };

    await saveGithubCache(cacheData);
    githubDataCache.data = cacheData.data;
    githubDataCache.lastUpdated = cacheData.lastUpdated;
    githubDataCache.error = null;

    console.log("Cache do GitHub atualizado com sucesso (API otimizada).");
    console.log(
      "- Seções de releases, frequência de código e forks foram removidas para melhor UX."
    );
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

// Função de inicialização do servidor
async function startServer() {
  try {
    server = app.listen(PORT, async () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
      await updateGitHubDataCache();
      updateInterval = setInterval(
        updateGitHubDataCache,
        CACHE_UPDATE_INTERVAL_MS
      );
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\nRecebido sinal ${signal}. Iniciando shutdown graceful...`);

      if (updateInterval) {
        clearInterval(updateInterval);
        console.log("Interval de atualização cancelado.");
      }

      if (server) {
        server.close(() => {
          console.log("Servidor HTTP fechado.");
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.log("Forçando fechamento do servidor...");
          process.exit(1);
        }, 10000);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

// Inicializa o servidor
startServer();
