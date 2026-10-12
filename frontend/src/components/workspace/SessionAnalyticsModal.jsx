import { useState, useEffect } from "react";
import { Modal } from "../common/Modal.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import {
  BarChart2,
  Clock,
  Users,
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  Activity,
  GitCommit,
  RefreshCw,
} from "lucide-react";
import axios from "axios";

export const SessionAnalyticsModal = ({ isOpen, onClose }) => {
  const { activeRoom } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const fetchAnalytics = async () => {
    if (!activeRoom) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${backendUrl}/api/analytics/room/${activeRoom}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("[Fetch Analytics Error]:", err);
      setError("Failed to load session analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeRoom) {
      fetchAnalytics();
    }
  }, [isOpen, activeRoom]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session Research & Collaboration Analytics">
      <div className="space-y-4" style={{ maxHeight: "75vh", overflowY: "auto", paddingRight: 4 }}>
        {/* Header toolbar */}
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 12, color: "var(--c-text-2)" }}>
            Empirical telemetry recorded for room:{" "}
            <strong style={{ color: "var(--c-cyan)", fontFamily: "monospace" }}>{activeRoom}</strong>
          </div>
          <button
            onClick={fetchAnalytics}
            className="btn btn-secondary btn-sm"
            style={{ padding: "4px 8px", fontSize: 11 }}
            title="Refresh Metrics"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 10 }}>
            <div className="spinner spinner-md" />
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--c-text-3)" }}>
              Calculating session metrics...
            </span>
          </div>
        ) : error ? (
          <div style={{ padding: 16, textAlign: "center", color: "var(--c-rose)", fontSize: 12 }}>
            {error}
          </div>
        ) : data ? (
          <>
            {/* Experiment Configuration Tags */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border)",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--c-text-3)" }}>
                Experiment Condition:
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "var(--c-cyan-dim)",
                  color: "var(--c-cyan)",
                  border: "1px solid rgba(6,182,212,0.2)",
                }}
              >
                Collab Mode: {data.collaborationMode}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "var(--c-purple-dim)",
                  color: "var(--c-purple)",
                  border: "1px solid rgba(168,85,247,0.2)",
                }}
              >
                AI Model: {data.aiMode}
              </span>
              {data.interviewActive && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: "rgba(244,63,94,0.15)",
                    color: "var(--c-rose)",
                    border: "1px solid rgba(244,63,94,0.3)",
                  }}
                >
                  Interview Active: {data.candidateName || "Candidate"}
                </span>
              )}
            </div>

            {/* Core Measured Metrics Grid */}
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
                Session Metrics
              </div>

              <div className="grid grid-3" style={{ gap: 10 }}>
                {/* Duration */}
                <MetricCard
                  icon={<Clock size={16} color="var(--c-cyan)" />}
                  label="Duration"
                  value={data.durationFormatted}
                  subtext={`${data.sessionDuration} minutes total`}
                />
                {/* Participants */}
                <MetricCard
                  icon={<Users size={16} color="var(--c-indigo)" />}
                  label="Participants"
                  value={data.participantsCount}
                  subtext={data.participantsList?.join(", ") || "Active room"}
                />
                {/* Code Changes */}
                <MetricCard
                  icon={<Code2 size={16} color="var(--c-purple)" />}
                  label="Code Changes"
                  value={data.codeChanges}
                  subtext="Meaningful edits"
                />
                {/* Executions */}
                <MetricCard
                  icon={<Play size={16} color="var(--c-amber)" />}
                  label="Executions"
                  value={data.executions}
                  subtext={`${data.successfulExecutions} success · ${data.failedExecutions} failed`}
                />
                {/* AI Requests */}
                <MetricCard
                  icon={<Sparkles size={16} color="var(--c-purple)" />}
                  label="AI Requests"
                  value={data.aiRequests}
                  subtext={`${data.aiResponses} responses`}
                />
                {/* Permission Changes */}
                <MetricCard
                  icon={<ShieldCheck size={16} color="var(--c-emerald)" />}
                  label="Permission Changes"
                  value={data.permissionChanges}
                  subtext={`${data.leaderModeChanges} mode toggles`}
                />
                {/* Focus Events */}
                <MetricCard
                  icon={<Activity size={16} color="var(--c-rose)" />}
                  label="Focus Events"
                  value={data.focusEvents}
                  subtext="Visibility/blur events"
                />
                {/* Total Events */}
                <MetricCard
                  icon={<GitCommit size={16} color="var(--c-cyan)" />}
                  label="Recorded Events"
                  value={data.totalEventsRecorded}
                  subtext="Database audit events"
                />
              </div>
            </div>

            {/* Research Calculations */}
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
                Collaboration Research Metrics
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: "var(--radius)",
                  background: "var(--c-surface-2)",
                  border: "1px solid var(--c-border)",
                }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--c-text-2)" }}>AI Assistance Rate (Requests/Hour):</span>
                  <strong style={{ color: "var(--c-purple)", fontFamily: "monospace" }}>
                    {data.aiAssistanceRate} req/hr
                  </strong>
                </div>

                <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--c-text-2)" }}>Task Efficiency (Successful Runs/Hour):</span>
                  <strong style={{ color: "var(--c-emerald)", fontFamily: "monospace" }}>
                    {data.taskEfficiency} runs/hr
                  </strong>
                </div>

                <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--c-text-2)" }}>Conflict Rate:</span>
                  <strong style={{ color: "var(--c-cyan)", fontFamily: "monospace" }}>
                    {data.conflictRate}
                  </strong>
                </div>

                {/* Edit Participation Breakdown */}
                {data.editParticipation && data.editParticipation.length > 0 && (
                  <div style={{ paddingTop: 6, borderTop: "1px solid var(--c-border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text-2)", marginBottom: 8 }}>
                      Edit Participation Ratio:
                    </div>
                    <div className="space-y-2">
                      {data.editParticipation.map((u, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1" style={{ fontSize: 11 }}>
                            <span style={{ color: "var(--c-text)" }}>{u.userName}</span>
                            <span style={{ color: "var(--c-cyan)", fontFamily: "monospace" }}>
                              {u.edits} edits ({u.percentage}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 5,
                              borderRadius: 99,
                              background: "rgba(255,255,255,0.06)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, u.percentage)}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, var(--c-cyan), var(--c-indigo))",
                                borderRadius: 99,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};

const MetricCard = ({ icon, label, value, subtext }) => (
  <div
    style={{
      padding: "10px 12px",
      borderRadius: "var(--radius-sm)",
      background: "var(--c-surface-2)",
      border: "1px solid var(--c-border)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div className="flex items-center justify-between mb-1">
      <span style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: 500 }}>{label}</span>
      {icon}
    </div>
    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--c-text)", fontFamily: "'JetBrains Mono', monospace" }}>
      {value}
    </div>
    {subtext && (
      <div style={{ fontSize: 9, color: "var(--c-text-3)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {subtext}
      </div>
    )}
  </div>
);
