import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Code2, Sparkles, Lock, Mail, User as UserIcon } from "lucide-react";

export const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6 gradient-hero">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-4">
            <Code2 className="w-7 h-7 text-white" />
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create your DevShare Account</h1>
          <p className="text-sm text-gray-400 mt-1">Start building collaboratively with AI in minutes</p>
        </div>

        {/* Form Card */}
        <div className="glass-panel-elevated rounded-2xl p-8 border border-white/10 shadow-2xl">
          {error && (
            <div className="p-3 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Aman Shrikhande"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#141525] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="developer@devshare.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#141525] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#141525] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Creating Account..." : "Create Free Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-400">
              Already have an account?{" "}
              <Link to="/login" className="text-cyan-400 font-semibold hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
