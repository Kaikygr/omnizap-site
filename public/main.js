const CONFIG = {
  CACHE_DURATION: 5 * 60 * 1000,
  DATE_FORMAT: {
    dateStyle: "medium",
    timeStyle: "short",
  },
  API_ENDPOINTS: {
    GITHUB: "/api/github-data",
    VISITS: "/api/visits/count",
  },
};

const clientCache = {
  data: new Map(),
  set(key, value, duration = CONFIG.CACHE_DURATION) {
    const item = {
      value,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
    };
    this.data.set(key, item);
    return item;
  },
  get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }
    return item.value;
  },
  clear() {
    this.data.clear();
  },
};

async function fetchWithCache(url, options = {}) {
  const cacheKey = url;
  const cachedData = clientCache.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    clientCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Erro ao buscar ${url}:`, error);
    throw error;
  }
}

async function fetchServerData() {
  try {
    const data = await fetchWithCache(CONFIG.API_ENDPOINTS.GITHUB);
    if (data.serverError) {
      displayGlobalError(
        `Aviso: ${data.serverError}. Os dados podem estar desatualizados.`
      );
    }
    return data;
  } catch (error) {
    const message = `Falha ao comunicar com o servidor: ${error.message}`;
    displayGlobalError(message);
    throw error;
  }
}

const formatDate = (date) =>
  new Date(date).toLocaleString("pt-BR", CONFIG.DATE_FORMAT);
const formatNumber = (num) => num?.toLocaleString("pt-BR") || "0";

function updateUI(data) {
  const { repoDetails, commits, issues, languages, licenseInfo, locCount } =
    data;

  if (repoDetails) {
    const fallbackProjectName = "omnizap";
    setText("pageTitle", `Projeto: ${repoDetails.name || fallbackProjectName}`);
    setText("projectName", repoDetails.name);
    setText("projectOwner", repoDetails.owner?.login);
    setText("projectDescription", repoDetails.description);
    setText("projectLanguage", repoDetails.language);
    setText("stargazersCount", formatNumber(repoDetails.stargazers_count));
    setText("forksCount", formatNumber(repoDetails.forks_count));
    setText("watchersCount", formatNumber(repoDetails.subscribers_count));
    setText("repoSize", `${(repoDetails.size / 1024).toFixed(2)} MB`);
    setText("lastUpdated", formatDate(repoDetails.updated_at));
    setText("createdAt", formatDate(repoDetails.created_at));
    setText("pushedAt", formatDate(repoDetails.pushed_at));
    setText("openIssuesCount", formatNumber(repoDetails.open_issues_count));
    setLink("projectHtmlUrl", repoDetails.html_url);
  }

  const commitList = document.getElementById("commitList");
  commitList.innerHTML = "";
  if (commits && commits.length > 0) {
    commits.forEach((commit, index) => {
      const commitElement = createCommitElement(commit);
      commitElement.style.setProperty("--animation-delay", `${index * 0.05}s`);
      commitList.appendChild(commitElement);
    });
  } else {
    const noCommits = document.createElement("p");
    noCommits.className = "text-slate-600 dark:text-slate-400";
    noCommits.textContent = "Nenhum commit encontrado.";
    commitList.appendChild(noCommits);
  }

  const issuesList = document.getElementById("issuesList");
  issuesList.innerHTML = "";
  if (issues && issues.length > 0) {
    issues.forEach((issue, index) => {
      const issueElement = createIssueElement(issue);
      issueElement.style.setProperty("--animation-delay", `${index * 0.05}s`);
      issuesList.appendChild(issueElement);
    });
  } else {
    const noIssues = document.createElement("p");
    noIssues.className = "text-slate-600 dark:text-slate-400";
    noIssues.textContent = "Nenhuma issue encontrada.";
    issuesList.appendChild(noIssues);
  }

  const languagesChart = document.getElementById("languagesChart");
  languagesChart.innerHTML = "";
  if (languages && Object.keys(languages).length > 0) {
    const total = Object.values(languages).reduce((a, b) => a + b, 0);
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

    Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .forEach(([lang, bytes], index) => {
        if (total > 0) {
          const percentage = (bytes / total) * 100;
          const color = colors[index % colors.length];
          languagesChart.appendChild(
            createLanguageBar(lang, percentage, color)
          );
        }
      });
  } else {
    const noLanguages = document.createElement("p");
    noLanguages.className = "text-slate-600 dark:text-slate-400";
    noLanguages.textContent = "Dados de linguagens não disponíveis.";
    languagesChart.appendChild(noLanguages);
  }

  setText(
    "licenseInfo",
    licenseInfo?.license?.name || licenseInfo?.name || "Não especificada"
  );
  setText(
    "locCount",
    locCount > 0 ? locCount.toLocaleString("pt-BR") + " linhas" : "N/A"
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("currentYear").textContent = new Date().getFullYear();

  try {
    const [serverData, visitsData] = await Promise.all([
      fetchServerData(),
      fetchWithCache(CONFIG.API_ENDPOINTS.VISITS),
    ]);

    if (serverData) {
      updateUI(serverData);
    }

    if (visitsData) {
      setText("visitCount", formatNumber(visitsData.totalVisits));
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    displayGlobalError(
      "Ocorreu um erro ao carregar os dados. Tente recarregar a página."
    );
  }
});

document
  .getElementById("mobileMenuButton")
  .addEventListener("click", function () {
    const navMenu = document.getElementById("navMenu");
    const menuIcon = this.querySelector(".menu-icon");
    const closeIcon = this.querySelector(".close-icon");

    navMenu.classList.toggle("hidden");
    menuIcon.classList.toggle("hidden");
    closeIcon.classList.toggle("hidden");
  });

function displayGlobalError(message) {
  const errorDiv = document.getElementById("errorMessageGlobal");
  errorDiv.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm">${message}</p>
      </div>
    </div>`;
  errorDiv.classList.remove("hidden");
  errorDiv.classList.add(
    "bg-yellow-50",
    "dark:bg-yellow-900",
    "border",
    "border-yellow-400",
    "dark:border-yellow-700",
    "text-yellow-700",
    "dark:text-yellow-200",
    "px-4",
    "py-3",
    "rounded",
    "relative"
  );
}

