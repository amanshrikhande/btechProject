import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Code2, LogOut, User as UserIcon, LayoutDashboard, Plus, Sparkles } from "lucide-react";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="h-16 border-b border-border-subtle/80 bg-surface-elevated/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            DevShare
            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
              v2.0 AI
            </span>
          </span>
        </div>
      </Link>

      {/* Navigation items */}
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              Dashboard
            </Link>

            <div className="h-5 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-3 pl-2">
              <img
                src={
                  user?.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    user?.name || "Dev"
                  )}`
                }
                alt={user?.name}
                className="w-8 h-8 rounded-lg bg-surface border border-white/10"
              />
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-medium text-white">{user?.name}</span>
                <span className="text-xs text-gray-400">{user?.email}</span>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-2"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
