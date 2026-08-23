import { useState, useEffect } from "react";
import { Navbar } from "../components/common/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { projectsAPI } from "../api/projects.api.js";
import { ProjectCard } from "../components/dashboard/ProjectCard.jsx";
import { CreateProjectModal } from "../components/dashboard/CreateProjectModal.jsx";
import { JoinRoomModal } from "../components/dashboard/JoinRoomModal.jsx";
import { Modal } from "../components/common/Modal.jsx";
import {
  FolderPlus,
  LogIn,
  FolderCode,
  Sparkles,
  Users,
  Copy,
  Check,
  RefreshCw,
  Search,
} from "lucide-react";

export const DashboardPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [shareProject, setShareProject] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getProjects();
      setProjects(res.data || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (projectData) => {
    await projectsAPI.createProject(projectData);
    await fetchProjects();
  };

  const handleDeleteProject = async (projectId) => {
    if (confirm("Are you sure you want to delete this project? All files will be removed.")) {
      try {
        await projectsAPI.deleteProject(projectId);
        setProjects((prev) => prev.filter((p) => p._id !== projectId));
      } catch (err) {
        console.error("Error deleting project:", err);
      }
    }
  };

  const handleShare = (project) => {
    setShareProject(project);
    setCopied(false);
  };

  const handleCopyShareLink = () => {
    if (!shareProject) return;
    const url = `${window.location.origin}/workspace/${shareProject.activeRoomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.defaultLanguage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border-subtle/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono">
                Workspace Dashboard
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || "Developer"}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage your persistent code projects, join live collaboration rooms, and run multi-file builds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              Join Room
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <FolderPlus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
          <div className="glass-card rounded-xl p-5 border border-white/5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <FolderCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white font-mono">{projects.length}</span>
              <p className="text-xs text-gray-400">Total Projects</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-white/5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white font-mono">
                {projects.reduce((acc, p) => acc + (p.members?.length || 1), 0)}
              </span>
              <p className="text-xs text-gray-400">Collaborator Links</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-white/5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white font-mono">Online</span>
              <p className="text-xs text-gray-400">AI Code Analysis & RAG</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects by name or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121320] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <button
            onClick={fetchProjects}
            title="Refresh Projects"
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs text-gray-400 font-mono">Loading your workspaces...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 px-6 glass-panel rounded-2xl border border-white/5 flex flex-col items-center text-center max-w-md mx-auto">
            <FolderCode className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-base font-semibold text-white mb-1">No projects found</h3>
            <p className="text-xs text-gray-400 mb-6">
              {searchQuery
                ? "No projects match your search query."
                : "Create your first collaborative project or join an existing room to get started."}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onDelete={handleDeleteProject}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />

      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      {/* Share Modal */}
      <Modal
        isOpen={!!shareProject}
        onClose={() => setShareProject(null)}
        title="Invite Collaborators"
      >
        {shareProject && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Anyone with this room link can join and edit files in real-time alongside you.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase font-mono mb-1">
                Room Code
              </label>
              <div className="p-2.5 rounded-lg bg-[#141525] border border-white/10 font-mono text-sm text-cyan-300">
                {shareProject.activeRoomId}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase font-mono mb-1">
                Direct Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/workspace/${shareProject.activeRoomId}`}
                  className="flex-1 bg-[#141525] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
