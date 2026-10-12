import { apiClient } from "./client.js";

export const aiAPI = {
  checkHealth: async () => {
    const res = await apiClient.get("/api/ai/health");
    return res.data;
  },

  analyzeCode: async (code, language) => {
    const res = await apiClient.post("/api/ai/analyze", { code, language });
    return res.data;
  },

  indexProjectFiles: async (projectId) => {
    const res = await apiClient.post("/api/ai/rag/index", { projectId });
    return res.data;
  },

  getIndexStatus: async (projectId) => {
    const res = await apiClient.get(`/api/ai/rag/status/${projectId}`);
    return res.data;
  },

  queryRAG: async (projectId, query, topK = 3) => {
    const res = await apiClient.post("/api/ai/rag/query", { projectId, query, topK });
    return res.data;
  },

  chatAssistant: async (chatPayload) => {
    const res = await apiClient.post("/api/ai/chat", chatPayload);
    return res.data;
  },

  debugCode: async (payload) => {
    const res = await apiClient.post("/api/ai/debug", payload);
    return res.data;
  },

  generateTests: async (payload) => {
    const res = await apiClient.post("/api/ai/tests", payload);
    return res.data;
  },

  generatePatch: async (payload) => {
    const res = await apiClient.post("/api/ai/patch", payload);
    return res.data;
  },
};
