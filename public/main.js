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

function sanitizeHTML(str) {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

function updateUI(data) {
  const {
    repoDetails,
    commits,
    issues,
    languages,
    licenseInfo,
    locCount,
    releases,
    codeFrequency,
    forksList,
  } = data;

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
      const issueElement = createIssueElement(issue); // createIssueElement will be updated
      issueElement.style.setProperty("--animation-delay", `${index * 0.05}s`);
      issuesList.appendChild(issueElement);
    });
  } else {
    const noIssues = document.createElement("p");
    noIssues.className = "text-gray-600 dark:text-gray-300"; // Updated
    noIssues.textContent = "Nenhuma issue encontrada.";
    issuesList.appendChild(noIssues);
  }

  const languagesChart = document.getElementById("languagesChart");
  languagesChart.innerHTML = "";
  if (languages && Object.keys(languages).length > 0) {
    const total = Object.values(languages).reduce((a, b) => a + b, 0);
    const colors = ["#2563EB", "#14B8A6", "#B45309", "#6B7280", "#EC4899"]; // Updated: Blue-600, Teal-500, Amber-700, Gray-500, Pink-500

    Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .forEach(([lang, bytes], index) => {
        if (total > 0) {
          const percentage = (bytes / total) * 100;
          const color = colors[index % colors.length];
          languagesChart.appendChild(
            // createLanguageBar will be updated
            createLanguageBar(lang, percentage, color)
          );
        }
      });
  } else {
    const noLanguages = document.createElement("p");
    noLanguages.className = "text-gray-600 dark:text-gray-300"; // Updated
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

  // Populate new stats in the "Estatísticas e Gráficos" section
  if (repoDetails) {
    setText("statsOpenIssues", formatNumber(repoDetails.open_issues_count));
  }
  if (commits) {
    setText("statsRecentCommits", formatNumber(commits.length));
  }
  if (issues) {
    setText("statsRecentIssues", formatNumber(issues.length));
  }

  // Releases
  const releaseListElement = document.getElementById("releaseList");
  releaseListElement.innerHTML = "";
  if (releases && releases.length > 0) {
    releases.forEach((release, index) => {
      const releaseElement = createReleaseElement(release);
      releaseElement.style.setProperty("--animation-delay", `${index * 0.05}s`);
      releaseListElement.appendChild(releaseElement);
    });
  } else {
    releaseListElement.innerHTML =
      '<p class="text-gray-600 dark:text-gray-300">Nenhuma release encontrada.</p>';
  }

  // Code Frequency
  const codeFrequencyChartElement =
    document.getElementById("codeFrequencyChart");
  codeFrequencyChartElement.innerHTML = "";
  if (codeFrequency && codeFrequency.length > 0) {
    const chartContainer = createCodeFrequencyChart(codeFrequency);
    codeFrequencyChartElement.appendChild(chartContainer);
  } else {
    codeFrequencyChartElement.innerHTML =
      '<p class="text-gray-600 dark:text-gray-300">Dados de frequência de código não disponíveis.</p>';
  }

  // Forks List
  const forksListElement = document.getElementById("forksList");
  forksListElement.innerHTML = "";
  if (forksList && forksList.length > 0) {
    forksList.slice(0, 5).forEach((forkData, index) => {
      // Displaying up to 5 forks
      const forkElement = createForkElement(forkData);
      forkElement.style.setProperty("--animation-delay", `${index * 0.05}s`);
      forksListElement.appendChild(forkElement);
    });
  } else {
    forksListElement.innerHTML =
      '<p class="text-gray-600 dark:text-gray-300">Nenhum fork recente para listar ou dados não disponíveis.</p>';
  }

  // Dependencies (Placeholder logic)
  const dependenciesListElement = document.getElementById("dependenciesList");
  if (data.dependencies && data.dependencies.length > 0) {
    dependenciesListElement.innerHTML =
      '<ul class="list-disc list-inside"></ul>';
    const ul = dependenciesListElement.querySelector("ul");
    data.dependencies.forEach(
      (dep) => (ul.innerHTML += `<li>${sanitizeHTML(dep.name || dep)}</li>`)
    );
  } // Else, the placeholder text from HTML remains.
}

