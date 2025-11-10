// server.js
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";

dotenv.config();

import { initWebSocketServer } from "./websocket/websocketServer.js";
import { initEventHub, startIoTStreaming } from "./services/eventHubService.js";
import { getMLPrediction, checkTHDAnomaly } from "./services/mlService.js";
import GridData from "./models/GridData.js";
import GeneratorData from "./models/GeneratorData.js";

const PORT = 8082;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// ✅ Initialize WebSocket
initWebSocketServer(server);

// ✅ MongoDB Connection
if (!process.env.MONGO_URI) {
  const envData = fs.readFileSync(".env", "utf-8");
  for (const line of envData.split("\n")) {
    const [key, value] = line.split("=");
    if (key && value) process.env[key.trim()] = value.trim();
  }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Initialize Azure Event Hub
const connectionString = process.env.EVENT_HUB_CONNECTION_STRING;
const eventHubName = process.env.EVENT_HUB_NAME;
initEventHub(connectionString, eventHubName);
startIoTStreaming();

// ✅ Optional route to test ML API
app.post("/api/test-ml", express.json(), async (req, res) => {
  try {
    const mlResult = await getMLPrediction(req.body);
    const thdResult = await checkTHDAnomaly(req.body);
    res.json({ mlResult, thdResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ REST APIs
app.get("/api/grid-data", async (req, res) => {
  try {
    const data = await GridData.find().sort({ timestamp: -1 }).limit(100);
    res.json(data);
  } catch {
    res.status(500).json({ message: "Error fetching grid data" });
  }
});

app.get("/api/generator-data", async (req, res) => {
  try {
    const data = await GeneratorData.find().sort({ timestamp: -1 }).limit(100);
    res.json(data);
  } catch {
    res.status(500).json({ message: "Error fetching generator data" });
  }
});

// ✅ Static Files
app.use("/public", express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/html/index.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public/html/dashboard.html")));
app.get("/stored-data", (req, res) => res.sendFile(path.join(__dirname, "public/html/stored-data.html")));
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ✅ Start Server
server.listen(PORT, () => console.log(`🚀 WebSocket Server running at http://localhost:${PORT}`));
