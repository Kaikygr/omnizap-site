// Configurações e constantes
const CONFIG = {
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  API_ENDPOINTS: {
    SERVER_DATA: "/api/server-data",
    VISITS: "/api/visits",
    VISIT_STATS: "/api/visits/stats",
  },
};

const cache = new Map();

// Dados de fallback baseados no github-cache.json
const FALLBACK_DATA = {
  repoDetails: {
    name: "omnizap",
    description:
      "🔥 OmniZap — Bot de WhatsApp open-source e educacional, desenvolvido em JavaScript com a biblioteca Baileys. OmniZap é um projeto open-source criado para fins de estudo, desenvolvimento e aprendizado, permitindo criar automações, gerenciar grupos, baixar mídias e muito mais no WhatsApp.",
    language: "JavaScript",
    stargazers_count: 1,
    forks_count: 0,
    watchers_count: 1,
    open_issues_count: 0,
    size: 868,
    created_at: "2025-05-23T01:55:20Z",
    updated_at: "2025-06-07T00:40:46Z",
    pushed_at: "2025-06-08T17:15:06Z",
    html_url: "https://github.com/Kaikygr/omnizap",
    visibility: "public",
    default_branch: "main",
    allow_forking: true,
    is_template: false,
    archived: false,
    disabled: false,
    has_issues: true,
    has_projects: true,
    has_wiki: false,
    has_pages: false,
    has_discussions: false,
    has_downloads: true,
    allow_squash_merge: true,
    allow_merge_commit: true,
    allow_rebase_merge: true,
    network_count: 0,
    subscribers_count: 1,
    license: {
      name: "MIT License",
      spdx_id: "MIT",
    },
    owner: {
      login: "Kaikygr",
      id: 182138885,
      avatar_url: "https://avatars.githubusercontent.com/u/182138885?v=4",
      html_url: "https://github.com/Kaikygr",
      type: "User",
      site_admin: false,
    },
    security_and_analysis: {
      secret_scanning: {
        status: "disabled",
      },
      dependabot_security_updates: {
        status: "disabled",
      },
    },
  },
  commits: [
    {
      sha: "e110ee05",
      commit: {
        message:
          "Merge pull request #8: Refatorar e aprimorar a configuração do ambiente para maior estabilidade",
        author: {
          name: "Kaiky Brito",
          date: "2025-06-07T00:32:34Z",
        },
      },
      author: {
        login: "Kaikygr",
      },
    },
    {
      sha: "211303b7",
      commit: {
        message:
          "refactor: melhora a configuração do sistema, unificando a definição do nome",
        author: {
          name: "kaikygr",
          date: "2025-06-07T00:27:18Z",
        },
      },
      author: {
        login: "Kaikygr",
      },
    },
  ],
  issues: [
    {
      id: 3126172543,
      title:
        "Refatorar e aprimorar a configuração do ambiente para maior estabilidade",
      state: "closed",
      created_at: "2025-06-07T00:30:45Z",
      user: {
        login: "Kaikygr",
      },
    },
  ],
  languages: {
    JavaScript: 91410,
    Shell: 6902,
  },
  licenseInfo: {
    name: "MIT License",
    spdx_id: "MIT",
  },
  locCount: 3277,
};

// Funções utilitárias
function formatNumber(num) {
  if (typeof num !== "number") return "0";
  return new Intl.NumberFormat("pt-BR").format(num);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch (error) {
    return "Data inválida";
  }
}

function setText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
    element.classList.remove("loading-placeholder");
  }
}

function setHtml(elementId, html) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = html;
    element.classList.remove("loading-placeholder");
  }
}

// Cache e fetch
async function fetchWithCache(url, maxAge = CONFIG.CACHE_DURATION) {
  const cacheKey = url;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error(`Erro ao buscar ${url}:`, error);
    if (cached) {
      console.log("Usando dados em cache expirados");
      return cached.data;
    }
    throw error;
  }
}

