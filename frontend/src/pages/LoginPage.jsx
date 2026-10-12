import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Code2, LogIn, Lock, Mail } from "lucide-react";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-brand">
          <Link to="/" className="brand-logo" style={{ width: 48, height: 48, borderRadius: 14 }}>
            <Code2 size={24} color="#fff" />
          </Link>
          <h1>Welcome back to DevShare</h1>
          <p>Sign in to access your projects and AI workspace</p>
        </div>

        <div className="auth-form-card">
          {error && <div className="alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon">
                <Mail size={15} className="icon-left" />
                <input
                  className="input"
                  type="email"
                  placeholder="developer@devshare.io"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-icon">
                <Lock size={15} className="icon-left" />
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              style={{ marginTop: 8, padding: "11px 16px" }}
            >
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <LogIn size={15} />}
              {loading ? "Signing in..." : "Sign In to Workspace"}
            </button>
          </form>

          <div className="auth-footer-link">
            Don't have an account?{" "}
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
