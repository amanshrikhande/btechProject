import express from "express";
import {
  getAIHealth,
  analyzeCode,
  indexProjectFiles,
  getProjectIndexStatus,
  queryRAG,
  chatAssistant,
  debugCode,
  generateTests,
  generatePatch,
} from "../controllers/ai.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/health", getAIHealth);
router.get("/rag/status", optionalAuth, getProjectIndexStatus);
router.get("/rag/status/:projectId", optionalAuth, getProjectIndexStatus);
router.post("/analyze", optionalAuth, analyzeCode);
router.post("/rag/index", optionalAuth, indexProjectFiles);
router.post("/rag/query", optionalAuth, queryRAG);
router.post("/chat", optionalAuth, chatAssistant);
router.post("/debug", optionalAuth, debugCode);
router.post("/tests", optionalAuth, generateTests);
router.post("/patch", optionalAuth, generatePatch);

export default router;
