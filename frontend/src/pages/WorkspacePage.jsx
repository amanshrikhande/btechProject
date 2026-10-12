import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useInterviewMonitoring } from "../hooks/useInterviewMonitoring.js";
import { FileTree } from "../components/workspace/FileTree.jsx";
import { EditorHeader } from "../components/workspace/EditorHeader.jsx";
import { MonacoEditorWrapper } from "../components/workspace/MonacoEditorWrapper.jsx";
import { TerminalPanel } from "../components/workspace/TerminalPanel.jsx";
import { CollaboratorsList } from "../components/workspace/CollaboratorsList.jsx";
import { VersionHistoryModal } from "../components/workspace/VersionHistoryModal.jsx";
import { LeaderControlPanel } from "../components/workspace/LeaderControlPanel.jsx";
import { WebRTCCommunicationPanel } from "../components/workspace/WebRTCCommunicationPanel.jsx";
import { InterviewActivityPanel } from "../components/workspace/InterviewActivityPanel.jsx";
import { InterviewBanner } from "../components/workspace/InterviewBanner.jsx";
import { InterviewPrivacyModal } from "../components/workspace/InterviewPrivacyModal.jsx";
import { SessionAnalyticsModal } from "../components/workspace/SessionAnalyticsModal.jsx";
import { AIAssistantDrawer } from "../components/ai/AIAssistantDrawer.jsx";
import { Modal } from "../components/common/Modal.jsx";
import {
  Code2,
  LogOut,
  Copy,
  Check,
  ChevronLeft,
  Share2,
  Crown,
  Video,
  Activity,
  BarChart2,
  Sparkles,
} from "lucide-react";

