import { apiClient } from "./client.js";

export const filesAPI = {
  getProjectFiles: async (projectId) => {
    const res = await apiClient.get(`/api/projects/${projectId}/files`);
    return res.data;
  },

  createFile: async (projectId, fileData) => {
    const res = await apiClient.post(`/api/projects/${projectId}/files`, fileData);
    return res.data;
  },

  getFileById: async (fileId) => {
    const res = await apiClient.get(`/api/files/${fileId}`);
    return res.data;
  },

  updateFile: async (fileId, updateData) => {
    const res = await apiClient.put(`/api/files/${fileId}`, updateData);
    return res.data;
  },

  renameFile: async (fileId, renameData) => {
    const res = await apiClient.put(`/api/files/${fileId}/rename`, renameData);
    return res.data;
  },

  deleteFile: async (fileId) => {
    const res = await apiClient.delete(`/api/files/${fileId}`);
    return res.data;
  },
};
