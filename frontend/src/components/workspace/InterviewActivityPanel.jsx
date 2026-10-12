import { useEffect, useState, useRef } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { Activity, X, Eye, EyeOff, Maximize2, Minimize2, CheckCircle2, AlertTriangle, Play, RefreshCw } from "lucide-react";
import axios from "axios";

export const InterviewActivityPanel = ({ onClose }) => {
  const { activeRoom, interviewState, interviewAlerts, isLeader } = useSocket();
  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Fetch persisted interview/focus events for the room
  const fetchEvents = async () => {
    if (!activeRoom) return;
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/analytics/room/${activeRoom}/events?limit=40`);
      if (res.data?.success) {
        setDbEvents(res.data.data || []);
      }
    } catch (e) {
      console.warn("[Fetch Events Error]:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeRoom]);

  // Merge database historical events with real-time socket alerts
  const combinedEvents = [
    ...dbEvents.map((e) => ({
      id: e._id,
      eventType: e.eventType,
      text: formatEventText(e.eventType, e.userName),
      timestamp: new Date(e.timestamp).toLocaleTimeString(),
      type: getEventTypeTag(e.eventType),
    })),
    ...interviewAlerts.map((a, idx) => ({
      id: `live_${idx}`,
      eventType: a.eventType,
      text: a.text,
      timestamp: a.timestamp,
      type: a.type,
    })),
  ];

  // Keep latest events scrolled to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [combinedEvents.length]);

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
              background: "linear-gradient(135deg, #f43f5e, #e11d48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(244,63,94,0.3)",
            }}
          >
            <Activity size={14} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)" }}>
              Interview Activity
            </div>
            <div style={{ fontSize: 9, color: "var(--c-text-3)", fontFamily: "monospace" }}>
              Focus & Observability Log
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchEvents} className="btn-ghost" style={{ padding: 4 }} title="Refresh Events">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="side-panel-body" style={{ display: "flex", flexDirection: "column", height: "calc(100% - 45px)" }}>
        {/* Candidate Banner */}
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--c-surface-2)",
            border: "1px solid var(--c-border)",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--c-text-2)" }}>
            Candidate:{" "}
            <strong style={{ color: "var(--c-cyan)" }}>
              {interviewState.candidateName || "Candidate"}
            </strong>
          </div>
          <div style={{ fontSize: 9, color: "var(--c-text-3)", marginTop: 2 }}>
            Real-time focus and page visibility telemetry
          </div>
        </div>

        {/* Live event stream list */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingRight: 4,
          }}
        >
          {combinedEvents.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--c-text-3)", fontSize: 11, padding: 30 }}>
              No focus or execution events recorded yet.
            </div>
          ) : (
            combinedEvents.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background:
                    item.type === "warning"
                      ? "rgba(244,63,94,0.08)"
                      : item.type === "success"
                      ? "rgba(16,185,129,0.08)"
                      : "var(--c-surface)",
                  border:
                    item.type === "warning"
                      ? "1px solid rgba(244,63,94,0.2)"
                      : item.type === "success"
                      ? "1px solid rgba(16,185,129,0.2)"
                      : "1px solid var(--c-border)",
                }}
              >
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {item.type === "warning" ? (
                    <AlertTriangle size={12} color="var(--c-rose)" />
                  ) : item.type === "success" ? (
                    <CheckCircle2 size={12} color="var(--c-emerald)" />
                  ) : (
                    <Activity size={12} color="var(--c-cyan)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        item.type === "warning"
                          ? "#fda4af"
                          : item.type === "success"
                          ? "#a7f3d0"
                          : "var(--c-text)",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {item.text}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--c-text-3)",
                      marginTop: 2,
                    }}
                  >
                    {item.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Helpers to format event strings
function formatEventText(eventType, candidateName = "Candidate") {
  switch (eventType) {
    case "INTERVIEW_STARTED":
      return `Interview started for ${candidateName}`;
    case "INTERVIEW_ENDED":
      return `Interview ended`;
    case "TAB_HIDDEN":
      return `⚠ Page became hidden (tab switched)`;
    case "TAB_VISIBLE":
      return `✓ Candidate returned to interview page`;
    case "WINDOW_BLURRED":
      return `⚠ Window lost focus`;
    case "WINDOW_FOCUSED":
      return `✓ Candidate focused window`;
    case "FULLSCREEN_ENTERED":
      return `Candidate entered fullscreen`;
    case "FULLSCREEN_EXITED":
      return `⚠ Fullscreen exited`;
    case "CODE_EXECUTED":
      return `Code executed`;
    case "CODE_EXECUTION_SUCCESS":
      return `Code execution successful`;
    case "CODE_EXECUTION_FAILURE":
      return `Code execution failed`;
    default:
      return `${candidateName}: ${eventType}`;
  }
}

function getEventTypeTag(eventType) {
  if (["TAB_HIDDEN", "WINDOW_BLURRED", "FULLSCREEN_EXITED", "CODE_EXECUTION_FAILURE"].includes(eventType)) {
    return "warning";
  }
  if (["TAB_VISIBLE", "WINDOW_FOCUSED", "CODE_EXECUTION_SUCCESS"].includes(eventType)) {
    return "success";
  }
  return "info";
}
