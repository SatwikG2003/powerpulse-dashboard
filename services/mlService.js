// services/mlService.js
import axios from "axios";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8083";

/**
 * Send data to Flask ML API for anomaly/prediction analysis
 */
export async function getMLPrediction(data) {
  try {
    const response = await axios.post(`${ML_API_URL}/predict`, {
      voltage_R: data.voltage?.R || 0,
      voltage_Y: data.voltage?.Y || 0,
      voltage_B: data.voltage?.B || 0,
      current_R: data.current?.R || 0,
      current_Y: data.current?.Y || 0,
      current_B: data.current?.B || 0,
      activePower: data.avgActivePower || data.activePower || 0,
      powerFactor: data.powerFactor || 1,
      thd: data.thd || 0,
    });

    console.log("🧠 ML Prediction Response:", response.data);
    return response.data;
  } catch (err) {
    console.error("⚠️ ML Prediction Error:", err.message);
    return { is_anomaly: null, predicted_activePower: null };
  }
}

/**
 * Send data to Flask ML API for THD anomaly detection
 */
export async function checkTHDAnomaly(data) {
  try {
    const response = await axios.post(`${ML_API_URL}/detect_thd`, {
      thd: data.thd || 0,
      voltage_R: data.voltage?.R || 0,
      voltage_Y: data.voltage?.Y || 0,
      voltage_B: data.voltage?.B || 0,
    });

    console.log("📈 THD Detection Response:", response.data);
    return response.data;
  } catch (err) {
    console.error("⚠️ THD Anomaly Detection Error:", err.message);
    return { is_thd_anomaly: false, threshold_violation: false, message: "Error" };
  }
}
