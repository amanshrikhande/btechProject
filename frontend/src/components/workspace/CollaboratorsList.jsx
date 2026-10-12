import { useState } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { Users, Copy, Check, Radio } from "lucide-react";

export const CollaboratorsList = ({ roomId, onLeaveRoom }) => {
  const { users, collaborators, typingUser, roomPermissions, leaderMode } = useSocket();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayUsers =
    collaborators.length > 0
      ? collaborators
      : users.map((u) => ({ name: u, avatar: null, socketId: null }));

  return (
    <div className="collab-panel">
      <div className="collab-header">
        <span className="collab-label">
          <Users size={12} color="var(--c-cyan)" />
          Active Peers ({displayUsers.length})
        </span>
        <button
          onClick={handleCopy}
          className="btn-ghost flex items-center gap-1"
          style={{ fontSize: 11, fontFamily: "monospace", color: "var(--c-cyan)", padding: "3px 6px" }}
        >
          {copied ? <Check size={11} color="var(--c-emerald)" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>

      <div className="collab-list">
        {displayUsers.map((c, i) => {
          const perm = roomPermissions.find((p) => p.name === c.name || p.socketId === c.socketId);
          const isLeader = perm?.role === "LEADER";
          const isEditor = perm?.role === "EDITOR" || (!leaderMode && !isLeader);
          const isViewer = perm?.role === "VIEWER" || (leaderMode && !isLeader && !perm?.canEdit);

          return (
            <div key={i} className="collab-item" style={{ justifyContent: "space-between" }}>
              <div className="flex items-center gap-2" style={{ overflow: "hidden" }}>
                <span
                  className="dot dot-green"
                  style={{ width: 7, height: 7, boxShadow: "0 0 6px var(--c-emerald)", flexShrink: 0 }}
                />
                <span className="truncate">{c.name}</span>
              </div>
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 4,
                  flexShrink: 0,
                  background: isLeader
                    ? "rgba(245,158,11,0.15)"
                    : isViewer
                    ? "rgba(244,63,94,0.15)"
                    : "rgba(16,185,129,0.15)",
                  color: isLeader
                    ? "var(--c-amber)"
                    : isViewer
                    ? "var(--c-rose)"
                    : "var(--c-emerald)",
                  border: isLeader
                    ? "1px solid rgba(245,158,11,0.3)"
                    : isViewer
                    ? "1px solid rgba(244,63,94,0.3)"
                    : "1px solid rgba(16,185,129,0.3)",
                }}
              >
                {isLeader ? "👑 LEADER" : isViewer ? "VIEW ONLY" : "EDITING"}
              </span>
            </div>
          );
        })}
      </div>

      {typingUser && (
        <div className="collab-typing">
          <Radio size={10} className="animate-pulse" />
          {typingUser}
        </div>
      )}
    </div>
  );
};
