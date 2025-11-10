// services/eventHubService.js
import { EventHubConsumerClient } from "@azure/event-hubs";
import { parsePowerpulseData } from "../utils/parsePowerpulseData.js";
import GridData from "../models/GridData.js";
import GeneratorData from "../models/GeneratorData.js";
import { broadcastToClients } from "../websocket/websocketServer.js";

const latestDataCache = { grid: {}, generator: {} };
let iotClient = null;

/**
 * Initialize Event Hub connection
 */
export function initEventHub(connectionString, eventHubName) {
  if (!connectionString || !eventHubName) {
    console.warn("⚠️ Missing Event Hub credentials in .env");
    return;
  }

  try {
    iotClient = new EventHubConsumerClient("$Default", connectionString, eventHubName);
    console.log("✅ Connected to Azure Event Hub for IoT data");
  } catch (error) {
    console.error("❌ Failed to connect to Event Hub:", error.message);
  }
}

/**
 * Save parsed data to MongoDB
 */
async function saveParsedData(parsed) {
  if (!parsed || parsed.type === "unknown") return;
  const { type } = parsed;
  const Model = type === "grid" ? GridData : GeneratorData;
  const cache = latestDataCache[type];

  Object.assign(cache, parsed);

  if (cache.voltage && cache.current && cache.powerFactor != null) {
    const combinedData = { ...cache, timestamp: new Date(), type };

    try {
      const doc = new Model(combinedData);
      await doc.save();
      console.log(`✅ Combined ${type} data saved:`, combinedData);

      broadcastToClients({ type: "iot", data: combinedData });
      latestDataCache[type] = {};
    } catch (err) {
      console.error(`❌ Failed to save ${type} data:`, err.message);
    }
  }
}

/**
 * Start streaming IoT data from Event Hub
 */
export async function startIoTStreaming() {
  if (!iotClient) {
    console.warn("⚠️ No Event Hub connection found.");
    return;
  }

  try {
    iotClient.subscribe({
      processEvents: async (events, context) => {
        for (const event of events) {
          const raw = event.body;
          if (!raw) continue;

          console.log("📡 IoT Data Received (Raw):", raw);
          const parsed = parsePowerpulseData(raw);
          if (!parsed) continue;

          broadcastToClients({ type: "iot", data: parsed });
          await saveParsedData(parsed);
        }
      },
      processError: async (error) => {
        console.error("❌ IoT Hub Error:", error.message);
      },
    });

    console.log("🚀 IoT Hub Data Streaming Started");
  } catch (error) {
    console.error("❌ Error in IoT Hub Streaming:", error.message);
  }
}