// Principais funções de atualização da UI
function updateUI(data) {
  if (!data) {
    console.log("Usando dados de fallback");
    data = FALLBACK_DATA;
  }

  try {
    // Informações básicas do projeto
    setText("projectName", data.repoDetails?.name || "omnizap");
    setText(
      "projectDescription",
      data.repoDetails?.description || "Bot de WhatsApp open-source"
    );
    setText("projectLanguage", data.repoDetails?.language || "JavaScript");
    setText(
      "stargazersCount",
      formatNumber(data.repoDetails?.stargazers_count || 1)
    );
    setText("forksCount", formatNumber(data.repoDetails?.forks_count || 0));
    setText(
      "watchersCount",
      formatNumber(data.repoDetails?.watchers_count || 1)
    );
    setText(
      "openIssuesCount",
      formatNumber(data.repoDetails?.open_issues_count || 0)
    );
    setText("repoSize", `${formatNumber(data.repoDetails?.size || 868)} KB`);

    // Informações de licença
    const license = data.licenseInfo || data.repoDetails?.license;
    setText("licenseInfo", license?.name || "MIT License");

    // Datas importantes
    if (data.repoDetails?.created_at) {
      setText("createdAt", formatDate(data.repoDetails.created_at));
    }
    if (data.repoDetails?.updated_at) {
      setText("lastUpdated", formatDate(data.repoDetails.updated_at));
    }
    if (data.repoDetails?.pushed_at) {
      setText("pushedAt", formatDate(data.repoDetails.pushed_at));
    }

    // Contagem de linhas de código
    setText("locCount", formatNumber(data.locCount || 3277));

    // Informações do desenvolvedor/owner
    updateDeveloperInfo(data.repoDetails?.owner);

    // Estatísticas do repositório
    updateRepositoryStats(data.repoDetails);

    // Link do projeto
    const projectUrl =
      data.repoDetails?.html_url || "https://github.com/Kaikygr/omnizap";
    updateProjectLinks(projectUrl);

    // Distribuição de linguagens
    if (data.languages) {
      updateLanguagesChart(data.languages);
    }

    // Commits recentes
    if (data.commits) {
      updateCommitsList(data.commits);
    }

    // Issues recentes
    if (data.issues) {
      updateIssuesList(data.issues);
    }

    // Estatísticas adicionais
    updateAdditionalStats(data);
  } catch (error) {
    console.error("Erro ao atualizar UI:", error);
  }
}

function updateDeveloperInfo(owner) {
  if (!owner) {
    owner = FALLBACK_DATA.repoDetails.owner;
  }

  setText("developerName", owner.login || "Kaikygr");
  setText(
    "developerType",
    owner.type === "User" ? "Usuário" : owner.type || "Usuário"
  );
  setText("developerId", `#${owner.id || "182138885"}`);

  const avatarImg = document.getElementById("developerAvatar");
  if (avatarImg && owner.avatar_url) {
    avatarImg.src = owner.avatar_url;
    avatarImg.alt = `Avatar de ${owner.login}`;
  }

  const profileLink = document.getElementById("developerProfile");
  if (profileLink && owner.html_url) {
    profileLink.href = owner.html_url;
  }
}

function updateRepositoryStats(repoDetails) {
  if (!repoDetails) return;

  setText(
    "allowForking",
    repoDetails.allow_forking ? "Permitido" : "Não permitido"
  );
  setText("isTemplate", repoDetails.is_template ? "Sim" : "Não");
  setText("isArchived", repoDetails.archived ? "Sim" : "Não");
  setText("isDisabled", repoDetails.disabled ? "Sim" : "Não");
  setText(
    "visibility",
    repoDetails.visibility === "public" ? "Público" : "Privado"
  );
  setText("defaultBranch", repoDetails.default_branch || "main");

  setText("allowSquashMerge", repoDetails.allow_squash_merge ? "Sim" : "Não");
  setText("allowMergeCommit", repoDetails.allow_merge_commit ? "Sim" : "Não");
  setText("allowRebaseMerge", repoDetails.allow_rebase_merge ? "Sim" : "Não");

  setText("hasIssues", repoDetails.has_issues ? "Sim" : "Não");
  setText("hasProjects", repoDetails.has_projects ? "Sim" : "Não");
  setText("hasWiki", repoDetails.has_wiki ? "Sim" : "Não");
  setText("hasPages", repoDetails.has_pages ? "Sim" : "Não");
  setText("hasDiscussions", repoDetails.has_discussions ? "Sim" : "Não");
  setText("hasDownloads", repoDetails.has_downloads ? "Sim" : "Não");

  setText("networkCount", formatNumber(repoDetails.network_count || 0));
  setText("subscribersCount", formatNumber(repoDetails.subscribers_count || 1));
}

function updateProjectLinks(url) {
  const links = ["projectHtmlUrl", "headerGithubLink", "sidebarGithubLink"];
  links.forEach((linkId) => {
    const element = document.getElementById(linkId);
    if (element) {
      element.href = url;
    }
  });
}

