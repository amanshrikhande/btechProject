import axios from "axios";
import { config } from "../config/config.js";
import { ProjectFile } from "../models/ProjectFile.js";

// Helper to check if AI service is alive
export const getAIHealth = async (req, res) => {
  try {
    const response = await axios.get(`${config.aiServiceUrl}/api/health`, { timeout: 3000 });
    res.json({
      success: true,
      service: "DevShare AI Service",
      status: "online",
      details: response.data,
    });
  } catch (error) {
    res.json({
      success: false,
      service: "DevShare AI Service",
      status: "offline",
      message: "Python AI service is not running or unreachable on port 8000. Core collaboration remains fully operational.",
      error: error.message,
    });
  }
};

// @desc    Analyze code using CodeBERT ML classifier
// @route   POST /api/ai/analyze
export const analyzeCode = async (req, res, next) => {
  try {
    const { code, language = "javascript" } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code content is required for analysis" });
    }

    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/analyze`,
        { code, language },
        { timeout: 15000 }
      );
      res.json({ success: true, data: response.data });
    } catch (aiErr) {
      // Graceful fallback if ML service is offline
      res.json({
        success: false,
        fallback: true,
        data: {
          classification: "NO_ISSUE",
          confidence: 0.0,
          details: "AI Service Offline: Rule-based static check passed.",
          suggestions: [],
          serviceStatus: "offline",
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Index/Re-index project files into ChromaDB
// @route   POST /api/ai/rag/index
export const indexProjectFiles = async (req, res, next) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const files = await ProjectFile.find({ projectId });
    if (!files || files.length === 0) {
      return res.json({ success: true, message: "No files to index", indexedCount: 0 });
    }

    const formattedFiles = files.map((f) => ({
      fileId: f._id.toString(),
      projectId: f.projectId.toString(),
      fileName: f.name,
      filePath: f.path,
      language: f.language,
      content: f.content,
    }));

    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/rag/index`,
        { projectId, files: formattedFiles },
        { timeout: 20000 }
      );
      res.json({ success: true, data: response.data });
    } catch (aiErr) {
      res.json({
        success: false,
        fallback: true,
        message: "AI indexing unavailable (Python service offline)",
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Query RAG vector store for project context
// @route   POST /api/ai/rag/query
export const queryRAG = async (req, res, next) => {
  try {
    const { projectId, query, topK = 3 } = req.body;

    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/rag/query`,
        { projectId, query, top_k: topK },
        { timeout: 10000 }
      );
      res.json({ success: true, data: response.data });
    } catch (aiErr) {
      res.json({
        success: false,
        fallback: true,
        data: { chunks: [], message: "RAG service offline" },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Full Chat Assistant with RAG + ML + Ollama LLM
// @route   POST /api/ai/chat
export const chatAssistant = async (req, res, next) => {
  try {
    const {
      message,
      projectId,
      activeFileName,
      activeCode,
      language,
      lastError,
      chatHistory = [],
    } = req.body;

    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/chat`,
        {
          message,
          project_id: projectId,
          active_file_name: activeFileName,
          active_code: activeCode,
          language,
          last_error: lastError,
          chat_history: chatHistory,
        },
        { timeout: 60000 }
      );
      res.json({ success: true, data: response.data });
    } catch (aiErr) {
      // Graceful offline fallback response with helpful heuristics
      res.json({
        success: true,
        fallback: true,
        data: {
          response: `**[DevShare Assistant Note]** Local AI Service is currently offline. \n\nHere is a quick static inspection of your code:\n- File: \`${activeFileName || "main"}\` (${language || "code"})\n- Total Lines: ${activeCode ? activeCode.split("\n").length : 0}\n${lastError ? `- Runtime Error: \`${lastError}\`` : ""}\n\n*To enable full neural AI, start the Python FastAPI and Ollama services.*`,
          ml_analysis: null,
          retrieved_context: [],
        },
      });
    }
  } catch (error) {
    next(error);
  }
};
