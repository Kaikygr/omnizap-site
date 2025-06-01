const express = require("express");
const fs = require("fs");
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const GITHUB_API_BASE_URL = "https://api.github.com";
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || "Kaikygr";
const REPO_NAME = process.env.GITHUB_REPO_NAME || "omnizap";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CACHE_UPDATE_INTERVAL_MS =
  (parseInt(process.env.CACHE_UPDATE_INTERVAL_MIN) || 5) * 60 * 1000;

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
  morgan("combined", {
    stream: {
      write: (message) => console.log(message.trim()),
    },
  })
);

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

async function updateGitHubDataCache() {
  if (githubDataCache.isFetching) {
    console.log("Atualização do cache do GitHub já em progresso. Pulando.");
    return;
  }
  githubDataCache.isFetching = true;
  console.log("Tentando atualizar o cache de dados do GitHub...");

  try {
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

    const [repoDetails, commits, issues, languages, license] =
      await Promise.all([
        repoDetailsPromise,
        commitsPromise,
        issuesPromise,
        languagesPromise,
        licensePromise,
      ]);

    let locCount = 0;
    if (languages && Object.keys(languages).length > 0) {
      const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
      const APPROX_BYTES_PER_LINE_OF_CODE = 30;
      locCount = Math.round(totalBytes / APPROX_BYTES_PER_LINE_OF_CODE);
    }

    githubDataCache.data = {
      repoDetails,
      commits,
      issues,
      languages,
      licenseInfo: license.license || license,
      locCount,
    };
    githubDataCache.lastUpdated = new Date().toISOString();
    githubDataCache.error = null;
    console.log("Cache de dados do GitHub atualizado com sucesso.");
  } catch (error) {
    console.error(
      "Erro ao atualizar o cache de dados do GitHub:",
      error.message,
      error.stack
    );
    githubDataCache.error = error.message;
  } finally {
    githubDataCache.isFetching = false;
  }
}

app.get("/", (req, res) => {
  const filePath = path.join(PUBLIC_DIR, "index.html");
  fs.readFile(filePath, "utf8", (err, content) => {
    if (err) {
      console.log(`Erro ao ler index.html: ${err.message}`, {
        stack: err.stack,
      });
      res.status(500).send("Erro interno do servidor.");
    } else {
      res.status(200).type("text/html").send(content);
    }
  });
});

app.get("/api/github-data", (req, res) => {
  if (githubDataCache.data) {
    res.json({
      ...githubDataCache.data,
      serverLastUpdated: githubDataCache.lastUpdated,
      serverError: githubDataCache.error,
    });
  } else if (githubDataCache.error) {
    res.status(500).json({
      error: "Falha ao buscar dados do GitHub no servidor.",
      details: githubDataCache.error,
      serverLastUpdated: githubDataCache.lastUpdated,
    });
  } else {
    res.status(503).json({
      error:
        "Os dados do GitHub estão sendo buscados. Por favor, tente novamente em breve.",
      serverLastUpdated: githubDataCache.lastUpdated,
    });
  }
});

app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  updateGitHubDataCache();
  setInterval(updateGitHubDataCache, CACHE_UPDATE_INTERVAL_MS);
});