function setText(elementId, text, defaultValue = "Não disponível") {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text || defaultValue;
    element.classList.remove("loading-placeholder");
  }
}

function setLink(elementId, url) {
  const element = document.getElementById(elementId);
  const navElement = document.getElementById(elementId + "Nav");
  if (element && url) {
    element.href = url;
    element.classList.remove("hidden");
    if (navElement) navElement.href = url;
  }
}

function createCommitElement(commit) {
  const div = document.createElement("div");
  div.className =
    "bg-slate-50 dark:bg-slate-700 p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200 list-item-animated"; // Added animation class

  const message = document.createElement("p");
  message.className = "font-medium text-slate-700 dark:text-slate-200";
  message.textContent = commit.commit.message.split("\n")[0];

  const details = document.createElement("div");
  details.className =
    "mt-2 text-sm text-slate-600 dark:text-slate-400 flex justify-between items-center";

  const author = document.createElement("span");
  author.textContent = `por ${commit.commit.author.name}`;

  const date = document.createElement("span");
  date.textContent = new Date(commit.commit.author.date).toLocaleDateString(
    "pt-BR"
  );

  details.appendChild(author);
  details.appendChild(date);
  div.appendChild(message);
  div.appendChild(details);

  return div;
}

function createIssueElement(issue) {
  const div = document.createElement("div");
  div.className =
    "bg-slate-50 dark:bg-slate-700 p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200 list-item-animated"; // Added animation class

  const title = document.createElement("a");
  title.href = issue.html_url;
  title.target = "_blank";
  title.className =
    "font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300";
  title.textContent = issue.title;

  const status = document.createElement("span");
  status.className = `ml-2 px-2 py-1 rounded-full text-xs ${
    issue.state === "open"
      ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100"
      : "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100"
  }`;
  status.textContent = issue.state;

  div.appendChild(title);
  div.appendChild(status);
  return div;
}

function createLanguageBar(language, percentage, color) {
  const div = document.createElement("div");
  div.className = "mb-2";

  const label = document.createElement("div");
  label.className = "flex justify-between text-sm mb-1";
  label.innerHTML = ` 
    <span class="text-slate-700 dark:text-slate-300">${language}</span>
    <span class="text-slate-600 dark:text-slate-400">${percentage.toFixed(
      1
    )}%</span>
  `;

  const barContainer = document.createElement("div");
  barContainer.className =
    "w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5";

  const bar = document.createElement("div");
  bar.className = "h-2.5 rounded-full transition-all duration-500";
  bar.style.width = `${percentage}%`;
  bar.style.backgroundColor = color || "#60A5FA";

  barContainer.appendChild(bar);
  div.appendChild(label);
  div.appendChild(barContainer);

  return div;
}

