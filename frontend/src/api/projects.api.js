import { apiClient } from "./client.js";

export const projectsAPI = {
  getProjects: async () => {
    const res = await apiClient.get("/api/projects");
    return res.data;
  },

  createProject: async (projectData) => {
    const res = await apiClient.post("/api/projects", projectData);
    return res.data;
  },

  getProjectById: async (id) => {
    const res = await apiClient.get(`/api/projects/${id}`);
    return res.data;
  },

  updateProject: async (id, updateData) => {
    const res = await apiClient.put(`/api/projects/${id}`, updateData);
    return res.data;
  },

  deleteProject: async (id) => {
    const res = await apiClient.delete(`/api/projects/${id}`);
    return res.data;
  },
};
