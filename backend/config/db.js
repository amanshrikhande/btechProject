import mongoose from "mongoose";
import { config } from "./config.js";

let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[✓ MongoDB Connected] Host: ${conn.connection.host}`);
    connectionAttempts = 0;
    return conn;
  } catch (error) {
    connectionAttempts++;
    console.error(`[✗ MongoDB Connection Error] ${error.message}`);

    if (connectionAttempts < MAX_ATTEMPTS) {
      console.warn(`[⏳ Retrying MongoDB connection... (${connectionAttempts}/${MAX_ATTEMPTS})]`);
      setTimeout(connectDB, 5000);
    } else {
      console.warn(`[⚠️ MongoDB unavailable - Running in DEMO MODE]`);
      console.warn(`[💡 To use full features, start MongoDB:`);
      console.warn(`   - Option 1: docker-compose up`);
      console.warn(`   - Option 2: mongod (local)`);
      console.warn(`   - Option 3: MongoDB Atlas cloud]\n`);
    }
  }
};
