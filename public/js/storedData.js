async function loadTable(url, id) {
  const res = await fetch(url);
  const data = await res.json();
  const tbody = document.querySelector(`#${id} tbody`);
  tbody.innerHTML = "";

  data.forEach((d) => {
    const tr = document.createElement("tr");
    const formatPhase = (p) => p ? `${p.R || 0}, ${p.Y || 0}, ${p.B || 0}` : "-";
    tr.innerHTML = `
      <td>${new Date(d.timestamp).toLocaleString()}</td>
      <td>${formatPhase(d.voltage)}</td>
      <td>${formatPhase(d.current)}</td>
      <td>${d.powerFactor ?? "-"}</td>
      <td>${d.thd ?? "-"}</td>
      <td>${d.activePower ?? "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadTable("/api/grid-data", "gridTable");
loadTable("/api/generator-data", "generatorTable");
