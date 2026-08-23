import { apiClient } from "./client.js";

export const versionsAPI = {
  getFileVersions: async (fileId) => {
    const res = await apiClient.get(`/api/files/${fileId}/versions`);
    return res.data;
  },

  createSnapshot: async (fileId, snapshotData) => {
    const res = await apiClient.post(`/api/files/${fileId}/versions`, snapshotData);
    return res.data;
  },

  restoreVersion: async (fileId, versionId) => {
    const res = await apiClient.post(`/api/files/${fileId}/versions/${versionId}/restore`);
    return res.data;
  },
};
