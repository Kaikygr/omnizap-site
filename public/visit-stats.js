let charts = {};

async function loadVisitStats() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  const statsContent = document.getElementById("statsContent");

  try {
    loadingIndicator.classList.remove("hidden");
    statsContent.classList.add("hidden");

    const response = await fetch("/api/visits/stats");
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Erro ao carregar estatísticas");
    }

    const stats = result.data;

    // Atualizar resumo geral
    updateSummary(stats.summary);

    // Atualizar gráficos e listas
    updateDeviceCharts(stats.devices);
    updateTimeCharts(stats.timeAnalysis);
    updateTrends(stats.trends);

    loadingIndicator.classList.add("hidden");
    statsContent.classList.remove("hidden");
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error);
    loadingIndicator.innerHTML = `
      <div class="text-red-600 dark:text-red-400">
        <p class="font-medium">Erro ao carregar estatísticas</p>
        <p class="text-sm">${error.message}</p>
        <button onclick="loadVisitStats()" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          Tentar Novamente
        </button>
      </div>
    `;
  }
}

function updateSummary(summary) {
  document.getElementById("totalVisits").textContent =
    summary.totalVisits.toLocaleString("pt-BR");
  document.getElementById("uniqueVisitors").textContent =
    summary.uniqueVisitors.toLocaleString("pt-BR");

  if (summary.firstVisit) {
    document.getElementById("firstVisit").textContent = new Date(
      summary.firstVisit
    ).toLocaleDateString("pt-BR");
  }

  if (summary.lastVisit) {
    document.getElementById("lastVisit").textContent = new Date(
      summary.lastVisit
    ).toLocaleDateString("pt-BR");
  }
}

function updateDeviceCharts(deviceData) {
  // Gráfico de tipos de dispositivo
  const deviceCtx = document.getElementById("deviceChart").getContext("2d");

  if (charts.device) {
    charts.device.destroy();
  }

  charts.device = new Chart(deviceCtx, {
    type: "doughnut",
    data: {
      labels: Object.keys(deviceData.deviceTypes).map((key) => {
        const labels = {
          mobile: "Mobile",
          desktop: "Desktop",
          tablet: "Tablet",
          bot: "Bot",
          unknown: "Desconhecido",
        };
        return labels[key] || key;
      }),
      datasets: [
        {
          data: Object.values(deviceData.deviceTypes),
          backgroundColor: [
            "#3B82F6", // blue
            "#10B981", // emerald
            "#F59E0B", // amber
            "#EF4444", // red
            "#6B7280", // gray
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });

  // Lista de navegadores
  const browserList = document.getElementById("browserList");
  browserList.innerHTML = "";

  Object.entries(deviceData.browsers).forEach(([browser, count]) => {
    const item = document.createElement("div");
    item.className =
      "flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-600 rounded";
    item.innerHTML = `
      <span class="font-medium">${browser}</span>
      <span class="text-blue-600 dark:text-blue-400">${count}</span>
    `;
    browserList.appendChild(item);
  });
}

function updateTimeCharts(timeData) {
  // Gráfico de acessos por hora
  const hourlyCtx = document.getElementById("hourlyChart").getContext("2d");

  if (charts.hourly) {
    charts.hourly.destroy();
  }

  charts.hourly = new Chart(hourlyCtx, {
    type: "line",
    data: {
      labels: Object.keys(timeData.hourly),
      datasets: [
        {
          label: "Acessos",
          data: Object.values(timeData.hourly),
          borderColor: "#3B82F6",
          backgroundColor: "#3B82F620",
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });

  // Gráfico de acessos por dia da semana
  const weekdayCtx = document.getElementById("weekdayChart").getContext("2d");

  if (charts.weekday) {
    charts.weekday.destroy();
  }

  charts.weekday = new Chart(weekdayCtx, {
    type: "bar",
    data: {
      labels: Object.keys(timeData.weekdays),
      datasets: [
        {
          label: "Acessos",
          data: Object.values(timeData.weekdays),
          backgroundColor: "#10B981",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

function updateTrends(trendsData) {
  // Últimas 24h
  document.getElementById("visits24h").textContent =
    `${trendsData.last24hours.totalVisits} visitas`;
  document.getElementById("unique24h").textContent =
    `${trendsData.last24hours.uniqueVisitors} únicos`;

  // Últimos 7 dias
  document.getElementById("visits7d").textContent =
    `${trendsData.last7days.totalVisits} visitas`;
  document.getElementById("unique7d").textContent =
    `${trendsData.last7days.uniqueVisitors} únicos`;

  // Últimos 30 dias
  document.getElementById("visits30d").textContent =
    `${trendsData.last30days.totalVisits} visitas`;
  document.getElementById("unique30d").textContent =
    `${trendsData.last30days.uniqueVisitors} únicos`;
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadVisitStats();

  document.getElementById("refreshStats").addEventListener("click", () => {
    loadVisitStats();
  });

  // Auto-refresh a cada 5 minutos
  setInterval(loadVisitStats, 5 * 60 * 1000);
});