function displayGlobalError(message) {
  const errorDiv = document.getElementById("errorMessageGlobal");
  errorDiv.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-amber-100" viewBox="0 0 20 20" fill="currentColor"> {/* Updated icon color */}
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="ml-3"> {/* Text color will be white due to parent class */}
        <p class="text-sm">${message}</p>
      </div>
    </div>`;
  errorDiv.classList.remove("hidden");
  errorDiv.classList.add(
    "border",
    "bg-amber-700",
    "border-amber-800",
    "text-white",
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
    "bg-white dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 list-item-animated border border-gray-200 dark:border-gray-600";

  const messageLink = document.createElement("a");
  messageLink.href = commit.html_url;
  messageLink.target = "_blank";
  messageLink.className =
    "font-medium text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300";
  messageLink.textContent = commit.commit.message.split("\n")[0];

  const shaShort = commit.sha.substring(0, 7);
  const shaSpan = document.createElement("span");
  shaSpan.className = "ml-2 text-xs text-gray-500 dark:text-gray-400 font-mono";
  shaSpan.textContent = `(${shaShort})`;

  const messageContainer = document.createElement("div");
  messageContainer.append(messageLink, shaSpan);
  const details = document.createElement("div");
  details.className =
    "mt-2 text-sm text-gray-600 dark:text-gray-300 flex justify-between items-center"; // Updated

  const author = document.createElement("span");
  author.textContent = `por ${commit.commit.author.name}`;

  const date = document.createElement("span");
  date.textContent = new Date(commit.commit.author.date).toLocaleDateString(
    "pt-BR"
  );

  details.appendChild(author);
  details.appendChild(date);
  div.appendChild(messageContainer);
  div.appendChild(details);

  return div;
}

function createIssueElement(issue) {
  const div = document.createElement("div");
  div.className =
    "bg-white dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 list-item-animated border border-gray-200 dark:border-gray-600";

  const title = document.createElement("a");
  title.href = issue.html_url;
  title.target = "_blank";
  title.className =
    "font-medium text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300"; // Updated to Teal for links
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
    <span class="text-gray-900 dark:text-gray-50">${language}</span> 
    <span class="text-gray-600 dark:text-gray-300">${percentage.toFixed(
      // Updated
      1
    )}%</span>
  `;

  const barContainer = document.createElement("div");
  barContainer.className =
    "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"; // Updated

  const bar = document.createElement("div");
  bar.className = "h-2.5 rounded-full transition-all duration-500";
  bar.style.width = `${percentage}%`;
  bar.style.backgroundColor = color || "#2563EB"; // Default to primary blue-600

  barContainer.appendChild(bar);
  div.appendChild(label);
  div.appendChild(barContainer);

  return div;
}

function createReleaseElement(release) {
  const div = document.createElement("div");
  div.className =
    "bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg list-item-animated border border-gray-200 dark:border-gray-600/70";

  const header = document.createElement("div");
  header.className = "flex justify-between items-center mb-2";

  const nameLink = document.createElement("a");
  nameLink.href = release.html_url;
  nameLink.target = "_blank";
  nameLink.className =
    "text-lg font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300";
  nameLink.textContent = release.name || release.tag_name;

  const publishedDate = document.createElement("span");
  publishedDate.className = "text-xs text-gray-500 dark:text-gray-400";
  publishedDate.textContent = `Lançado em: ${formatDate(release.published_at)}`;

  header.appendChild(nameLink);
  header.appendChild(publishedDate);
  div.appendChild(header);

  if (release.body) {
    const body = document.createElement("p");
    body.className =
      "text-sm text-gray-700 dark:text-gray-200 mt-1 prose prose-sm dark:prose-invert max-w-none";
    // Basic sanitization for description, limit length for preview
    const firstLine = release.body.split("\n")[0];
    body.textContent =
      firstLine.length > 150 ? firstLine.substring(0, 150) + "..." : firstLine;
    // For full body, consider a "show more" or using a markdown parser if body is markdown
    div.appendChild(body);
  }
  return div;
}

