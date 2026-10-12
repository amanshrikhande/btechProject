import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devshare",
  jwtSecret: process.env.JWT_SECRET || "devshare_jwt_super_secret_key_2025_secure",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8000",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || "devshare_internal_rag_secret_key_2025",
};
