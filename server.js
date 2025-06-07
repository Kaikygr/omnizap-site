const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = "morgan";
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

app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use(
  require("morgan")("combined", {
    // Corrigido o require do morgan
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

async function fetchGitHubAPI(endpoint) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }
  const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
    headers,
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
  return response.json();
}

// Nova função para buscar e raspar uma página HTML
async function fetchAndScrapePage(urlPath, parserFunction) {
  const url = `${GITHUB_BASE_URL}${urlPath}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    return parserFunction($);
  } catch (error) {
    console.error(`Erro ao raspar ${url}:`, error);
    throw error;
  }
}

// Parser para a página de Releases
function parseReleasesPage($) {
  const releases = [];
  // Seletor para cada item de release. Este seletor é um exemplo e PODE MUDAR.
  // Inspecione a página de releases do GitHub para encontrar os seletores corretos.
  $("div.repository-content div.Box > div.Box-row").each((i, el) => {
    const $el = $(el);
    const nameAndTag = $el.find("h2 a").first().text().trim(); // Pode conter nome e tag
    const html_url = GITHUB_BASE_URL + $el.find("h2 a").first().attr("href");
    const published_at_text = $el.find("relative-time").attr("datetime");
    const body_html = $el.find(".markdown-body").html(); // Pega o HTML do corpo

    // Tenta extrair nome e tag separadamente se possível, ou usa o combinado
    let name = nameAndTag;
    let tag_name = nameAndTag; // Fallback

    // Exemplo de como poderia ser se o nome e a tag estivessem em elementos diferentes ou com estrutura previsível
    // const name = $el.find('.release-title').text().trim();
    // const tag_name = $el.find('.release-tag-name').text().trim();

    if (nameAndTag && html_url && published_at_text) {
      releases.push({
        name: name,
        tag_name: tag_name,
        html_url: html_url,
        published_at: published_at_text, // A data já está em formato ISO
        body: body_html
          ? body_html.trim().split("\n")[0].substring(0, 200) + "..."
          : "Sem descrição.", // Pega o HTML e trunca
      });
    }
  });
  return releases.slice(0, 5); // Retorna as 5 mais recentes (a ordem na página geralmente é da mais nova para mais antiga)
}

// Parser para a página de Forks
function parseForksPage($) {
  const forks = [];
  // Seletor para cada item de fork. Este seletor é um exemplo e PODE MUDAR.
  // Inspecione a página de forks do GitHub (ex: /Kaikygr/omnizap/forks)
  $("div[data-testid='list-view-item-container']").each((i, el) => {
    const $el = $(el);
    const full_name_anchor = $el.find("a[data-hovercard-type='repository']");
    const full_name = full_name_anchor.text().trim().replace(/\s+/g, ""); // Remove espaços
    const html_url = GITHUB_BASE_URL + full_name_anchor.attr("href");

    if (full_name && html_url) {
      forks.push({
        full_name: full_name,
        html_url: html_url,
        // Outros dados como 'stargazers_count' são mais difíceis de pegar consistentemente via scraping aqui
      });
    }
  });
  return forks.slice(0, 5); // Retorna os 5 primeiros listados
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
    const repoDetailsPromise = fetchGitHubAPI(
      `/repos/${REPO_OWNER}/${REPO_NAME}`
    );
    const commitsPromise = fetchGitHubAPI(
      `/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=5`
    );
    const issuesPromise = fetchGitHubAPI(
      `/repos/${REPO_OWNER}/${REPO_NAME}/issues?per_page=5&state=all`
    );
    const languagesPromise = fetchGitHubAPI(
      `/repos/${REPO_OWNER}/${REPO_NAME}/languages`
    );
    const licensePromise = fetchGitHubAPI(
      `/repos/${REPO_OWNER}/${REPO_NAME}/license`
    ).catch((err) => {
      if (err.message && err.message.includes("404"))
        return { name: "Não especificada" };
      throw err;
    });
    const codeFrequencyPromise = fetchGitHubAPI(
      // Mantido via API, scraping do gráfico não é viável
      `/repos/${REPO_OWNER}/${REPO_NAME}/stats/code_frequency`
    );

    // Dados via Scraping
    const releasesPromise = fetchAndScrapePage(
      `/${REPO_OWNER}/${REPO_NAME}/releases`,
      parseReleasesPage
    );
    const forksListPromise = fetchAndScrapePage(
      `/${REPO_OWNER}/${REPO_NAME}/forks`,
      parseForksPage
    );

    const [repoDetails, commits, issues, languages, license] =
      await Promise.all([
        repoDetailsPromise,
        commitsPromise,
        issuesPromise,
        languagesPromise,
        licensePromise,
      ]);

    let codeFrequency = [];
    try {
      codeFrequency = await codeFrequencyPromise;
    } catch (e) {
      console.warn("Falha ao buscar frequência de código (API):", e.message);
    }

    let releases = [];
    let forksList = [];

    try {
      releases = await releasesPromise;
    } catch (e) {
      console.warn("Falha ao raspar releases:", e.message);
    }
    try {
      forksList = await forksListPromise;
    } catch (e) {
      console.warn("Falha ao raspar lista de forks:", e.message);
    }

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
        releases, // Agora vem do scraping
        codeFrequency, // Continua da API
        forksList, // Agora vem do scraping
        // dependencies: [], // Placeholder: Scraping de dependências da página de grafos é impraticável.
        // Seria necessário parsear manifestos ou usar API específica.
      },
      error: null,
    };

    await saveGithubCache(cacheData);
    githubDataCache.data = cacheData.data;
    githubDataCache.lastUpdated = cacheData.lastUpdated;
    githubDataCache.error = null;

    console.log("Cache do GitHub atualizado com sucesso (API e Scraping).");
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

app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  await updateGitHubDataCache();
  setInterval(updateGitHubDataCache, CACHE_UPDATE_INTERVAL_MS);
});
