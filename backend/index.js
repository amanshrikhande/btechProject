import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";
import { config } from "./config/config.js";
import { connectDB } from "./config/db.js";
import { setupSockets } from "./sockets/socketManager.js";
import { errorHandler } from "./middleware/error.middleware.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import fileRoutes from "./routes/file.routes.js";
import versionRoutes from "./routes/version.routes.js";
import executionRoutes from "./routes/execution.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// CORS configuration
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupSockets(io);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/files", fileRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/files", versionRoutes);
app.use("/api/execution", executionRoutes);
app.use("/api/ai", aiRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "DevShare Collaborative Workspace",
    version: "2.0.0",
    timestamp: new Date(),
  });
});

// Serve frontend static assets in production
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "/frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

// Global Error Handler
app.use(errorHandler);

const port = config.port;

server.listen(port, () => {
  console.log(`[DevShare Server] Running on http://localhost:${port} in ${config.nodeEnv} mode`);
});