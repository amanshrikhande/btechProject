import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { WorkspaceProvider } from "./context/WorkspaceContext.jsx";
import { ProtectedRoute } from "./components/common/ProtectedRoute.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { WorkspacePage } from "./pages/WorkspacePage.jsx";
import "./App.css";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <WorkspaceProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Application Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:id"
                element={
                  <ProtectedRoute>
                    <WorkspacePage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </WorkspaceProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
