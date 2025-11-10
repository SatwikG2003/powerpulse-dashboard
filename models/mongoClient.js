import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import PowerData from './PowerData.js'; // Corrected path

dotenv.config();

let isConnected = false; // To track connection status

// ENV fallback (if needed)
const loadEnvVariables = () => {
    const envPath = ".env";
    
    if (fs.existsSync(envPath)) {
        const envData = fs.readFileSync(envPath, "utf-8");
        const lines = envData.split("\n");

        lines.forEach(line => {
            const [key, value] = line.split("=");
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    } else {
        console.warn("❌ .env file is missing. Ensure that the environment variables are set properly.");
    }
};

// Check for missing important environment variables
const checkEnvVariables = () => {
    if (!process.env.MONGO_URI) {
        console.error("❌ Missing MONGO_URI in environment variables!");
        process.exit(1); // Exit if required variables are not found
    }
};

// Load and validate environment variables
loadEnvVariables();
checkEnvVariables();

// Function to connect to MongoDB
export const connectDB = async () => {
    if (isConnected) {
        console.log("✅ Already connected to MongoDB");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        isConnected = true;
        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        process.exit(1); // Exit the process if connection fails
    }
};

// Function to insert data into PowerData collection
export const insertPowerData = async (data) => {
    try {
        const newPowerData = new PowerData(data);
        await newPowerData.save();

        console.log("✅ Power Data inserted successfully");

        const count = await PowerData.countDocuments({ _id: newPowerData._id });
        if (count > 0) {
            console.log("✅ Data exists in the collection");
        } else {
            console.log("❌ No data found in the collection");
        }
    } catch (error) {
        console.error("❌ Error inserting Power Data:", error);
    }
};

// Export mongoose and functions for use elsewhere
export { mongoose };
