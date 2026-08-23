import { apiClient } from "./client.js";

export const authAPI = {
  register: async (userData) => {
    const res = await apiClient.post("/api/auth/register", userData);
    return res.data;
  },

  login: async (credentials) => {
    const res = await apiClient.post("/api/auth/login", credentials);
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get("/api/auth/me");
    return res.data;
  },

  updateProfile: async (profileData) => {
    const res = await apiClient.put("/api/auth/profile", profileData);
    return res.data;
  },
};
