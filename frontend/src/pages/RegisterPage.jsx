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
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
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
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-brand">
          <Link to="/" className="brand-logo" style={{ width: 48, height: 48, borderRadius: 14 }}>
            <Code2 size={24} color="#fff" />
          </Link>
          <h1>Create your DevShare Account</h1>
          <p>Start building collaboratively with AI in minutes</p>
        </div>

        <div className="auth-form-card">
          {error && <div className="alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon">
                <UserIcon size={15} className="icon-left" />
                <input className="input" type="text" placeholder="Aman Shrikhande" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon">
                <Mail size={15} className="icon-left" />
                <input className="input" type="email" placeholder="developer@devshare.io" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-icon">
                <Lock size={15} className="icon-left" />
                <input className="input" type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              style={{ marginTop: 8, padding: "11px 16px" }}
            >
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Sparkles size={15} />}
              {loading ? "Creating Account..." : "Create Free Account"}
            </button>
          </form>
          <div className="auth-footer-link">
            Already have an account? <Link to="/login">Sign in instead</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
