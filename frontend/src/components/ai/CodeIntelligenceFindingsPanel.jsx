import React from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Zap,
  Code2,
  FileCode,
  Check,
  ChevronRight,
} from "lucide-react";

export const CodeIntelligenceFindingsPanel = ({
  status = "FINDINGS",
  findings = [],
  intent = "BUG",
  analysisMethods = [],
}) => {
  const { jumpToFileAndLine } = useWorkspace();

  // 1. NO_FINDING State: Clean informational banner without fake cards
  if (status === "NO_FINDING" || (findings.length === 0 && status !== "FINDINGS")) {
    return (
      <div
        style={{
          margin: "12px 0",
          padding: "14px 16px",
          borderRadius: 8,
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#10b981",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <CheckCircle size={16} />
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#34d399",
              marginBottom: 4,
            }}
          >
            No significant issues found.
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--c-text-2)",
              lineHeight: 1.5,
            }}
          >
            The system could not establish a sufficiently supported issue from
            the analyzed project evidence.
          </div>
        </div>
      </div>
    );
  }

  // 2. FINDINGS State: Display grounded finding cards
  return (
    <div style={{ margin: "14px 0", display: "flex", flexDirection: "column", gap: 12 }}>
      {findings.map((f, idx) => {
        const isVerified = f.verification === "VERIFIED";
        const lineRangeText =
          f.startLine === f.endLine
            ? `L${f.startLine}`
            : `L${f.startLine}–L${f.endLine}`;

        const severityColor =
          f.severity === "CRITICAL"
            ? "#f43f5e"
            : f.severity === "HIGH"
            ? "#f97316"
            : f.severity === "MEDIUM"
            ? "#eab308"
            : "#06b6d4";

        return (
          <div
            key={idx}
            style={{
              borderRadius: 8,
              background: "#0f1226",
              border: isVerified
                ? "1px solid rgba(244, 63, 94, 0.4)"
                : "1px solid rgba(234, 179, 8, 0.35)",
              overflow: "hidden",
              boxShadow: "0 4px 18px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Header / Title Bar */}
            <div
              style={{
                padding: "10px 14px",
                background: isVerified
                  ? "linear-gradient(90deg, rgba(244, 63, 94, 0.18), rgba(15, 18, 38, 0.8))"
                  : "linear-gradient(90deg, rgba(234, 179, 8, 0.14), rgba(15, 18, 38, 0.8))",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Verification Badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: 4,
                    letterSpacing: "0.5px",
                    background: isVerified ? "rgba(244, 63, 94, 0.25)" : "rgba(234, 179, 8, 0.2)",
                    color: isVerified ? "#f43f5e" : "#facc15",
                    border: isVerified ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(234, 179, 8, 0.35)",
                  }}
                >
                  {isVerified ? "Verified Issue" : "Potential Issue"}
                </span>

                {/* Category Badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--c-text-2)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {f.category || "RUNTIME_ERROR"}
                </span>

                {/* Severity Badge */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    color: severityColor,
                    background: `${severityColor}18`,
                    border: `1px solid ${severityColor}40`,
                  }}
                >
                  {f.severity || "MEDIUM"}
                </span>
              </div>

              {/* Navigation Action */}
              <button
                onClick={() =>
                  jumpToFileAndLine(
                    f.fileId ? { fileId: f.fileId, filePath: f.filePath } : f.filePath,
                    f.startLine,
                    f.endLine
                  )
                }
                className="btn-ghost"
                style={{
                  padding: "3px 9px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--c-cyan)",
                  border: "1px solid rgba(6, 182, 212, 0.35)",
                  background: "rgba(6, 182, 212, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                }}
                title={`Open ${f.filePath || "file"} at ${lineRangeText} in Monaco`}
              >
                <ExternalLink size={11} />
                <span>Open in Editor ({lineRangeText})</span>
              </button>
            </div>

            {/* File Location & Symbol Banner */}
            <div
              style={{
                padding: "8px 14px",
                background: "rgba(0, 0, 0, 0.25)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "monospace",
                color: "var(--c-text-3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FileCode size={13} style={{ color: "var(--c-cyan)" }} />
                <span style={{ color: "var(--c-text)" }}>{f.filePath}</span>
                <span style={{ color: "var(--c-cyan)" }}>({lineRangeText})</span>
              </div>
              {f.symbol && f.symbol !== "module_scope" && (
                <div style={{ color: "var(--c-text-2)" }}>
                  Symbol: <span style={{ color: "var(--c-cyan)" }}>{f.symbol}</span>
                </div>
              )}
            </div>

            {/* Finding Body */}
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Evidence Snippet */}
              {f.evidence && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--c-text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 4,
                    }}
                  >
                    Source Evidence
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "#080a14",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 11,
                      color: "#fca5a5",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {f.evidence}
                  </pre>
                </div>
              )}

              {/* Analysis Signals */}
              {f.analysisSignals && f.analysisSignals.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "var(--c-text-3)", textTransform: "uppercase" }}>
                    Signals:
                  </span>
                  {f.analysisSignals.map((sig, sIdx) => (
                    <span
                      key={sIdx}
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "rgba(99, 102, 241, 0.15)",
                        color: "#a5b4fc",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      {sig}
                    </span>
                  ))}
                  {f.modelConfidence && (
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "var(--c-text-3)",
                        marginLeft: 4,
                      }}
                    >
                      Analyzer confidence: {f.modelConfidence}
                    </span>
                  )}
                </div>
              )}

              {/* Technical Explanation */}
              {f.explanation && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--c-text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 3,
                    }}
                  >
                    Technical Explanation
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--c-text)",
                      lineHeight: 1.5,
                    }}
                  >
                    {f.explanation}
                  </div>
                </div>
              )}

              {/* Impact */}
              {f.impact && (
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    fontSize: 11,
                    color: "#fca5a5",
                    lineHeight: 1.45,
                  }}
                >
                  <strong>Impact:</strong> {f.impact}
                </div>
              )}

              {/* Suggested Improvement */}
              {f.suggestedImprovement && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--c-text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 3,
                    }}
                  >
                    Suggested Improvement
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--c-text-2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {f.suggestedImprovement}
                  </div>
                </div>
              )}

              {/* Suggested Corrected Code */}
              {f.suggestedCode && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#34d399",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Code2 size={11} /> Suggested Corrected Code
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "#080a14",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 11,
                      color: "#6ee7b7",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {f.suggestedCode}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