function updateLanguagesChart(languages) {
  const container = document.getElementById("languagesChart");
  if (!container || !languages) return;

  const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  const languageEntries = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const languageColors = {
    JavaScript: "#f1e05a",
    TypeScript: "#2b7489",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Shell: "#89e051",
    HTML: "#e34c26",
    CSS: "#563d7c",
    PHP: "#4F5D95",
  };

  const chartHtml = languageEntries
    .map(([language, bytes]) => {
      const percentage = ((bytes / total) * 100).toFixed(1);
      const color = languageColors[language] || "#6b7280";

      return `
      <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-600 rounded text-sm">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
          <span class="font-medium">${language}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-600 dark:text-gray-300">${percentage}%</span>
          <span class="text-xs text-gray-500">(${formatNumber(bytes)} bytes)</span>
        </div>
      </div>
    `;
    })
    .join("");

  setHtml("languagesChart", chartHtml);
}

function updateCommitsList(commits) {
  const container = document.getElementById("commitList");
  if (!container || !commits?.length) {
    setHtml(
      "commitList",
      '<p class="text-gray-600 dark:text-gray-300 italic">Nenhum commit encontrado.</p>'
    );
    return;
  }

  const commitsHtml = commits
    .slice(0, 5)
    .map((commit) => {
      const message = commit.commit?.message || "Sem mensagem";
      const author =
        commit.author?.login ||
        commit.commit?.author?.name ||
        "Autor desconhecido";
      const date = formatDate(commit.commit?.author?.date);
      const sha = commit.sha?.substring(0, 7) || "";

      return `
      <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-2">
          <h4 class="font-medium text-gray-900 dark:text-gray-50 line-clamp-2">${message}</h4>
          <span class="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded font-mono">${sha}</span>
        </div>
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Por: <strong>${author}</strong></span>
          <span>${date}</span>
        </div>
      </div>
    `;
    })
    .join("");

  setHtml("commitList", commitsHtml);
}

function updateIssuesList(issues) {
  const container = document.getElementById("issuesList");
  if (!container || !issues?.length) {
    setHtml(
      "issuesList",
      '<p class="text-gray-600 dark:text-gray-300 italic">Nenhuma issue encontrada.</p>'
    );
    return;
  }

  const issuesHtml = issues
    .slice(0, 5)
    .map((issue) => {
      const title = issue.title || "Sem título";
      const state = issue.state || "unknown";
      const author = issue.user?.login || "Autor desconhecido";
      const date = formatDate(issue.created_at);
      const stateColor =
        state === "open"
          ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200";
      const stateText = state === "open" ? "Aberta" : "Fechada";

      return `
      <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-2">
          <h4 class="font-medium text-gray-900 dark:text-gray-50 line-clamp-2">${title}</h4>
          <span class="text-xs px-2 py-1 rounded ${stateColor}">${stateText}</span>
        </div>
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Por: <strong>${author}</strong></span>
          <span>${date}</span>
        </div>
      </div>
    `;
    })
    .join("");

  setHtml("issuesList", issuesHtml);
}

function updateAdditionalStats(data) {
  setText("statsRecentCommits", formatNumber(data.commits?.length || 2));

  const totalIssues = Array.isArray(data.issues) ? data.issues.length : 0;
  const openIssues = Array.isArray(data.issues)
    ? data.issues.filter((issue) => issue.state === "open").length
    : 0;
  const closedIssues = totalIssues - openIssues;

  setText("statsRecentIssues", formatNumber(totalIssues));
  setText(
    "statsOpenIssues",
    formatNumber(data.repoDetails?.open_issues_count || 0)
  );
  setText("statsClosedIssues", formatNumber(closedIssues));

  if (data.languages) {
    const languageCount = Object.keys(data.languages).length;
    setText("languagesCount", formatNumber(languageCount));

    const totalBytes = Object.values(data.languages).reduce(
      (sum, bytes) => sum + bytes,
      0
    );
    setText("totalCodeBytes", formatNumber(totalBytes));
  }

  const security = data.repoDetails?.security_and_analysis;
  if (security) {
    setText(
      "secretScanning",
      security.secret_scanning?.status === "enabled" ? "Ativo" : "Inativo"
    );
    setText(
      "dependabotUpdates",
      security.dependabot_security_updates?.status === "enabled"
        ? "Ativo"
        : "Inativo"
    );
  }
}

// Funções de visitas
async function recordVisit() {
  try {
    await fetch("/api/visits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href,
      }),
    });
  } catch (error) {
    console.error("Erro ao registrar visita:", error);
  }
}

