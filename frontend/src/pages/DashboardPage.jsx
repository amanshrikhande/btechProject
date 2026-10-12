import { useState, useEffect } from "react";
import { Navbar } from "../components/common/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { projectsAPI } from "../api/projects.api.js";
import { ProjectCard } from "../components/dashboard/ProjectCard.jsx";
import { CreateProjectModal } from "../components/dashboard/CreateProjectModal.jsx";
import { JoinRoomModal } from "../components/dashboard/JoinRoomModal.jsx";
import { Modal } from "../components/common/Modal.jsx";
import { FolderPlus, LogIn, FolderCode, Sparkles, Users, Copy, Check, RefreshCw, Search } from "lucide-react";

export const DashboardPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [shareProject, setShareProject] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchProjects = async () => {
    try { setLoading(true); const res = await projectsAPI.getProjects(); setProjects(res.data || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (data) => { await projectsAPI.createProject(data); await fetchProjects(); };
  const handleDelete = async (id) => {
    if (confirm("Delete this project? All files will be removed.")) {
      try { await projectsAPI.deleteProject(id); setProjects(p => p.filter(x => x._id !== id)); }
      catch (e) { console.error(e); }
    }
  };
  const handleShare = (p) => { setShareProject(p); setCopied(false); };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/workspace/${shareProject.activeRoomId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.defaultLanguage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--c-bg)" }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="dash-page">
          {/* Header */}
          <div className="dash-header">
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-cyan)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Workspace Dashboard</p>
              <h1>Welcome back, {user?.name || "Developer"}</h1>
              <p>Manage your persistent code projects, join live collaboration rooms, and run multi-file builds.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsJoinOpen(true)} className="btn btn-secondary">
                <LogIn size={15} color="var(--c-cyan)" /> Join Room
              </button>
              <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">
                <FolderPlus size={15} /> New Project
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="dash-stats">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--c-cyan-dim)", color: "var(--c-cyan)" }}>
                <FolderCode size={20} />
              </div>
              <div>
                <div className="stat-val">{projects.length}</div>
                <div className="stat-label">Total Projects</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(99,102,241,0.1)", color: "var(--c-indigo)" }}>
                <Users size={20} />
              </div>
              <div>
                <div className="stat-val">{projects.reduce((a, p) => a + (p.members?.length || 1), 0)}</div>
                <div className="stat-label">Collaborator Links</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "var(--c-purple-dim)", color: "var(--c-purple)" }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div className="stat-val">Online</div>
                <div className="stat-label">AI Code Analysis & RAG</div>
              </div>
            </div>
          </div>

          {/* Search toolbar */}
          <div className="dash-toolbar">
            <div className="dash-search">
              <Search size={15} />
              <input
                className="input"
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={fetchProjects} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12 }}>
              <div className="spinner spinner-lg" />
              <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--c-text-3)" }}>Loading workspaces...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ maxWidth: 380, margin: "0 auto" }}>
              <FolderCode size={48} />
              <h3>No projects found</h3>
              <p>{searchQuery ? "No projects match your search." : "Create your first project or join an existing room to get started."}</p>
              <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">
                <FolderPlus size={14} /> Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 16 }}>
              {filtered.map(p => (
                <ProjectCard key={p._id} project={p} onDelete={handleDelete} onShare={handleShare} />
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={handleCreate} />
      <JoinRoomModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />

      <Modal isOpen={!!shareProject} onClose={() => setShareProject(null)} title="Invite Collaborators">
        {shareProject && (
          <div className="space-y-4">
            <p style={{ fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.7 }}>
              Anyone with this link can join and edit files in real-time.
            </p>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Room Code</label>
              <div style={{ padding: "9px 13px", borderRadius: 8, background: "var(--c-surface-2)", border: "1px solid var(--c-border)", fontFamily: "monospace", fontSize: 13, color: "var(--c-cyan)" }}>
                {shareProject.activeRoomId}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Direct Invite URL</label>
              <div className="flex items-center gap-2">
                <input className="input" type="text" readOnly value={`${window.location.origin}/workspace/${shareProject.activeRoomId}`} style={{ fontSize: 12, fontFamily: "monospace" }} />
                <button onClick={handleCopyLink} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