function createCodeFrequencyChart(codeFrequencyData) {
  const container = document.createElement("div");
  container.className = "flex space-x-1 h-40 items-end"; // Container for bars

  // Find max absolute change for scaling
  let maxChange = 0;
  codeFrequencyData.forEach((weekData) => {
    maxChange = Math.max(
      maxChange,
      Math.abs(weekData[1]),
      Math.abs(weekData[2])
    );
  });
  if (maxChange === 0) maxChange = 1; // Avoid division by zero

  codeFrequencyData.slice(-52).forEach((weekData) => {
    // Show last 52 weeks (1 year)
    const timestamp = weekData[0];
    const additions = weekData[1];
    const deletions = Math.abs(weekData[2]); // Deletions are negative

    const weekContainer = document.createElement("div");
    weekContainer.className =
      "flex flex-col items-center flex-grow min-w-[10px]"; // Each week's bar group

    const barGroup = document.createElement("div");
    barGroup.className = "flex items-end h-full";

    if (additions > 0) {
      const additionsBar = document.createElement("div");
      additionsBar.className = "bg-green-500";
      additionsBar.style.height = `${(additions / maxChange) * 100}%`;
      additionsBar.style.width = "5px"; // Fixed width for additions bar
      additionsBar.title = `+${formatNumber(additions)} adições`;
      barGroup.appendChild(additionsBar);
    }

    if (deletions > 0) {
      const deletionsBar = document.createElement("div");
      deletionsBar.className = "bg-red-500 ml-px"; // ml-px for a tiny space
      deletionsBar.style.height = `${(deletions / maxChange) * 100}%`;
      deletionsBar.style.width = "5px"; // Fixed width for deletions bar
      deletionsBar.title = `-${formatNumber(deletions)} deleções`;
      barGroup.appendChild(deletionsBar);
    }

    weekContainer.appendChild(barGroup);
    // Optional: Add date label below bars
    // const dateLabel = document.createElement('div');
    // dateLabel.className = 'text-xs text-gray-400 mt-1 transform -rotate-45 whitespace-nowrap';
    // dateLabel.textContent = new Date(timestamp * 1000).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric'});
    // weekContainer.appendChild(dateLabel);

    container.appendChild(weekContainer);
  });
  return container;
}

function createForkElement(forkData) {
  const div = document.createElement("div");
  div.className =
    "bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md list-item-animated border border-gray-200 dark:border-gray-600/70";
  const link = document.createElement("a");
  link.href = forkData.html_url;
  link.target = "_blank";
  link.className =
    "text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium";
  link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1.5 -mt-px" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> ${sanitizeHTML(forkData.full_name)}`;
  div.appendChild(link);
  return div;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  const loadingBarElement =
    document.getElementById("loadingBar")?.firstElementChild;

  const showLoadingBar = () => {
    if (loadingBarElement) {
      loadingBarElement.style.width = "0%";
      loadingBarElement.parentElement.classList.remove("opacity-0"); // Make it visible
      loadingBarElement.parentElement.classList.add("opacity-100");
      // Animate to a certain percentage to show activity
      setTimeout(() => {
        loadingBarElement.style.width = "30%";
      }, 100);
    }
  };

  const completeLoadingBar = () => {
    if (loadingBarElement) {
      loadingBarElement.style.width = "100%";
      setTimeout(() => {
        loadingBarElement.parentElement.classList.remove("opacity-100");
        loadingBarElement.parentElement.classList.add("opacity-0");
        setTimeout(() => {
          loadingBarElement.style.width = "0%";
        }, 300); // Reset after fade out
      }, 500);
    }
  };

  showLoadingBar();

  try {
    const [serverData, visitsData] = await Promise.all([
      fetchServerData(),
      fetchWithCache(CONFIG.API_ENDPOINTS.VISITS),
    ]);

    if (serverData) {
      updateUI(serverData);
    } else {
      // Handle case where serverData is null/undefined from fetchServerData (already throws, but as a fallback)
      displayGlobalError(
        "Não foi possível carregar os dados do projeto do servidor."
      );
      document
        .querySelectorAll(".loading-placeholder")
        .forEach((el) => (el.textContent = "Erro"));
    }

    if (visitsData) {
      setText("visitCount", formatNumber(visitsData.totalVisits));
    }
  } catch (error) {
    console.error("Erro principal no carregamento da página:", error);
    displayGlobalError(
      error.message ||
        "Ocorreu um erro crítico ao carregar os dados. Tente recarregar a página."
    );
    // Ensure placeholders show an error state if main data loading fails
    if (!clientCache.get(CONFIG.API_ENDPOINTS.GITHUB)) {
      // Check if server data was never loaded
      document.querySelectorAll(".loading-placeholder").forEach((el) => {
        if (el.id !== "visitCount") el.textContent = "Erro";
      });
    }
  }
  completeLoadingBar();

  // Mobile Menu Toggle
  const mobileMenuButton = document.getElementById("mobileMenuButton");
  const mobileNavMenu = document.getElementById("mobileNavMenu");

  if (mobileMenuButton && mobileNavMenu) {
    mobileMenuButton.addEventListener("click", () => {
      const isExpanded =
        mobileMenuButton.getAttribute("aria-expanded") === "true" || false;
      mobileMenuButton.setAttribute("aria-expanded", !isExpanded);
      mobileNavMenu.classList.toggle("hidden");
    });

    // Optional: Close menu when a link is clicked (for single-page navigation)
    mobileNavMenu.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", () => {
        mobileNavMenu.classList.add("hidden");
        mobileMenuButton.setAttribute("aria-expanded", "false");
      });
    });
  }
});
