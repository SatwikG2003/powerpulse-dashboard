// utils/parsePowerpulseData.js
export function parsePowerpulseData(iotData) {
  if (!iotData || !iotData.Powerpulse) return null;

  const { server_id, addr, name = "", data } = iotData.Powerpulse;
  if (!data) return null;

  const type =
    Number(server_id) === 1 ? "grid" :
    Number(server_id) === 2 ? "generator" :
    "unknown";
  if (type === "unknown") return null;

  // Clean and parse numeric data
  const cleaned = data.replace(/[\[\]]/g, "").trim();
  const values = cleaned.split(",").map(v => parseFloat(v) || 0);
  const lowerName = name.toLowerCase();

  // Initialize base structure
  const parsed = {
    type,
    voltage: { R: null, Y: null, B: null },
    current: { R: null, Y: null, B: null },
    activePower: { R: null, Y: null, B: null },
    avgVoltage: null,
    avgCurrent: null,
    avgActivePower: null,
    powerFactor: null,
    thd: null,
    timestamp: new Date(),
  };

  // ============================================================
  // ⚡ GRID METER
  // ============================================================
  if (type === "grid") {
    if (lowerName.includes("voltage1")) {
      parsed.voltage = { R: values[0], Y: values[1], B: values[2] };
    } else if (lowerName.includes("ryb_current")) {
      parsed.current = { R: values[0], Y: values[1], B: values[2] };
    } else if (lowerName.includes("avg_pf")) {
      parsed.powerFactor = values[0];
    } else if (lowerName.includes("ryb_activepower")) {
      parsed.activePower = { R: values[0], Y: values[1], B: values[2] };
    } else if (lowerName.includes("avg_voltage")) {
      // IoT provides pre-computed average voltage
      parsed.avgVoltage = values[0];
    } else if (lowerName.includes("avg_activepower")) {
      // IoT provides pre-computed average active power
      parsed.avgActivePower = values[0];
    }
  }

  // ============================================================
  // ⚡ GENERATOR METER
  // ============================================================
  else if (type === "generator") {
    if (lowerName === "voltage") {
      parsed.voltage = { R: values[0], Y: values[1], B: values[2] };
    } else if (lowerName.includes("avg_voltage")) {
      parsed.avgVoltage = values[0];
    } else if (lowerName.includes("ryb_current")) {
      parsed.current = { R: values[0], Y: values[1], B: values[2] };
    } else if (lowerName.includes("avg_pf")) {
      parsed.powerFactor = values[0];
    } else if (lowerName.includes("ryb_activepower")) {
      parsed.activePower = { R: values[0], Y: values[1], B: values[2] };
    } else if (lowerName.includes("avg_activepower")) {
      parsed.avgActivePower = values[0];
    }
  }

  // ============================================================
  // 🧮 AUTO-CALCULATE AVERAGES (only if IoT didn’t send them)
  // ============================================================
  if (!parsed.avgVoltage && Object.values(parsed.voltage).some(v => v !== null)) {
    parsed.avgVoltage = avg([parsed.voltage.R, parsed.voltage.Y, parsed.voltage.B]);
  }

  if (!parsed.avgActivePower && Object.values(parsed.activePower).some(v => v !== null)) {
    parsed.avgActivePower = avg([parsed.activePower.R, parsed.activePower.Y, parsed.activePower.B]);
  }

  if (Object.values(parsed.current).some(v => v !== null)) {
    parsed.avgCurrent = avg([parsed.current.R, parsed.current.Y, parsed.current.B]);
  }

  // ============================================================
  // ✅ Return parsed if valid
  // ============================================================
  const hasData =
    Object.values(parsed.voltage).some(v => v !== null) ||
    Object.values(parsed.current).some(v => v !== null) ||
    Object.values(parsed.activePower).some(v => v !== null) ||
    parsed.avgVoltage != null ||
    parsed.avgActivePower != null ||
    parsed.powerFactor != null;

  if (!hasData) {
    console.warn(`⚠️ Unrecognized entry ignored: ${name} (addr=${addr})`);
    return null;
  }

  return parsed;
}

// ============================================================
// Helper: Compute average safely
// ============================================================
function avg(arr) {
  const valid = arr.filter(v => typeof v === "number" && !isNaN(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}
