const CLIENT_CACHE_DURATION = 1 * 60 * 1000;

const clientCache = {
  data: {},
  timestamps: {},
  set: function (key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  },
  get: function (key) {
    const timestamp = this.timestamps[key];
    if (timestamp && Date.now() - timestamp < CLIENT_CACHE_DURATION) {
      return this.data[key];
    }
    return null;
  },
};

async function fetchWithCache(url) {
  const cacheKey = url;
  const cachedData = clientCache.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }
  console.warn("fetchWithCache chamada para uma URL não esperada:", url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  clientCache.set(cacheKey, data);
  return data;
}

async function fetchServerData() {
  const cacheKey = "/api/github-data";
  const cachedData = clientCache.get(cacheKey);

  if (cachedData) {
    console.log("Servindo dados do cache do cliente para /api/github-data");
    return cachedData;
  }

  console.log("Buscando dados do servidor de /api/github-data");
  try {
    const response = await fetch(cacheKey);
    if (!response.ok) {
      let errorMessage = `Erro ao buscar dados do servidor: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && (errorData.error || errorData.details)) {
          errorMessage = `Erro do servidor: ${errorData.error || ""} ${
            errorData.details || ""
          }`.trim();
        }
      } catch (e) {}
      displayGlobalError(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.serverError) {
      displayGlobalError(
        `Aviso do servidor: ${data.serverError}. Mostrando dados que podem estar desatualizados.`
      );
    }

    clientCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Erro ao buscar dados de ${cacheKey}:`, error);
    displayGlobalError(
      `Falha ao comunicar com o servidor: ${error.message}. Tente novamente mais tarde.`
    );
    throw error;
  }
}

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

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("currentYear").textContent = new Date().getFullYear();

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