// Função para carregar estatísticas de visitas
async function loadVisitStats() {
  try {
    const response = await fetch("/api/visit-stats");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Verificar se há erro na resposta
    if (data.error) {
      throw new Error(data.error);
    }

    // Para compatibilidade, aceitar tanto data.data quanto data diretamente
    const stats = data.data || data;

    // Atualizar elementos da página principal usando a estrutura correta
    if (stats.summary) {
      updateElementTextById(
        "visitsTotal",
        (stats.summary.totalVisits || 0).toLocaleString("pt-BR")
      );
      updateElementTextById(
        "visitsUnique",
        (stats.summary.uniqueVisitors || 0).toLocaleString("pt-BR")
      );
      updateElementTextById(
        "visitCount",
        (stats.summary.totalVisits || 0).toLocaleString("pt-BR")
      );
    }

    if (stats.trends) {
      updateElementTextById(
        "visits24h",
        (stats.trends.last24hours?.totalVisits || 0).toLocaleString("pt-BR")
      );
      updateElementTextById(
        "visits7d",
        (stats.trends.last7days?.totalVisits || 0).toLocaleString("pt-BR")
      );
    }

    // Atualizar estatísticas detalhadas se disponíveis
    if (stats.devices) {
      updateVisitStats(stats);
    }

    return stats;
  } catch (error) {
    console.error("Erro ao carregar estatísticas de visitas:", error);
    // Valores padrão em caso de erro
    updateElementTextById("visitsTotal", "0");
    updateElementTextById("visitsUnique", "0");
    updateElementTextById("visits24h", "0");
    updateElementTextById("visits7d", "0");
    updateElementTextById("visitCount", "0");
    return null;
  }
}

function updateVisitStats(stats) {
  // Compatibilidade com a nova estrutura de dados
  const summary = stats.summary || {};
  const devices = stats.devices || {};
  const trends = stats.trends || {};

  setText("visitsTotal", formatNumber(summary.totalVisits || 1));
  setText("visitsUnique", formatNumber(summary.uniqueVisitors || 1));
  setText("visits24h", formatNumber(trends.last24hours?.totalVisits || 1));
  setText("visits7d", formatNumber(trends.last7days?.totalVisits || 1));
  setText("visitCount", formatNumber(summary.totalVisits || 1));

  // Atualizar gráficos de dispositivos, navegadores, etc.
  if (devices.deviceTypes) {
    updateStatsChart("visitDevices", devices.deviceTypes);
  }
  if (devices.browsers) {
    updateStatsChart("visitBrowsers", devices.browsers);
  }
  if (devices.operatingSystems) {
    updateStatsChart("visitOS", devices.operatingSystems);
  }

  // Atualizar horários de maior acesso se disponível
  if (stats.timeAnalysis?.hourly) {
    updateHourlyStats("visitHours", stats.timeAnalysis.hourly);
  }
}

function updateStatsChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container || !data) return;

  const entries = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);

  const chartHtml = entries
    .map(([name, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      return `
      <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-600 rounded text-sm">
        <span class="font-medium">${name}</span>
        <div class="flex items-center gap-2">
          <span class="text-gray-600 dark:text-gray-300">${count}</span>
          <span class="text-xs text-gray-500">(${percentage}%)</span>
        </div>
      </div>
    `;
    })
    .join("");

  setHtml(containerId, chartHtml);
}