export const WorkspacePage = () => {
  const { id: projectIdOrRoom } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    project,
    loadProject,
    isAIOpen,
    setIsAIOpen,
    activeSidePanel,
    setActiveSidePanel,
    isAnalyticsOpen,
    setIsAnalyticsOpen,
  } = useWorkspace();
  const { joinRoom, leaveRoom, isLeader, interviewState } = useSocket();
  const { showPrivacyNotice, acknowledgePrivacy } = useInterviewMonitoring();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError("");
        const p = await loadProject(projectIdOrRoom);
        if (p) joinRoom(p.activeRoomId, user?.name || "Anonymous", p._id);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load workspace.");
      } finally {
        setLoading(false);
      }
    };
    if (projectIdOrRoom) init();
    return () => leaveRoom();
  }, [projectIdOrRoom, user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate("/dashboard");
  };

  const togglePanel = (panelName) => {
    setActiveSidePanel(activeSidePanel === panelName ? "none" : panelName);
  };

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Connecting to collaborative session...</p>
      </div>
    );

  if (error)
    return (
      <div className="loading-screen">
        <div
          style={{
            padding: 28,
            maxWidth: 400,
            background: "var(--c-surface)",
            border: "1px solid rgba(244,63,94,0.2)",
            borderRadius: 16,
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "var(--c-rose)", marginBottom: 8 }}>Workspace Unavailable</h2>
          <p style={{ fontSize: 12, color: "var(--c-text-2)", marginBottom: 20 }}>{error}</p>
          <Link to="/dashboard" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );

  return (
    <div className="workspace-root">
      {/* Topbar */}
      <div className="workspace-topbar">
        <div className="workspace-topbar-left">
          <Link to="/dashboard" className="btn-ghost" title="Back to Dashboard" style={{ padding: 5 }}>
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <Code2 size={15} color="var(--c-cyan)" />
            <span className="workspace-project-name">{project?.name || "DevShare Workspace"}</span>
          </div>
          <span className="workspace-room-tag">Room: {project?.activeRoomId}</span>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2">
          {/* Leader Controls Button (Leader only) */}
          {isLeader && (
            <button
              onClick={() => togglePanel("leader")}
              className="btn btn-sm"
              style={{
                background: activeSidePanel === "leader" ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)",
                color: "var(--c-amber)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Leader Collaboration Controls"
            >
              <Crown size={13} />
              <span>Leader</span>
            </button>
          )}

          {/* WebRTC Communication Button */}
          <button
            onClick={() => togglePanel("communication")}
            className="btn btn-sm"
            style={{
              background: activeSidePanel === "communication" ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.1)",
              color: "var(--c-cyan)",
              border: "1px solid rgba(6,182,212,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
            title="Audio / Video Communication"
          >
            <Video size={13} />
            <span>Call</span>
          </button>

          {/* Interview Activity (Visible when interview is active or to leader) */}
          {(interviewState.active || isLeader) && (
            <button
              onClick={() => togglePanel("interviewActivity")}
              className="btn btn-sm"
              style={{
                background:
                  activeSidePanel === "interviewActivity"
                    ? "rgba(244,63,94,0.2)"
                    : "rgba(244,63,94,0.1)",
                color: "var(--c-rose)",
                border: "1px solid rgba(244,63,94,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Interview Activity Feed"
            >
              <Activity size={13} />
              <span>Activity</span>
            </button>
          )}

          {/* Session Analytics */}
          <button
            onClick={() => setIsAnalyticsOpen(true)}
            className="btn btn-sm"
            style={{
              background: "rgba(168,85,247,0.1)",
              color: "var(--c-purple)",
              border: "1px solid rgba(168,85,247,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
            title="View Research & Session Analytics"
          >
            <BarChart2 size={13} />
            <span>Analytics</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={() => setIsAIOpen(!isAIOpen)}
            className="btn btn-sm"
            style={{
              background: isAIOpen ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.08)",
              color: "var(--c-cyan)",
              border: isAIOpen ? "1px solid var(--c-cyan)" : "1px solid rgba(6,182,212,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: isAIOpen ? "0 0 12px rgba(6,182,212,0.3)" : "none",
              transition: "all 0.15s ease",
            }}
            title="Toggle Project-Aware AI Assistant (Multi-File RAG)"
          >
            <Sparkles size={13} />
            <span>AI Assistant</span>
            <span
              style={{
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 4,
                background: "rgba(6,182,212,0.2)",
                color: "var(--c-cyan)",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              RAG
            </span>
          </button>

          {/* Invite */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ color: "var(--c-cyan)" }}
          >
            <Share2 size={13} /> Invite
          </button>

          {/* Leave Session */}
          <button
            onClick={handleLeave}
            className="btn-ghost"
            title="Leave session"
            style={{ padding: 6 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-rose)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "")}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Live Interview Banner if Interview Mode is active */}
      <InterviewBanner />

      {/* Main IDE */}
      <div className="workspace-main">
        {/* Left: File tree + collaborators */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: "#0d0f1b",
            borderRight: "1px solid var(--c-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>
            <FileTree />
          </div>
          <CollaboratorsList roomId={project?.activeRoomId} onLeaveRoom={handleLeave} />
        </div>

        {/* Center: Editor + Terminal */}
        <div className="editor-center">
          <EditorHeader onShareRoom={() => setIsShareOpen(true)} />
          <div className="editor-body">
            <MonacoEditorWrapper />
          </div>
          <TerminalPanel />
        </div>

        {/* Active Side Panels (Independent toggles matching existing layout) */}
        {activeSidePanel === "leader" && (
          <LeaderControlPanel onClose={() => setActiveSidePanel("none")} />
        )}
        {activeSidePanel === "communication" && (
          <WebRTCCommunicationPanel onClose={() => setActiveSidePanel("none")} />
        )}
        {activeSidePanel === "interviewActivity" && (
          <InterviewActivityPanel onClose={() => setActiveSidePanel("none")} />
        )}

        {/* Right: AI Drawer */}
        {isAIOpen && <AIAssistantDrawer onClose={() => setIsAIOpen(false)} />}
      </div>

      {/* Modals */}
      <VersionHistoryModal />
      <SessionAnalyticsModal isOpen={isAnalyticsOpen} onClose={() => setIsAnalyticsOpen(false)} />
      <InterviewPrivacyModal isOpen={showPrivacyNotice} onAcknowledge={acknowledgePrivacy} />

      {/* Share Modal */}
      <Modal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="Invite Collaborators to Room">
        <div className="space-y-4">
          <p style={{ fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.7 }}>
            Share this link for instant real-time code synchronization.
          </p>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--c-text-3)",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Room Identifier
            </label>
            <div
              style={{
                padding: "9px 13px",
                borderRadius: 8,
                background: "var(--c-surface-2)",
                fontFamily: "monospace",
                fontSize: 13,
                color: "var(--c-cyan)",
                border: "1px solid var(--c-border)",
              }}
            >
              {project?.activeRoomId}
            </div>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--c-text-3)",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Direct Invite URL
            </label>
            <div className="flex items-center gap-2">
              <input
                className="input"
                type="text"
                readOnly
                value={window.location.href}
                style={{ fontSize: 11, fontFamily: "monospace" }}
              />
              <button onClick={handleCopy} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}{" "}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
