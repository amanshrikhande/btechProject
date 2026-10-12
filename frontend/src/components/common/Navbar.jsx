import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Code2, LogOut, LayoutDashboard, Sparkles } from "lucide-react";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" style={{ textDecoration: "none" }}>
        <div className="brand-logo">
          <Code2 size={20} color="#fff" />
        </div>
        <span className="brand-name">
          DevShare
          <span className="brand-pill" style={{ marginLeft: 8 }}>v2 AI</span>
        </span>
      </Link>

      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">
              <LayoutDashboard size={15} color="var(--c-cyan)" />
              Dashboard
            </Link>
            <div className="divider-v" style={{ height: 28 }} />
            <div className="flex items-center gap-3">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.name || "Dev")}`}
                alt={user?.name}
                className="nav-avatar"
              />
              <div className="nav-user-info hide-mobile">
                <span>{user?.name}</span>
                <span>{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-ghost"
                title="Sign out"
                style={{ color: "var(--c-text-3)" }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Sign In</Link>
            <Link to="/register" className="btn btn-primary">
              <Sparkles size={14} />
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
