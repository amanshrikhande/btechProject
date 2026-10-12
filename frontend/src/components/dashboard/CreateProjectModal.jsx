import { useState } from "react";
import { Modal } from "../common/Modal.jsx";
import { FolderPlus } from "lucide-react";

export const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter a project name"); return; }
    setLoading(true); setError("");
    try {
      await onCreate({ name, description, defaultLanguage });
      setName(""); setDescription(""); setDefaultLanguage("javascript");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project");
    } finally { setLoading(false); }
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text-2)", marginBottom: 7 };
  const selectStyle = { width: "100%", background: "var(--c-surface-2)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "9px 13px", color: "var(--c-text)", fontSize: 13, outline: "none" };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert-error">{error}</div>}
        <div className="form-group">
          <label style={labelStyle}>Project Name <span style={{ color: "var(--c-rose)" }}>*</span></label>
          <input className="input" type="text" placeholder="e.g. React Portfolio, Distributed Cache" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label style={labelStyle}>Description</label>
          <textarea className="input" placeholder="Briefly describe what you're building..." value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ resize: "none" }} />
        </div>
        <div className="form-group">
          <label style={labelStyle}>Primary Language</label>
          <select value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)} style={selectStyle}>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++ (GCC)</option>
            <option value="java">Java (OpenJDK)</option>
            <option value="typescript">TypeScript</option>
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
            <FolderPlus size={13} /> {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
