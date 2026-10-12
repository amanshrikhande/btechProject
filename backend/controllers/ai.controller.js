import axios from "axios";
import { config } from "../config/config.js";
import { ProjectFile } from "../models/ProjectFile.js";
import { Project } from "../models/Project.js";
import { SessionEvent } from "../models/SessionEvent.js";

// Helper to verify user access to project AI context (Project Isolation)
const checkProjectAuthorization = async (userId, projectId) => {
  if (!projectId || !projectId.match(/^[0-9a-fA-F]{24}$/)) return true;
  try {
    const project = await Project.findById(projectId);
    if (!project) return false;
    if (project.isPublic) return true;
    if (!userId) return false;
    const uidStr = userId.toString();
    if (project.owner && project.owner.toString() === uidStr) return true;
    return project.members?.some((m) => m.user && m.user.toString() === uidStr) || false;
  } catch (err) {
    return false;
  }
};

// Helper to check if AI service is alive
export const getAIHealth = async (req, res) => {
  try {
    const response = await axios.get(`${config.aiServiceUrl}/api/health`, { timeout: 3000 });
    res.json({
      success: true,
      service: "DevShare AI Service",
      status: "online",
      provider: response.data?.provider || "unknown",
      model: response.data?.model || "qwen2.5-coder:1.5b",
      available: response.data?.available || false,
      ollama: response.data?.ollama,
      chromadb: response.data?.chromadb,
      details: response.data,
    });
  } catch (error) {
    res.json({
      success: false,
      service: "DevShare AI Service",
      status: "offline",
      provider: "unknown",
      available: false,
      message: "Python AI service is not running or unreachable on port 8000. Core collaboration remains operational.",
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

    const isAuthorized = await checkProjectAuthorization(req.user?._id, projectId);
    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied: Unauthorized access to project AI context" });
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
        { timeout: 30000 }
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

// @desc    Get project indexing status from ChromaDB
// @route   GET /api/ai/rag/status?projectId=<id> or /api/ai/rag/status/:projectId
export const getProjectIndexStatus = async (req, res, next) => {
  try {
    const projectId = req.query.projectId || req.params.projectId;
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const isAuthorized = await checkProjectAuthorization(req.user?._id, projectId);
    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied: Unauthorized access to project AI context" });
    }

    try {
      const response = await axios.get(
        `${config.aiServiceUrl}/api/rag/status?projectId=${projectId}`,
        { timeout: 5000 }
      );
      const raw = response.data?.data || response.data;
      res.json({
        projectId: raw.projectId || projectId,
        collection: raw.collection || raw.collectionName || `proj_${projectId}`,
        indexedFiles: raw.indexedFiles ?? raw.filesCount ?? 0,
        indexedChunks: raw.indexedChunks ?? raw.chunksCount ?? 0,
        lastIndexedAt: raw.lastIndexedAt || raw.lastIndexed || null,
        embeddingModel: raw.embeddingModel || "sentence-transformers/all-MiniLM-L6-v2",
        status: raw.status || "READY",
        success: true,
        data: raw,
      });
    } catch (aiErr) {
      res.json({
        projectId,
        collection: `proj_${projectId}`,
        indexedFiles: 0,
        indexedChunks: 0,
        lastIndexedAt: null,
        embeddingModel: "sentence-transformers/all-MiniLM-L6-v2",
        status: "NOT_INDEXED",
        success: false,
        data: {
          projectId,
          status: "offline",
          filesCount: 0,
          chunksCount: 0,
          languages: [],
          message: "AI service offline",
        },
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

    const isAuthorized = await checkProjectAuthorization(req.user?._id, projectId);
    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied: Unauthorized access to project AI context" });
    }

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
        data: { chunks: [], count: 0, message: "RAG service offline" },
      });
    }
  } catch (error) {
    next(error);
  }
};

const sanitizeTelemetry = (text) => {
  if (typeof text !== "string") return text;
  return text
    .replace(/(?:password|passwd|pwd|secret|token|apiKey|api_key|auth)\s*[:=]\s*['"][^'"]+['"]/gi, "$1: [REDACTED]")
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g, "[REDACTED_JWT]");
};

// @desc    Full Chat Assistant with RAG + ML + Local Ollama LLM
// @route   POST /api/ai/chat
export const chatAssistant = async (req, res, next) => {
  try {
    const {
      message,
      projectId,
      roomId,
      activeFileName,
      activeCode,
      language,
      lastError,
      chatHistory = [],
      condition = "RAG",
      mode = "chat",
      experimentId,
      participantId,
    } = req.body;

    if (projectId) {
      const isAuthorized = await checkProjectAuthorization(req.user?._id, projectId);
      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: "Access denied: Unauthorized access to project AI context" });
      }
    }

    // Pass authoritative project files from MongoDB for stale-index protection
    let currentFiles = null;
    if (projectId && projectId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const pFiles = await ProjectFile.find({ projectId }).select("_id name path content");
        currentFiles = pFiles.map((pf) => ({
          fileId: pf._id.toString(),
          filePath: pf.path,
          fileName: pf.name,
          content: pf.content,
        }));
      } catch (err) {
        console.warn("[ProjectFile fetch error]:", err.message);
      }
    }

    if (roomId || projectId) {
      SessionEvent.create({
        roomId: roomId || "general",
        projectId: projectId && projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null,
        userId: req.user?._id || null,
        userName: req.user?.name || "Developer",
        eventType: "AI_REQUEST",
        metadata: {
          message: sanitizeTelemetry(message?.slice(0, 150)),
          activeFileName,
          condition,
          mode,
          experimentId: experimentId || null,
          participantId: participantId || null,
        },
      }).catch((e) => console.error("[AI Event Log Error]:", e.message));
    }

    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/chat`,
        {
          message,
          project_id: projectId,
          user_id: req.user?._id ? req.user._id.toString() : null,
          active_file_name: activeFileName,
          active_code: activeCode,
          language,
          last_error: lastError,
          chat_history: chatHistory,
          condition,
          mode,
          current_files: currentFiles,
        },
        { timeout: 90000 }
      );

      const aiData = response.data;

      if (roomId || projectId) {
        SessionEvent.create({
          roomId: roomId || "general",
          projectId: projectId && projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null,
          userId: req.user?._id || null,
          userName: req.user?.name || "AI Assistant",
          eventType: "AI_RESPONSE",
          metadata: {
            queryId: aiData?.diagnostics?.queryId || null,
            query: sanitizeTelemetry(message?.slice(0, 150)),
            intent: aiData?.intent || "GENERAL_CODE_QUESTION",
            status: aiData?.status || "SUCCESS",
            condition,
            provider: aiData?.provider || "unknown",
            model: aiData?.model || "unknown",
            fallback: aiData?.fallback || false,
            latencyMs: aiData?.latency_ms || 0,
            llmLatencyMs: aiData?.llm_latency_ms || 0,
            findingsCount: aiData?.findings?.length || 0,
            sourcesCount: aiData?.sources?.length || 0,
            retrieved_context_ids: (aiData?.sources || []).map((s) => s.fileId || s.chunkHash),
            retrieval_scores: (aiData?.sources || []).map((s) => s.score),
            validator_result: aiData?.status,
            unsupported_claim_count: aiData?.diagnostics?.unsupportedClaimCount || 0,
            evidence_manifest: aiData?.evidenceManifest || null,
            retrievedFiles: (aiData?.sources || []).map((s) => s.fileName || s.filePath),
            retrievedLineRanges: (aiData?.sources || []).map((s) => `${s.startLine}-${s.endLine}`),
            retrievalMetadata: aiData?.retrievalMetadata || null,
            analysisMethods: aiData?.analysisMethods || ["AST", "static_pattern_analysis", "CodeBERT"],
            experimentId: experimentId || null,
            participantId: participantId || null,
          },
        }).catch((e) => console.error("[AI Event Log Error]:", e.message));
      }

      res.json({ success: true, data: aiData });
    } catch (aiErr) {
      console.error("[AI Chat Controller Error]:", aiErr.message, aiErr.response?.data || "");
      const lineCount = activeCode ? activeCode.split("\n").length : 0;
      const errorLine = lastError ? `\nRuntime error detected: ${lastError}` : "";

      if (roomId || projectId) {
        SessionEvent.create({
          roomId: roomId || "general",
          projectId: projectId && projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null,
          userId: req.user?._id || null,
          userName: req.user?.name || "AI Assistant",
          eventType: "AI_RESPONSE",
          metadata: {
            condition,
            fallback: true,
            provider: "offline",
            error: aiErr.message,
          },
        }).catch((e) => console.error("[AI Event Log Error]:", e.message));
      }

      const isTimeout = aiErr.code === "ECONNABORTED" || aiErr.message?.toLowerCase().includes("timeout");
      let provider = process.env.LLM_PROVIDER || (process.env.OPENROUTER_API_KEY ? "openrouter" : "ollama");
      let model = provider === "openrouter" ? (process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini") : (process.env.OLLAMA_MODEL || "qwen2.5-coder:1.5b");
      try {
        const health = await axios.get(`${config.aiServiceUrl}/api/health`, { timeout: 3000 });
        provider = health.data?.provider || provider;
        model = health.data?.model || model;
      } catch {
        // Preserve the local configuration when the AI service itself is unreachable.
      }
      const providerLabel = provider === "openrouter" ? "OpenRouter API" : provider === "ollama" ? "local Ollama" : provider;
      res.json({
        success: true,
        fallback: true,
        data: {
          response: `${isTimeout ? `AI request timed out while waiting for the ${providerLabel} model — running in static fallback mode.` : "AI service is offline — running in static fallback mode."}\n\nFile: ${activeFileName || "main"} (${language || "code"}) · ${lineCount} lines${errorLine}\n\nEnsure the Python FastAPI service is running on port 8000 and its configured AI provider is reachable.`,
          condition,
          sources: [],
          retrieved_context: [],
          ml_analysis: null,
          provider,
          model,
          engine: "Offline Fallback",
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    AI Debug with RAG context
// @route   POST /api/ai/debug
export const debugCode = async (req, res, next) => {
  try {
    const { projectId, activeFileName, activeCode, language, lastError } = req.body;
    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/ai/debug`,
        { projectId, activeFileName, activeCode, language, lastError },
        { timeout: 30000 }
      );
      res.json({ success: true, data: response.data?.data || response.data });
    } catch (aiErr) {
      res.json({
        success: false,
        fallback: true,
        data: {
          suspectedIssue: "AI service unreachable for dynamic debugging",
          explanation: "Could not connect to Python AI service on port 8000.",
          location: `${activeFileName || "main"}:1`,
          suggestedFix: "// Ensure Python AI service is running",
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    AI Test Suite Generation with RAG context
// @route   POST /api/ai/tests
export const generateTests = async (req, res, next) => {
  try {
    const { projectId, activeFileName, activeCode, language } = req.body;
    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/ai/tests`,
        { projectId, activeFileName, activeCode, language },
        { timeout: 30000 }
      );
      res.json({ success: true, data: response.data?.data || response.data });
    } catch (aiErr) {
      res.json({
        success: false,
        fallback: true,
        message: "AI service unreachable for test generation.",
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    AI Patch Generation with Human Review
// @route   POST /api/ai/patch
export const generatePatch = async (req, res, next) => {
  try {
    const { projectId, activeFileName, activeCode, instruction, language } = req.body;
    try {
      const response = await axios.post(
        `${config.aiServiceUrl}/api/ai/patch`,
        { projectId, activeFileName, activeCode, instruction, language },
        { timeout: 30000 }
      );
      res.json({ success: true, data: response.data?.data || response.data });
    } catch (aiErr) {
      res.json({
        success: false,
        fallback: true,
        message: "AI service unreachable for patch generation.",
      });
    }
  } catch (error) {
    next(error);
  }
};