function updateHourlyStats(containerId, hourlyData) {
  const container = document.getElementById(containerId);
  if (!container || !hourlyData) return;

  // Encontrar os 3 horários com mais acessos
  const entries = Object.entries(hourlyData)
    .filter(([hour, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (entries.length === 0) {
    setHtml(
      containerId,
      '<p class="text-gray-600 dark:text-gray-300 italic">Nenhum dado de horário disponível</p>'
    );
    return;
  }

  const chartHtml = entries
    .map(([hour, count]) => {
      return `
      <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-600 rounded text-sm">
        <span class="font-medium">${hour}</span>
        <div class="flex items-center gap-2">
          <span class="text-gray-600 dark:text-gray-300">${count} acesso${count > 1 ? "s" : ""}</span>
        </div>
      </div>
    `;
    })
    .join("");

  setHtml(containerId, chartHtml);
}

// Navegação e UI
function setupNavigation() {
  // Mobile menu
  const mobileMenuButton = document.getElementById("mobileMenuButton");
  const mobileSidebarMenu = document.getElementById("mobileSidebarMenu");
  const mobileSidebarOverlay = document.getElementById("mobileSidebarOverlay");
  const closeSidebarButton = document.getElementById("closeSidebarButton");

  function showMobileMenu() {
    if (mobileSidebarMenu && mobileSidebarOverlay) {
      mobileSidebarMenu.classList.remove("-translate-x-full");
      mobileSidebarOverlay.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function hideMobileMenu() {
    if (mobileSidebarMenu && mobileSidebarOverlay) {
      mobileSidebarMenu.classList.add("-translate-x-full");
      mobileSidebarOverlay.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }

  mobileMenuButton?.addEventListener("click", showMobileMenu);
  closeSidebarButton?.addEventListener("click", hideMobileMenu);
  mobileSidebarOverlay?.addEventListener("click", hideMobileMenu);

  // Smooth scrolling para links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        hideMobileMenu();
      }
    });
  });
}

// Inicialização
async function init() {
  try {
    // Configurar ano atual
    const currentYearElement = document.getElementById("currentYear");
    if (currentYearElement) {
      currentYearElement.textContent = new Date().getFullYear();
    }

    // Configurar navegação
    setupNavigation();

    // Registrar visita (não bloquear se falhar)
    recordVisit().catch((err) =>
      console.log("Visita não registrada:", err.message)
    );

    // Tentar carregar dados do GitHub
    try {
      const data = await fetchWithCache("/api/server-data");
      if (data.success) {
        updateUI(data.data);
      } else {
        throw new Error(data.error || "Erro ao carregar dados");
      }
    } catch (error) {
      console.log("API indisponível, usando dados de fallback");
      updateUI(FALLBACK_DATA);
    }

    // Carregar estatísticas de visitas
    await loadVisitStats();
  } catch (error) {
    console.error("Erro na inicialização:", error);

    // Usar dados de fallback
    updateUI(FALLBACK_DATA);

    // Mostrar mensagem de erro
    const errorContainer = document.getElementById("errorMessageGlobal");
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <strong>Aviso:</strong> Conectado no modo offline. Exibindo dados em cache.
        </div>
      `;
      errorContainer.classList.remove("hidden");
    }
  }
}

// Executar quando o DOM estiver carregado
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Configurações e constantes
const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = "kaikygr";
const REPO_NAME = "omnizap";
const REPO_URL = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}`;

// Função utilitária para atualizar texto de elemento por ID
function updateElementTextById(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
    element.classList.remove("loading-placeholder");
  }
}

// Função utilitária para atualizar HTML de elemento por ID
function updateElementHtmlById(elementId, html) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = html;
    element.classList.remove("loading-placeholder");
  }
}

// Função utilitária para formatar números
function formatNumber(number) {
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + "M";
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + "K";
  }
  return number.toString();
}

// Função utilitária para formatar bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Função utilitária para formatar datas
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Função utilitária para formatar data e hora
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Função utilitária para tempo relativo
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} min atrás`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} h atrás`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)} dias atrás`;

  return formatDate(dateString);
}

// Função para mostrar mensagem de erro
function showError(message, containerId = "errorMessageGlobal") {
  const errorContainer = document.getElementById(containerId);
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
        <strong class="font-bold">Erro:</strong>
        <span class="block sm:inline"> ${message}</span>
      </div>
    `;
    errorContainer.classList.remove("hidden");
    setTimeout(() => {
      errorContainer.classList.add("hidden");
    }, 5000);
  }
}

