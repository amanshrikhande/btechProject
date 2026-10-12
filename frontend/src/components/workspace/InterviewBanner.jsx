import { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { Radio, Square, Activity, ShieldCheck } from "lucide-react";

export const InterviewBanner = () => {
  const { interviewState, isLeader, endInterview } = useSocket();
  const { setActiveSidePanel } = useWorkspace();
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!interviewState.active || !interviewState.startedAt) return;

    const timer = setInterval(() => {
      const diffSec = Math.max(0, Math.floor((Date.now() - interviewState.startedAt) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setElapsed(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [interviewState.active, interviewState.startedAt]);

  if (!interviewState.active) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        background: "linear-gradient(90deg, rgba(244,63,94,0.15) 0%, rgba(15,17,24,0.95) 100%)",
        borderBottom: "1px solid rgba(244,63,94,0.35)",
        backdropFilter: "blur(8px)",
        flexShrink: 0,
        zIndex: 25,
      }}
    >
      <div className="flex items-center gap-4">
        {/* Live Indicator */}
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "var(--c-rose)",
              boxShadow: "0 0 10px var(--c-rose)",
              display: "inline-block",
              animation: "pulse 1.5s infinite",
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: "var(--c-rose)" }}>
            INTERVIEW MODE
          </span>
        </div>

        {/* Candidate Name */}
        <div style={{ fontSize: 11, color: "var(--c-text-2)" }}>
          Candidate: <strong style={{ color: "var(--c-text)" }}>{interviewState.candidateName || "Candidate"}</strong>
        </div>

        {/* Duration Timer */}
        <div
          style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: "var(--c-cyan)",
            background: "rgba(6,182,212,0.1)",
            padding: "2px 8px",
            borderRadius: 4,
            border: "1px solid rgba(6,182,212,0.25)",
          }}
        >
          Duration: {elapsed}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Open Activity panel */}
        {isLeader && (
          <button
            onClick={() => setActiveSidePanel("interviewActivity")}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 11, color: "var(--c-cyan)", padding: "3px 8px" }}
          >
            <Activity size={12} /> Live Activity
          </button>
        )}

        {/* End Interview button for Leader */}
        {isLeader && (
          <button
            onClick={endInterview}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: 11,
              color: "var(--c-rose)",
              borderColor: "rgba(244,63,94,0.4)",
              padding: "3px 8px",
            }}
          >
            <Square size={12} /> End Interview
          </button>
        )}
      </div>
    </div>
  );
};
