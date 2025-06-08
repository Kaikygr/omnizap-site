const fs = require("fs").promises;
const path = require("path");

class VisitStatsProcessor {
  constructor(visitsFilePath) {
    this.visitsFilePath = visitsFilePath;
  }

  async loadVisitsData() {
    try {
      const data = await fs.readFile(this.visitsFilePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Erro ao carregar dados de visitas:", error);
      return { totalVisits: 0, visits: [] };
    }
  }

  // Função para obter localização aproximada por IP (simplificada)
  getLocationFromIP(ip) {
    // Remove prefixos IPv6
    const cleanIP = ip.replace(/^::ffff:/, "").replace(/^::1$/, "127.0.0.1");

    // IPs locais/desenvolvimento
    if (cleanIP === "127.0.0.1" || cleanIP === "localhost") {
      return {
        country: "Brasil",
        region: "Desenvolvimento Local",
        city: "Local",
      };
    }

    // Para IPs reais, você poderia integrar com serviços como:
    // - ipapi.co
    // - ip-api.com
    // - geoip-lite (biblioteca npm)

    // Por enquanto, retorna dados mock baseados no padrão do IP
    if (
      cleanIP.startsWith("192.168.") ||
      cleanIP.startsWith("10.") ||
      cleanIP.startsWith("172.")
    ) {
      return { country: "Brasil", region: "Rede Local", city: "Local" };
    }

    return {
      country: "Desconhecido",
      region: "Desconhecido",
      city: "Desconhecido",
    };
  }

  // Processar estatísticas de dispositivos
  processDeviceStats(visits) {
    const deviceStats = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
      bot: 0,
      unknown: 0,
    };

    const browserStats = {};
    const osStats = {};
    const platformStats = {};

    visits.forEach((visit) => {
      // Verificar se temos dados de userAgent estruturados
      let ua = visit.userAgent;

      // Se userAgent for string (dados antigos), tentar parsear
      if (typeof ua === "string") {
        ua = this.parseUserAgentFromString(ua);
      }

      // Se não temos dados estruturados, usar os campos diretos
      if (!ua || typeof ua === "string") {
        ua = {
          browser: visit.browser || "Desconhecido",
          os: visit.os || "Desconhecido",
          device: visit.device || "unknown",
          isMobile: visit.device === "mobile",
          isDesktop: visit.device === "desktop",
          isTablet: visit.device === "tablet",
          isBot: visit.device === "bot",
        };
      }

      // Contagem por tipo de dispositivo
      const deviceType = ua.device || "unknown";
      if (deviceStats.hasOwnProperty(deviceType)) {
        deviceStats[deviceType]++;
      } else {
        deviceStats.unknown++;
      }

      // Estatísticas de browser
      const browser = ua.browser || "Desconhecido";
      browserStats[browser] = (browserStats[browser] || 0) + 1;

      // Estatísticas de OS
      const os = ua.os || "Desconhecido";
      osStats[os] = (osStats[os] || 0) + 1;

      // Estatísticas de plataforma
      const platform = ua.platform || ua.os || "Desconhecido";
      platformStats[platform] = (platformStats[platform] || 0) + 1;
    });

    return {
      deviceTypes: deviceStats,
      browsers: this.sortAndLimitStats(browserStats, 10),
      operatingSystems: this.sortAndLimitStats(osStats, 10),
      platforms: this.sortAndLimitStats(platformStats, 10),
    };
  }

  // Função auxiliar para parsear User Agent de strings antigas
  parseUserAgentFromString(userAgentString) {
    const ua = userAgentString || "";

    // Detectar browser
    let browser = "Desconhecido";
    if (ua.includes("Chrome") && !ua.includes("Edge")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome"))
      browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";
    else if (ua.includes("Opera")) browser = "Opera";

    // Detectar OS
    let os = "Desconhecido";
    if (ua.includes("Windows NT")) os = "Windows";
    else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    // Detectar tipo de dispositivo
    let device = "desktop";

    // Detectar bots
    if (
      ua.toLowerCase().includes("bot") ||
      ua.toLowerCase().includes("crawler") ||
      ua.toLowerCase().includes("spider")
    ) {
      device = "bot";
    }
    // Detectar mobile
    else if (
      ua.includes("Mobile") ||
      ua.includes("iPhone") ||
      ua.includes("Android")
    ) {
      device = "mobile";
    }
    // Detectar tablet
    else if (ua.includes("Tablet") || ua.includes("iPad")) {
      device = "tablet";
    }

    return {
      browser,
      os,
      device,
      isMobile: device === "mobile",
      isDesktop: device === "desktop",
      isTablet: device === "tablet",
      isBot: device === "bot",
      platform: os,
    };
  }

  // Processar estatísticas geográficas
  processLocationStats(visits) {
    const countryStats = {};
    const regionStats = {};
    const cityStats = {};
    const ipStats = {};

    visits.forEach((visit) => {
      const location = this.getLocationFromIP(visit.ip);

      // Contagem por país
      countryStats[location.country] =
        (countryStats[location.country] || 0) + 1;

      // Contagem por região
      regionStats[location.region] = (regionStats[location.region] || 0) + 1;

      // Contagem por cidade
      cityStats[location.city] = (cityStats[location.city] || 0) + 1;

      // Contagem por IP (para identificar acessos repetidos)
      ipStats[visit.ip] = (ipStats[visit.ip] || 0) + 1;
    });

    return {
      countries: this.sortAndLimitStats(countryStats, 10),
      regions: this.sortAndLimitStats(regionStats, 10),
      cities: this.sortAndLimitStats(cityStats, 10),
      topIPs: this.sortAndLimitStats(ipStats, 5),
    };
  }

  // Processar estatísticas temporais
  processTimeStats(visits) {
    const hourlyStats = Array(24).fill(0);
    const dailyStats = {};
    const monthlyStats = {};
    const weekdayStats = Array(7).fill(0);

    const weekdayNames = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];

    visits.forEach((visit) => {
      const date = new Date(visit.timestamp);

      // Estatísticas por hora
      hourlyStats[date.getHours()]++;

      // Estatísticas por dia
      const dayKey = date.toISOString().split("T")[0];
      dailyStats[dayKey] = (dailyStats[dayKey] || 0) + 1;

      // Estatísticas por mês
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;

      // Estatísticas por dia da semana
      weekdayStats[date.getDay()]++;
    });

    // Converter arrays em objetos para melhor legibilidade
    const hourlyStatsObj = {};
    hourlyStats.forEach((count, hour) => {
      hourlyStatsObj[`${hour}:00`] = count;
    });

    const weekdayStatsObj = {};
    weekdayStats.forEach((count, day) => {
      weekdayStatsObj[weekdayNames[day]] = count;
    });

    return {
      hourly: hourlyStatsObj,
      daily: this.sortStatsByKey(dailyStats),
      monthly: this.sortStatsByKey(monthlyStats),
      weekdays: weekdayStatsObj,
    };
  }

