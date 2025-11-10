document.addEventListener("DOMContentLoaded", () => {
  /* 🌗 --- DARK / LIGHT MODE --- */
  const themeToggle = document.getElementById("themeToggle");
  const body = document.body;
  const savedTheme = localStorage.getItem("theme") || "dark";

  // Always set the theme explicitly
  body.setAttribute("data-theme", savedTheme);
  themeToggle.textContent = savedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

  themeToggle.addEventListener("click", () => {
    const currentTheme = body.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeToggle.textContent = newTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

    // 🔄 Update chart colors dynamically
    Object.values(chartConfigs).forEach((chart) => {
      const textColor = newTheme === "dark" ? "#fff" : "#1e293b";
      chart.options.plugins.legend.labels.color = textColor;
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.y.ticks.color = textColor;
      chart.update();
    });
  });

  /* ⚙️ --- INITIALIZE DATA STRUCTURE --- */
  const meters = {
    grid: {
      voltage: { labels: [], R: [], Y: [], B: [] },
      current: { labels: [], R: [], Y: [], B: [] },
    },
    generator: {
      voltage: { labels: [], R: [], Y: [], B: [] },
      current: { labels: [], R: [], Y: [], B: [] },
    },
  };

  /* 🔗 --- WEBSOCKET CONNECTION --- */
  const ws = new WebSocket("ws://localhost:8082");
  const connectionStatus = document.getElementById("connectionStatus");

  ws.onopen = () => {
    console.log("✅ WebSocket Connected");
    connectionStatus.textContent = "Connected";
    connectionStatus.style.background = "green";
    connectionStatus.style.boxShadow = "0 0 10px #00ff00a8";
  };

  ws.onclose = () => {
    console.warn("❌ WebSocket Disconnected");
    connectionStatus.textContent = "Disconnected";
    connectionStatus.style.background = "red";
    connectionStatus.style.boxShadow = "0 0 10px #ff0000a8";
  };

  /* 📊 --- CHART INITIALIZATION --- */
  const chartConfigs = {};
  ["grid", "generator"].forEach((type) => {
    const voltageDatasets = [
      { label: "R Phase (V)", data: [], borderColor: "red", fill: false },
      { label: "Y Phase (V)", data: [], borderColor: "orange", fill: false },
      { label: "B Phase (V)", data: [], borderColor: "blue", fill: false },
    ];

    chartConfigs[`${type}VoltageChart`] = new Chart(
      document.getElementById(`${type}VoltageChart`),
      {
        type: "line",
        data: { labels: [], datasets: voltageDatasets },
        options: chartOptions(),
      }
    );

    chartConfigs[`${type}CurrentChart`] = new Chart(
      document.getElementById(`${type}CurrentChart`),
      {
        type: "line",
        data: {
          labels: [],
          datasets: [
            { label: "R Phase (A)", data: [], borderColor: "red", fill: false },
            { label: "Y Phase (A)", data: [], borderColor: "orange", fill: false },
            { label: "B Phase (A)", data: [], borderColor: "blue", fill: false },
          ],
        },
        options: chartOptions(),
      }
    );
  });

  function chartOptions() {
    const isDark = body.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#fff" : "#1e293b";
    return {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: textColor } },
      },
      scales: {
        x: { ticks: { color: textColor } },
        y: { ticks: { color: textColor } },
      },
    };
  }

  /* 🧠 --- HANDLE WEBSOCKET MESSAGES --- */
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type !== "iot" || !msg.data) return;

      const parsed = msg.data;
      const { type, timestamp, ...sensor } = parsed;
      if (!["grid", "generator"].includes(type)) return;

      const ts = new Date(timestamp || Date.now()).toLocaleTimeString();

      console.log("📊 Dashboard Data Received:", sensor);

      updateDOM(type, sensor);

      // Update Charts
      if (sensor.voltage)
        updateMultiPhaseChart(chartConfigs[`${type}VoltageChart`], ts, sensor.voltage);
      if (sensor.current)
        updateMultiPhaseChart(chartConfigs[`${type}CurrentChart`], ts, sensor.current);
    } catch (err) {
      console.error("❌ Data parse error:", err);
    }
  };

  /* 🖥️ --- DOM UPDATES --- */
  function updateDOM(type, sensor) {
    const voltage = sensor.voltage || {};
    const current = sensor.current || {};
    const pf = sensor.powerFactor ?? null;
    const thd = sensor.thd ?? null;
    const ap = sensor.activePower ?? null;
    const avgV = sensor.avgVoltage ?? null;
    const avgAP = sensor.avgActivePower ?? null;

    const flashCard = (id) => {
      const elem = document.getElementById(id);
      if (!elem) return;
      elem.parentElement.classList.add("flash");
      setTimeout(() => elem.parentElement.classList.remove("flash"), 400);
    };

    const voltageElem = document.getElementById(`${type}Voltage`);
    if (voltage?.R != null && voltage?.Y != null && voltage?.B != null) {
      voltageElem.textContent = `R: ${(voltage.R ?? 0).toFixed(2)}V | Y: ${(voltage.Y ?? 0).toFixed(
        2
      )}V | B: ${(voltage.B ?? 0).toFixed(2)}V`;
      flashCard(`${type}Voltage`);
    } else {
      voltageElem.textContent = "-";
    }

    if (avgV != null && document.getElementById(`${type}AvgVoltage`)) {
      document.getElementById(`${type}AvgVoltage`).textContent = `${avgV.toFixed(2)} V`;
      flashCard(`${type}AvgVoltage`);
    }

    const currentElem = document.getElementById(`${type}Current`);
    if (current?.R != null && current?.Y != null && current?.B != null) {
      currentElem.textContent = `R: ${(current.R ?? 0).toFixed(2)}A | Y: ${(current.Y ?? 0).toFixed(
        2
      )}A | B: ${(current.B ?? 0).toFixed(2)}A`;
      flashCard(`${type}Current`);
    } else {
      currentElem.textContent = "-";
    }

    document.getElementById(`${type}PowerFactor`).textContent = pf != null ? pf.toFixed(3) : "-";
    document.getElementById(`${type}THD`).textContent = thd != null ? `${thd.toFixed(2)}%` : "-";

    const apElem = document.getElementById(`${type}ActivePower`);
    if (ap && typeof ap === "object") {
      const avg = ((ap.R ?? 0) + (ap.Y ?? 0) + (ap.B ?? 0)) / 3;
      apElem.textContent = `R: ${(ap.R ?? 0).toFixed(2)}W | Y: ${(ap.Y ?? 0).toFixed(
        2
      )}W | B: ${(ap.B ?? 0).toFixed(2)}W | Avg: ${avg.toFixed(2)}W`;
      flashCard(`${type}ActivePower`);
    } else {
      apElem.textContent = "-";
    }

    if (avgAP != null && document.getElementById(`${type}AvgActivePower`)) {
      document.getElementById(`${type}AvgActivePower`).textContent = `${avgAP.toFixed(2)} W`;
      flashCard(`${type}AvgActivePower`);
    }
  }

  /* 📈 --- CHART HELPERS --- */
  function updateMultiPhaseChart(chart, label, newValues) {
    if (chart.data.labels.length >= 20) chart.data.labels.shift();
    chart.data.labels.push(label);

    const phases = ["R", "Y", "B"];
    phases.forEach((phase, i) => {
      const dataset = chart.data.datasets[i];
      if (dataset) {
        if (dataset.data.length >= 20) dataset.data.shift();
        dataset.data.push(newValues[phase] ?? 0);
      }
    });

    chart.update("none");
  }

  /* 🧱 --- SIDEBAR TOGGLE (Old Logic Integrated) --- */
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  const toggleSidebarBtn = document.getElementById("toggleSidebar");

  function toggleSidebar() {
    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("expanded");
    toggleSidebarBtn.classList.toggle("rotated");
    localStorage.setItem("sidebarCollapsed", sidebar.classList.contains("collapsed"));
  }

  toggleSidebarBtn.addEventListener("click", toggleSidebar);

  // Restore saved sidebar state
  const isSidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (isSidebarCollapsed) {
    sidebar.classList.add("collapsed");
    mainContent.classList.add("expanded");
    toggleSidebarBtn.classList.add("rotated");
  }

  // Auto close sidebar on small screens when clicking outside
  document.addEventListener("click", (event) => {
    const isClickInside = sidebar.contains(event.target) || toggleSidebarBtn.contains(event.target);
    if (!isClickInside && window.innerWidth <= 768) {
      sidebar.classList.add("collapsed");
      mainContent.classList.add("expanded");
      toggleSidebarBtn.classList.add("rotated");
      localStorage.setItem("sidebarCollapsed", true);
    }
  });

  // Handle responsiveness
  function handleResponsiveSidebar() {
    if (window.innerWidth < 1024) {
      sidebar.classList.add("collapsed");
      mainContent.classList.add("expanded");
    } else if (!isSidebarCollapsed) {
      sidebar.classList.remove("collapsed");
      mainContent.classList.remove("expanded");
    }
  }

  window.addEventListener("resize", handleResponsiveSidebar);
  handleResponsiveSidebar();
});
