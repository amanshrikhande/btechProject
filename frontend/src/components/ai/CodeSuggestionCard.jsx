import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Wand2, Copy, CheckCheck } from "lucide-react";

/**
 * CodeSuggestionCard
 *
 * Renders an inline code suggestion inside the AI chat bubble.
 * Props:
 *   codeChange  — { fileId, filePath, startLine, endLine, newCode, description }
 *   onApply     — callback(codeChange) called when user clicks Apply
 *   onDismiss   — callback() called when user clicks Dismiss
 */
export const CodeSuggestionCard = ({ codeChange, onApply, onDismiss }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!codeChange) return null;

  const { filePath, startLine, endLine, newCode, description } = codeChange;
  const fileName = filePath?.split("/").pop() || filePath;
  const lineRange = startLine && endLine ? `L${startLine}–L${endLine}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(newCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    setApplied(true);
    onApply(codeChange);
  };

  return (
    <div
      style={{
        margin: "10px 0 4px 0",
        borderRadius: 8,
        border: applied
          ? "1px solid rgba(16,185,129,0.5)"
          : "1px solid rgba(6,182,212,0.4)",
        background: applied
          ? "rgba(16,185,129,0.06)"
          : "rgba(6,182,212,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Wand2 size={13} style={{ color: "var(--c-cyan)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-cyan)" }}>
            Suggested Change
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(6,182,212,0.12)",
              border: "1px solid rgba(6,182,212,0.25)",
              color: "var(--c-text-2)",
            }}
          >
            {fileName}
            {lineRange ? ` · ${lineRange}` : ""}
          </span>
          {applied && (
            <span
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.35)",
                color: "var(--c-green)",
                fontWeight: 700,
              }}
            >
              ✓ Applied
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {expanded ? (
            <ChevronUp size={12} style={{ color: "var(--c-text-3)" }} />
          ) : (
            <ChevronDown size={12} style={{ color: "var(--c-text-3)" }} />
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Description */}
          {description && (
            <div
              style={{
                padding: "6px 12px",
                fontSize: 11,
                color: "var(--c-text-2)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontStyle: "italic",
              }}
            >
              {description}
            </div>
          )}

          {/* Code block */}
          <div style={{ position: "relative" }}>
            <pre
              style={{
                margin: 0,
                padding: "12px 12px",
                fontFamily: "monospace",
                fontSize: 11.5,
                lineHeight: 1.55,
                color: "#e2e8f0",
                background: "#080a14",
                overflowX: "auto",
                whiteSpace: "pre",
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {newCode}
            </pre>
            {/* Copy button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 5,
                padding: "3px 7px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--c-text-3)",
                fontSize: 10,
              }}
              title="Copy code"
            >
              {copied ? <CheckCheck size={11} style={{ color: "var(--c-green)" }} /> : <Copy size={11} />}
            </button>
          </div>

          {/* Action row */}
          {!applied && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                padding: "8px 12px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "rgba(244,63,94,0.08)",
                  border: "1px solid rgba(244,63,94,0.3)",
                  color: "var(--c-rose)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <X size={11} />
                Dismiss
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleApply(); }}
                style={{
                  padding: "4px 14px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(59,130,246,0.2))",
                  border: "1px solid rgba(6,182,212,0.5)",
                  color: "var(--c-cyan)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: "0 0 10px rgba(6,182,212,0.2)",
                }}
              >
                <Check size={11} />
                Apply to Editor
              </button>
            </div>
          )}

          {applied && (
            <div
              style={{
                padding: "7px 12px",
                borderTop: "1px solid rgba(16,185,129,0.2)",
                fontSize: 11,
                color: "var(--c-green)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={12} />
              Change applied to {fileName} — only lines {lineRange} were replaced.
            </div>
          )}
        </>
      )}
    </div>
  );
};