  // Processar estatísticas de tendências
  processTrendStats(visits) {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const visitsLast24h = visits.filter(
      (v) => new Date(v.timestamp) >= last24h
    );
    const visitsLast7days = visits.filter(
      (v) => new Date(v.timestamp) >= last7days
    );
    const visitsLast30days = visits.filter(
      (v) => new Date(v.timestamp) >= last30days
    );

    // Calcular visitantes únicos por IP
    const uniqueIPs24h = new Set(visitsLast24h.map((v) => v.ip)).size;
    const uniqueIPs7days = new Set(visitsLast7days.map((v) => v.ip)).size;
    const uniqueIPs30days = new Set(visitsLast30days.map((v) => v.ip)).size;

    return {
      last24hours: {
        totalVisits: visitsLast24h.length,
        uniqueVisitors: uniqueIPs24h,
        averageVisitsPerHour: (visitsLast24h.length / 24).toFixed(1),
      },
      last7days: {
        totalVisits: visitsLast7days.length,
        uniqueVisitors: uniqueIPs7days,
        averageVisitsPerDay: (visitsLast7days.length / 7).toFixed(1),
      },
      last30days: {
        totalVisits: visitsLast30days.length,
        uniqueVisitors: uniqueIPs30days,
        averageVisitsPerDay: (visitsLast30days.length / 30).toFixed(1),
      },
    };
  }

  // Função auxiliar para ordenar e limitar estatísticas
  sortAndLimitStats(stats, limit = 10) {
    return Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  }

  // Função auxiliar para ordenar estatísticas por chave
  sortStatsByKey(stats) {
    return Object.keys(stats)
      .sort()
      .reduce((obj, key) => {
        obj[key] = stats[key];
        return obj;
      }, {});
  }

  // Função principal para processar todas as estatísticas
  async processAllStats() {
    try {
      const visitsData = await this.loadVisitsData();
      const visits = visitsData.visits || [];

      if (visits.length === 0) {
        return {
          summary: {
            totalVisits: 0,
            uniqueVisitors: 0,
            firstVisit: null,
            lastVisit: null,
          },
          devices: {
            deviceTypes: {},
            browsers: {},
            operatingSystems: {},
            platforms: {},
          },
          locations: { countries: {}, regions: {}, cities: {}, topIPs: {} },
          timeAnalysis: { hourly: {}, daily: {}, monthly: {}, weekdays: {} },
          trends: { last24hours: {}, last7days: {}, last30days: {} },
        };
      }

      // Calcular total real de visitas (todas as entradas)
      const totalVisits = visits.length;

      // Calcular visitantes únicos por IP normalizado
      const uniqueIPsSet = new Set();
      visits.forEach((visit) => {
        if (visit.ip) {
          // Normalizar IPs para contagem consistente
          const normalizedIP = visit.ip
            .replace(/^::ffff:/, "")
            .replace(/^::1$/, "127.0.0.1");
          uniqueIPsSet.add(normalizedIP);
        }
      });
      const uniqueVisitors = uniqueIPsSet.size;

      // Datas de primeiro e último acesso
      const timestamps = visits.map((v) => new Date(v.timestamp));
      const firstVisit = new Date(Math.min(...timestamps));
      const lastVisit = new Date(Math.max(...timestamps));

      return {
        summary: {
          totalVisits, // Total real de todas as visitas
          uniqueVisitors, // Visitantes únicos por IP
          firstVisit: firstVisit.toISOString(),
          lastVisit: lastVisit.toISOString(),
          generatedAt: new Date().toISOString(),
        },
        devices: this.processDeviceStats(visits),
        locations: this.processLocationStats(visits),
        timeAnalysis: this.processTimeStats(visits),
        trends: this.processTrendStats(visits),
      };
    } catch (error) {
      console.error("Erro ao processar estatísticas:", error);
      throw error;
    }
  }
}

module.exports = VisitStatsProcessor;
