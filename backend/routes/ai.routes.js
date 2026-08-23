import express from "express";
import {
  getAIHealth,
  analyzeCode,
  indexProjectFiles,
  queryRAG,
  chatAssistant,
} from "../controllers/ai.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/health", getAIHealth);
router.post("/analyze", optionalAuth, analyzeCode);
router.post("/rag/index", optionalAuth, indexProjectFiles);
router.post("/rag/query", optionalAuth, queryRAG);
router.post("/chat", optionalAuth, chatAssistant);

export default router;
