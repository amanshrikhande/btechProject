import mongoose from "mongoose";
import { config } from "./config.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB Connected] Host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error] ${error.message}`);
    // Non-fatal fallback for development if MongoDB is starting up
    console.warn("Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};
