import { useState } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import {
  Crown,
  ShieldAlert,
  UserCheck,
  UserX,
  Play,
  Square,
  Video,
  BarChart2,
  X,
  Sparkles,
  Users,
} from "lucide-react";

export const LeaderControlPanel = ({ onClose }) => {
  const {
    isLeader,
    leaderMode,
    toggleLeaderMode,
    roomPermissions,
    grantEditPermission,
    revokeEditPermission,
    interviewState,
    startInterview,
    endInterview,
    pendingPermissionRequests,
  } = useSocket();

  const { setActiveSidePanel, setIsAnalyticsOpen } = useWorkspace();

  const [selectedCandidate, setSelectedCandidate] = useState("");

  if (!isLeader) {
    return (
      <div className="side-panel">
        <div className="side-panel-header">
          <span className="side-panel-title">Access Restricted</span>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: 20, textAlign: "center", color: "var(--c-text-3)", fontSize: 12 }}>
          Only the Room Leader can access administrative collaboration controls.
        </div>
      </div>
    );
  }

  const nonLeaderParticipants = roomPermissions.filter((p) => p.role !== "LEADER");

  const handleStartInterview = () => {
    if (!selectedCandidate && nonLeaderParticipants.length > 0) {
      const candidate = nonLeaderParticipants[0];
      startInterview(candidate.socketId, candidate.name, candidate.userId);
    } else if (selectedCandidate) {
      const candidate = nonLeaderParticipants.find((p) => p.socketId === selectedCandidate);
      if (candidate) {
        startInterview(candidate.socketId, candidate.name, candidate.userId);
      }
    }
  };

  return (
    <div className="side-panel" style={{ width: 330 }}>
      {/* Header */}
      <div className="side-panel-header">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            }}
          >
            <Crown size={14} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)" }}>Leader Controls</div>
            <div style={{ fontSize: 9, color: "var(--c-text-3)", fontFamily: "monospace" }}>
              Room Governance & Roles
            </div>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      <div className="side-panel-body space-y-4">
        {/* Section 1: Leader Mode Toggle */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius)",
            background: leaderMode ? "rgba(245,158,11,0.08)" : "var(--c-surface-2)",
            border: leaderMode ? "1px solid rgba(245,158,11,0.3)" : "1px solid var(--c-border)",
            transition: "all 0.2s",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} color={leaderMode ? "var(--c-amber)" : "var(--c-text-3)"} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)" }}>Leader Mode</span>
            </div>
            {/* Toggle Button [ OFF / ON ] */}
            <button
              onClick={() => toggleLeaderMode(!leaderMode)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "99px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: leaderMode ? "var(--c-amber)" : "rgba(255,255,255,0.06)",
                color: leaderMode ? "#000" : "var(--c-text-3)",
                border: leaderMode ? "none" : "1px solid var(--c-border)",
                transition: "all 0.15s",
              }}
            >
              <span>{leaderMode ? "ON" : "OFF"}</span>
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--c-text-3)", lineHeight: 1.5 }}>
            {leaderMode
              ? "Leader Mode is ACTIVE. Non-leader participants are VIEW ONLY unless granted explicit edit permission."
              : "Leader Mode is OFF. All authorized participants can edit collaboratively in real time."}
          </p>
        </div>

        {/* Section 2: Pending Edit Requests */}
        {pendingPermissionRequests.length > 0 && (
          <div
            style={{
              padding: 10,
              borderRadius: "var(--radius-sm)",
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.25)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-cyan)", marginBottom: 6 }}>
              Edit Requests ({pendingPermissionRequests.length})
            </div>
            {pendingPermissionRequests.map((req, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 py-1">
                <span style={{ fontSize: 11, color: "var(--c-text)" }}>{req.requesterName}</span>
                <button
                  onClick={() => grantEditPermission(req.requesterSocketId)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 10, padding: "2px 8px" }}
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Section 3: Participant Permissions Management */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: "var(--c-text-3)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Users size={12} color="var(--c-cyan)" />
            Participants ({roomPermissions.length})
          </div>

          <div className="space-y-2">
            {roomPermissions.map((participant) => {
              const isParticipantLeader = participant.role === "LEADER";
              const isEditor = participant.role === "EDITOR";
              const isViewOnly = participant.role === "VIEWER";

              return (
                <div
                  key={participant.socketId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--c-surface-2)",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14 }}>{isParticipantLeader ? "👑" : "👤"}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text)" }}>
                        {participant.name}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: isParticipantLeader
                            ? "var(--c-amber)"
                            : isEditor
                            ? "var(--c-emerald)"
                            : "var(--c-rose)",
                        }}
                      >
                        {isParticipantLeader ? "LEADER" : isEditor ? "EDITING" : "VIEW ONLY"}
                      </div>
                    </div>
                  </div>

                  {!isParticipantLeader && (
                    <div>
                      {isViewOnly ? (
                        <button
                          onClick={() => grantEditPermission(participant.socketId)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            background: "rgba(16,185,129,0.12)",
                            color: "var(--c-emerald)",
                            border: "1px solid rgba(16,185,129,0.3)",
                            cursor: "pointer",
                          }}
                        >
                          <UserCheck size={11} /> Grant Edit
                        </button>
                      ) : (
                        <button
                          onClick={() => revokeEditPermission(participant.socketId)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            background: "rgba(244,63,94,0.12)",
                            color: "var(--c-rose)",
                            border: "1px solid rgba(244,63,94,0.3)",
                            cursor: "pointer",
                          }}
                        >
                          <UserX size={11} /> Revoke Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Interview Control */}
        <div
          style={{
            padding: 12,
            borderRadius: "var(--radius)",
            background: interviewState.active ? "rgba(244,63,94,0.08)" : "var(--c-surface-2)",
            border: interviewState.active ? "1px solid rgba(244,63,94,0.3)" : "1px solid var(--c-border)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text)" }}>
              Interview Mode
            </span>
            {interviewState.active && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "var(--c-rose)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(244,63,94,0.15)",
                }}
              >
                LIVE
              </span>
            )}
          </div>

          {interviewState.active ? (
            <div className="space-y-2">
              <p style={{ fontSize: 11, color: "var(--c-text-2)" }}>
                Active Candidate: <strong style={{ color: "var(--c-cyan)" }}>{interviewState.candidateName}</strong>
              </p>
              <button
                onClick={endInterview}
                className="btn btn-secondary btn-sm w-full"
                style={{ color: "var(--c-rose)", borderColor: "rgba(244,63,94,0.3)" }}
              >
                <Square size={12} /> End Interview
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {nonLeaderParticipants.length > 0 ? (
                <>
                  <label style={{ fontSize: 10, color: "var(--c-text-3)", display: "block" }}>
                    Select Candidate:
                  </label>
                  <select
                    className="lang-select w-full"
                    value={selectedCandidate || (nonLeaderParticipants[0]?.socketId || "")}
                    onChange={(e) => setSelectedCandidate(e.target.value)}
                  >
                    {nonLeaderParticipants.map((p) => (
                      <option key={p.socketId} value={p.socketId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleStartInterview} className="btn btn-primary btn-sm w-full">
                    <Play size={12} /> Start Interview
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 11, color: "var(--c-text-3)" }}>
                  Waiting for candidate to join room before launching interview.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 5: Quick Tool Shortcuts */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: "var(--c-text-3)",
              marginBottom: 8,
            }}
          >
            Quick Actions
          </div>
          <div className="grid grid-2" style={{ gap: 8 }}>
            <button
              onClick={() => setActiveSidePanel("communication")}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, justifyContent: "center" }}
            >
              <Video size={12} color="var(--c-cyan)" /> Communication
            </button>
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, justifyContent: "center" }}
            >
              <BarChart2 size={12} color="var(--c-purple)" /> Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