async function updateVisitCount() {
  try {
    const response = await fetch("/api/visits/count");
    const data = await response.json();
    const visitsElement = document.getElementById("visitCount");
    if (visitsElement) {
      visitsElement.textContent = data.totalVisits.toLocaleString("pt-BR");
    }
  } catch (error) {
    console.error("Erro ao buscar contagem de visitas:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  await updateVisitCount();

  try {
    const serverData = await fetchServerData();

    if (!serverData) {
      displayGlobalError(
        "Não foi possível carregar os dados do projeto do servidor."
      );
      document
        .querySelectorAll(".loading-placeholder")
        .forEach((el) => (el.textContent = "Erro ao carregar"));
      return;
    }

    const {
      repoDetails,
      commits,
      issues,
      languages,
      licenseInfo,
      locCount,
      serverLastUpdated,
    } = serverData;

    if (repoDetails) {
      const fallbackProjectName = "omnizap";
      setText(
        "pageTitle",
        `Projeto: ${repoDetails.name || fallbackProjectName}`
      );
      setText("projectName", repoDetails.name);
      setText("projectOwner", repoDetails.owner?.login);
      setText("projectDescription", repoDetails.description);
      setText("projectLanguage", repoDetails.language);
      setText("stargazersCount", repoDetails.stargazers_count?.toString());
      setText("forksCount", repoDetails.forks_count?.toString());
      setText("watchersCount", repoDetails.subscribers_count?.toString());
      setText("repoSize", `${(repoDetails.size / 1024).toFixed(2)} MB`);
      setText(
        "lastUpdated",
        new Date(repoDetails.updated_at).toLocaleString("pt-BR")
      );
      setText(
        "createdAt",
        new Date(repoDetails.created_at).toLocaleString("pt-BR")
      );
      setText(
        "pushedAt",
        new Date(repoDetails.pushed_at).toLocaleString("pt-BR")
      );
      setText("openIssuesCount", repoDetails.open_issues_count?.toString());
      setLink("projectHtmlUrl", repoDetails.html_url);
    }

    const commitList = document.getElementById("commitList");
    commitList.innerHTML = "";
    if (commits && commits.length > 0) {
      commits.forEach((commit, index) => {
        const commitElement = createCommitElement(commit);
        commitElement.style.setProperty(
          "--animation-delay",
          `${index * 0.05}s`
        );
        commitList.appendChild(commitElement);
      });
    } else {
      const noCommits = document.createElement("p");
      noCommits.className = "text-slate-600 dark:text-slate-400";
      noCommits.textContent = "Nenhum commit encontrado.";
      commitList.appendChild(noCommits);
    }

    const issuesList = document.getElementById("issuesList");
    issuesList.innerHTML = "";
    if (issues && issues.length > 0) {
      issues.forEach((issue, index) => {
        const issueElement = createIssueElement(issue);
        issueElement.style.setProperty("--animation-delay", `${index * 0.05}s`);
        issuesList.appendChild(issueElement);
      });
    } else {
      const noIssues = document.createElement("p");
      noIssues.className = "text-slate-600 dark:text-slate-400";
      noIssues.textContent = "Nenhuma issue encontrada.";
      issuesList.appendChild(noIssues);
    }

    const languagesChart = document.getElementById("languagesChart");
    languagesChart.innerHTML = "";
    if (languages && Object.keys(languages).length > 0) {
      const total = Object.values(languages).reduce((a, b) => a + b, 0);
      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

      Object.entries(languages)
        .sort(([, a], [, b]) => b - a)
        .forEach(([lang, bytes], index) => {
          if (total > 0) {
            const percentage = (bytes / total) * 100;
            const color = colors[index % colors.length];
            languagesChart.appendChild(
              createLanguageBar(lang, percentage, color)
            );
          }
        });
    } else {
      const noLanguages = document.createElement("p");
      noLanguages.className = "text-slate-600 dark:text-slate-400";
      noLanguages.textContent = "Dados de linguagens não disponíveis.";
      languagesChart.appendChild(noLanguages);
    }

    setText(
      "licenseInfo",
      licenseInfo?.license?.name || licenseInfo?.name || "Não especificada"
    );
    setText(
      "locCount",
      locCount > 0 ? locCount.toLocaleString("pt-BR") + " linhas" : "N/A"
    );
  } catch (error) {
    console.error("Erro principal no carregamento da página:", error);
    displayGlobalError(
      error.message ||
        "Ocorreu um erro crítico ao carregar os dados. Tente recarregar a página."
    );
  }
});
