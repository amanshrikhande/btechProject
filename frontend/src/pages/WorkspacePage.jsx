import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { FileTree } from "../components/workspace/FileTree.jsx";
import { EditorHeader } from "../components/workspace/EditorHeader.jsx";
import { MonacoEditorWrapper } from "../components/workspace/MonacoEditorWrapper.jsx";
import { TerminalPanel } from "../components/workspace/TerminalPanel.jsx";
import { CollaboratorsList } from "../components/workspace/CollaboratorsList.jsx";
import { VersionHistoryModal } from "../components/workspace/VersionHistoryModal.jsx";
import { AIAssistantDrawer } from "../components/ai/AIAssistantDrawer.jsx";
import { Modal } from "../components/common/Modal.jsx";
import {
  Code2,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  Share2,
} from "lucide-react";

export const WorkspacePage = () => {
  const { id: projectIdOrRoom } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, loadProject, isAIOpen } = useWorkspace();
  const { joinRoom, leaveRoom } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initWorkspace = async () => {
      try {
        setLoading(true);
        setError("");
        const loadedProj = await loadProject(projectIdOrRoom);
        if (loadedProj) {
          joinRoom(
            loadedProj.activeRoomId,
            user ? user.name : "Anonymous",
            loadedProj._id
          );
        }
      } catch (err) {
        console.error("Workspace initialization error:", err);
        setError(
          err.response?.data?.error ||
            "Failed to load project workspace. Make sure the room ID is correct."
        );
      } finally {
        setLoading(false);
      }
    };

    if (projectIdOrRoom) {
      initWorkspace();
    }

    return () => {
      leaveRoom();
    };
  }, [projectIdOrRoom, user]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-mono text-gray-400">
          Connecting to collaborative session...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="p-6 max-w-md glass-panel-elevated rounded-2xl border border-rose-500/20">
          <h2 className="text-xl font-bold text-rose-400 mb-2">Workspace Unavailable</h2>
          <p className="text-xs text-gray-300 mb-6 leading-relaxed">{error}</p>
          <Link to="/dashboard" className="btn-primary text-xs px-4 py-2">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-dark-bg text-white flex flex-col overflow-hidden select-none">
      {/* Top Workspace Bar */}
      <header className="h-10 bg-[#0d0e18] border-b border-border-subtle flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            title="Back to Dashboard"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold tracking-tight text-white">
              {project?.name || "DevShare Workspace"}
            </span>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Room: {project?.activeRoomId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
          >
            <Share2 className="w-3.5 h-3.5" />
            Invite
          </button>

          <button
            onClick={handleLeave}
            title="Leave Session"
            className="p-1.5 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main IDE Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Explorer + Active Collaborators */}
        <div className="flex flex-col h-full bg-[#10111a] border-r border-border-subtle">
          <div className="flex-1 overflow-hidden">
            <FileTree />
          </div>
          <CollaboratorsList
            roomId={project?.activeRoomId}
            onLeaveRoom={handleLeave}
          />
        </div>

        {/* Center Column: Editor Header + Monaco Editor + Terminal Console */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0c16]">
          <EditorHeader onShareRoom={() => setIsShareModalOpen(true)} />
          <div className="flex-1 relative overflow-hidden flex flex-col">
            <MonacoEditorWrapper />
          </div>
          <TerminalPanel />
        </div>

        {/* Right Column: AI Assistant Drawer */}
        {isAIOpen && <AIAssistantDrawer />}
      </div>

      {/* Version History Modal */}
      <VersionHistoryModal />

      {/* Share Room Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Invite Collaborators to Room"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Share this link with your teammates for instant real-time code synchronization and collaborative execution.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase font-mono mb-1">
              Room Identifier
            </label>
            <div className="p-2.5 rounded-lg bg-[#141525] border border-white/10 font-mono text-sm text-cyan-300">
              {project?.activeRoomId}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase font-mono mb-1">
              Direct Invite URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="flex-1 bg-[#141525] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
