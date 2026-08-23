import { apiClient } from "./client.js";

export const executionAPI = {
  runCode: async (runData) => {
    const res = await apiClient.post("/api/execution/run", runData);
    return res.data;
  },

  getProjectHistory: async (projectId) => {
    const res = await apiClient.get(`/api/execution/${projectId}/history`);
    return res.data;
  },
};