// Função para fazer requisições à API
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Tentativa ${i + 1} falhou, tentando novamente...`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Função para registrar visita
async function recordVisit() {
  try {
    await fetch("/api/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn("Erro ao registrar visita:", error);
  }
}

// Função para carregar dados do repositório
async function loadRepositoryData() {
  try {
    const data = await fetchWithRetry(REPO_URL);

    // Atualizar informações básicas
    updateElementTextById("projectName", data.name || "N/A");
    updateElementTextById(
      "projectDescription",
      data.description || "Sem descrição disponível"
    );
    updateElementTextById("projectLanguage", data.language || "N/A");
    updateElementTextById(
      "stargazersCount",
      formatNumber(data.stargazers_count || 0)
    );
    updateElementTextById("forksCount", formatNumber(data.forks_count || 0));
    updateElementTextById(
      "watchersCount",
      formatNumber(data.watchers_count || 0)
    );
    updateElementTextById(
      "openIssuesCount",
      formatNumber(data.open_issues_count || 0)
    );
    updateElementTextById("repoSize", formatBytes((data.size || 0) * 1024));
    updateElementTextById("licenseInfo", data.license?.name || "Sem licença");

    // Atualizar datas
    updateElementTextById("createdAt", formatDate(data.created_at));
    updateElementTextById("lastUpdated", formatDate(data.updated_at));
    updateElementTextById("pushedAt", formatDate(data.pushed_at));

    // Atualizar links
    const projectLink = document.getElementById("projectHtmlUrl");
    const headerGithubLink = document.getElementById("headerGithubLink");
    const sidebarGithubLink = document.getElementById("sidebarGithubLink");

    if (projectLink) projectLink.href = data.html_url;
    if (headerGithubLink) headerGithubLink.href = data.html_url;
    if (sidebarGithubLink) sidebarGithubLink.href = data.html_url;

    // Atualizar informações avançadas
    updateElementTextById("visibility", data.private ? "Privado" : "Público");
    updateElementTextById("defaultBranch", data.default_branch || "main");
    updateElementTextById("allowForking", data.allow_forking ? "Sim" : "Não");
    updateElementTextById("isTemplate", data.is_template ? "Sim" : "Não");
    updateElementTextById(
      "hasIssues",
      data.has_issues ? "Habilitado" : "Desabilitado"
    );
    updateElementTextById(
      "hasProjects",
      data.has_projects ? "Habilitado" : "Desabilitado"
    );
    updateElementTextById(
      "hasWiki",
      data.has_wiki ? "Habilitado" : "Desabilitado"
    );
    updateElementTextById(
      "hasDiscussions",
      data.has_discussions ? "Habilitado" : "Desabilitado"
    );
    updateElementTextById(
      "networkCount",
      formatNumber(data.network_count || 0)
    );
    updateElementTextById(
      "subscribersCount",
      formatNumber(data.subscribers_count || 0)
    );

    // Carregar informações do desenvolvedor
    await loadDeveloperInfo(data.owner);

    console.log("Dados do repositório carregados com sucesso");
  } catch (error) {
    console.error("Erro ao carregar dados do repositório:", error);
    showError("Não foi possível carregar as informações do repositório.");
  }
}

// Função para carregar informações do desenvolvedor
async function loadDeveloperInfo(owner) {
  try {
    updateElementTextById("developerName", owner.login || "N/A");
    updateElementTextById("developerType", owner.type || "N/A");
    updateElementTextById("developerId", owner.id?.toString() || "N/A");

    const avatarImg = document.getElementById("developerAvatar");
    const profileLink = document.getElementById("developerProfile");

    if (avatarImg && owner.avatar_url) {
      avatarImg.src = owner.avatar_url;
      avatarImg.alt = `Avatar de ${owner.login}`;
    }

    if (profileLink && owner.html_url) {
      profileLink.href = owner.html_url;
    }
  } catch (error) {
    console.error("Erro ao carregar informações do desenvolvedor:", error);
  }
}

// Função para carregar linguagens do repositório
async function loadLanguages() {
  try {
    const languages = await fetchWithRetry(`${REPO_URL}/languages`);
    const languagesContainer = document.getElementById("languagesChart");

    if (!languagesContainer || Object.keys(languages).length === 0) {
      updateElementHtmlById(
        "languagesChart",
        '<p class="text-gray-600 dark:text-gray-300 italic">Nenhuma linguagem detectada</p>'
      );
      return;
    }

    const total = Object.values(languages).reduce(
      (sum, bytes) => sum + bytes,
      0
    );
    const languageEntries = Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const languageColors = {
      JavaScript: "#f7df1e",
      TypeScript: "#3178c6",
      Python: "#3776ab",
      Java: "#ed8b00",
      "C++": "#00599c",
      "C#": "#239120",
      PHP: "#777bb4",
      Ruby: "#cc342d",
      Go: "#00add8",
      Rust: "#000000",
      HTML: "#e34f26",
      CSS: "#1572b6",
    };

    const languageHtml = languageEntries
      .map(([lang, bytes]) => {
        const percentage = ((bytes / total) * 100).toFixed(1);
        const color = languageColors[lang] || "#6b7280";
        return `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center">
            <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${color}"></div>
            <span class="text-sm font-medium">${lang}</span>
          </div>
          <span class="text-sm text-gray-600 dark:text-gray-400">${percentage}%</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
          <div class="h-2 rounded-full" style="background-color: ${color}; width: ${percentage}%"></div>
        </div>
      `;
      })
      .join("");

    updateElementHtmlById("languagesChart", languageHtml);
    updateElementTextById("languagesCount", languageEntries.length.toString());
    updateElementTextById("totalCodeBytes", formatBytes(total));
  } catch (error) {
    console.error("Erro ao carregar linguagens:", error);
    updateElementHtmlById(
      "languagesChart",
      '<p class="text-gray-600 dark:text-gray-300 italic">Erro ao carregar linguagens</p>'
    );
  }
}

// Função para carregar commits recentes
async function loadCommits() {
  try {
    const commits = await fetchWithRetry(`${REPO_URL}/commits?per_page=10`);
    const commitContainer = document.getElementById("commitList");

    if (!commits || commits.length === 0) {
      updateElementHtmlById(
        "commitList",
        '<p class="text-gray-600 dark:text-gray-300 italic">Nenhum commit encontrado</p>'
      );
      return;
    }

    const commitHtml = commits
      .map(
        (commit, index) => `
      <div class="list-item-animated bg-gray-50 dark:bg-gray-600 p-4 rounded-lg border border-gray-200 dark:border-gray-500" 
           style="--animation-delay: ${index * 0.1}s">
        <div class="flex items-start gap-3">
          <img src="${commit.author?.avatar_url || "https://github.com/ghost.png"}" 
               alt="Avatar" class="w-10 h-10 rounded-full flex-shrink-0">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
              ${commit.commit.message.split("\n")[0]}
            </p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
              <span>Por ${commit.commit.author.name}</span>
              <span>${getTimeAgo(commit.commit.author.date)}</span>
              <a href="${commit.html_url}" target="_blank" 
                 class="text-blue-600 dark:text-blue-400 hover:underline">
                ${commit.sha.substring(0, 7)}
              </a>
            </div>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    updateElementHtmlById("commitList", commitHtml);
    updateElementTextById("statsRecentCommits", commits.length.toString());
  } catch (error) {
    console.error("Erro ao carregar commits:", error);
    updateElementHtmlById(
      "commitList",
      '<p class="text-gray-600 dark:text-gray-300 italic">Erro ao carregar commits</p>'
    );
  }
}

