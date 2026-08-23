import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../api/auth.api.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("devshare_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("devshare_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const data = await authAPI.getMe();
          setUser(data.user);
          localStorage.setItem("devshare_user", JSON.stringify(data.user));
        } catch {
          // Token expired or invalid
          setUser(null);
          setToken(null);
          localStorage.removeItem("devshare_token");
          localStorage.removeItem("devshare_user");
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("devshare_token", data.token);
      localStorage.setItem("devshare_user", JSON.stringify(data.user));
    }
    return data;
  };

  const register = async (name, email, password) => {
    const data = await authAPI.register({ name, email, password });
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("devshare_token", data.token);
      localStorage.setItem("devshare_user", JSON.stringify(data.user));
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("devshare_token");
    localStorage.removeItem("devshare_user");
  };

  const updateProfile = async (profileData) => {
    const data = await authAPI.updateProfile(profileData);
    if (data.user) {
      setUser(data.user);
      localStorage.setItem("devshare_user", JSON.stringify(data.user));
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