// Função para carregar issues recentes
async function loadIssues() {
  try {
    const [openIssues, closedIssues] = await Promise.all([
      fetchWithRetry(`${REPO_URL}/issues?state=open&per_page=10`),
      fetchWithRetry(`${REPO_URL}/issues?state=closed&per_page=100`),
    ]);

    const issuesContainer = document.getElementById("issuesList");

    if (!openIssues || openIssues.length === 0) {
      updateElementHtmlById(
        "issuesList",
        '<p class="text-gray-600 dark:text-gray-300 italic">Nenhuma issue encontrada</p>'
      );
    } else {
      const issuesHtml = openIssues
        .map(
          (issue, index) => `
        <div class="list-item-animated bg-gray-50 dark:bg-gray-600 p-4 rounded-lg border border-gray-200 dark:border-gray-500"
             style="--animation-delay: ${index * 0.1}s">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                         ${
                           issue.state === "open"
                             ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200"
                             : "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200"
                         }">
                ${issue.state === "open" ? "Aberta" : "Fechada"}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                ${issue.title}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span>#${issue.number}</span>
                <span>Por ${issue.user.login}</span>
                <span>${getTimeAgo(issue.created_at)}</span>
                <a href="${issue.html_url}" target="_blank" 
                   class="text-blue-600 dark:text-blue-400 hover:underline">
                  Ver Issue
                </a>
              </div>
              ${
                issue.labels.length > 0
                  ? `
                <div class="flex flex-wrap gap-1 mt-2">
                  ${issue.labels
                    .slice(0, 3)
                    .map(
                      (label) => `
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style="background-color: #${label.color}20; color: #${label.color}">
                      ${label.name}
                    </span>
                  `
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      `
        )
        .join("");

      updateElementHtmlById("issuesList", issuesHtml);
    }

    updateElementTextById("statsRecentIssues", openIssues.length.toString());
    updateElementTextById("statsOpenIssues", openIssues.length.toString());
    updateElementTextById("statsClosedIssues", closedIssues.length.toString());
  } catch (error) {
    console.error("Erro ao carregar issues:", error);
    updateElementHtmlById(
      "issuesList",
      '<p class="text-gray-600 dark:text-gray-300 italic">Erro ao carregar issues</p>'
    );
  }
}

// Função para carregar estatísticas de visitas
async function loadVisitStats() {
  try {
    const response = await fetch("/api/visit-stats");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Verificar se há erro na resposta
    if (data.error) {
      throw new Error(data.error);
    }

    // Para compatibilidade, aceitar tanto data.data quanto data diretamente
    const stats = data.data || data;

    // Atualizar elementos da página principal usando a estrutura correta
    if (stats.summary) {
      updateElementTextById(
        "visitsTotal",
        (stats.summary.totalVisits || 0).toLocaleString("pt-BR")
      );
      updateElementTextById(
        "visitsUnique",
        (stats.summary.uniqueVisitors || 0).toLocaleString("pt-BR")
      );
      updateElementTextById(
        "visitCount",
        (stats.summary.totalVisits || 0).toLocaleString("pt-BR")
      );
    }

    if (stats.trends) {
      updateElementTextById(
        "visits24h",
        (stats.trends.last24hours?.totalVisits || 0).toLocaleString("pt-BR")
      );
      updateElementTextById(
        "visits7d",
        (stats.trends.last7days?.totalVisits || 0).toLocaleString("pt-BR")
      );
    }

    // Atualizar estatísticas detalhadas se disponíveis
    if (stats.devices) {
      updateVisitStats(stats);
    }

    return stats;
  } catch (error) {
    console.error("Erro ao carregar estatísticas de visitas:", error);
    // Valores padrão em caso de erro
    updateElementTextById("visitsTotal", "0");
    updateElementTextById("visitsUnique", "0");
    updateElementTextById("visits24h", "0");
    updateElementTextById("visits7d", "0");
    updateElementTextById("visitCount", "0");
    return null;
  }
}

// Função para configurar navegação
function setupNavigation() {
  const mobileMenuButton = document.getElementById("mobileMenuButton");
  const mobileSidebarMenu = document.getElementById("mobileSidebarMenu");
  const mobileSidebarOverlay = document.getElementById("mobileSidebarOverlay");
  const closeSidebarButton = document.getElementById("closeSidebarButton");

  // Abrir sidebar mobile
  if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", () => {
      mobileSidebarMenu?.classList.remove("-translate-x-full");
      mobileSidebarOverlay?.classList.remove("hidden");
      document.body.classList.add("sidebar-open");
    });
  }

  // Fechar sidebar mobile
  const closeSidebar = () => {
    mobileSidebarMenu?.classList.add("-translate-x-full");
    mobileSidebarOverlay?.classList.add("hidden");
    document.body.classList.remove("sidebar-open");
  };

  if (closeSidebarButton) {
    closeSidebarButton.addEventListener("click", closeSidebar);
  }

  if (mobileSidebarOverlay) {
    mobileSidebarOverlay.addEventListener("click", closeSidebar);
  }

  // Configurar links de navegação suave
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        // Fechar sidebar se estiver aberto
        closeSidebar();

        // Scroll suave para o elemento
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Adicionar highlight ao elemento
        targetElement.classList.add("section-highlight");
        setTimeout(() => {
          targetElement.classList.remove("section-highlight");
        }, 2000);

        // Atualizar estado ativo dos links
        updateActiveNavLink(targetId);
      }
    });
  });
}

// Função para atualizar link ativo na navegação
function updateActiveNavLink(targetId) {
  // Remover classe active de todos os links
  document
    .querySelectorAll(".desktop-menu-link, .sidebar-link")
    .forEach((link) => {
      link.classList.remove("active");
    });

  // Adicionar classe active ao link correto
  document.querySelectorAll(`a[href="${targetId}"]`).forEach((link) => {
    link.classList.add("active");
    if (link.classList.contains("desktop-menu-link")) {
      link.classList.add("pulse-selection");
      setTimeout(() => {
        link.classList.remove("pulse-selection");
      }, 600);
    }
  });
}

// Função de inicialização
async function init() {
  try {
    // Configurar ano atual no footer
    const currentYearElement = document.getElementById("currentYear");
    if (currentYearElement) {
      currentYearElement.textContent = new Date().getFullYear().toString();
    }

    // Registrar visita
    await recordVisit();

    // Configurar navegação
    setupNavigation();

    // Carregar dados em paralelo
    await Promise.all([
      loadRepositoryData(),
      loadLanguages(),
      loadCommits(),
      loadIssues(),
      loadVisitStats(),
    ]);

    console.log("Inicialização concluída com sucesso");
  } catch (error) {
    console.error("Erro na inicialização:", error);
    showError("Erro ao carregar dados. Tente recarregar a página.");
  }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", init);
