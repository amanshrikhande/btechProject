import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, FileCode, CornerDownLeft, Sparkles } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";

const CodeBlock = ({ inline, className, children, ...props }) => {
  const { setCode, handleCodeChange, activeFile } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  if (inline) {
    return (
      <code
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          background: "rgba(6,182,212,0.12)",
          color: "var(--c-cyan)",
          padding: "2px 6px",
          borderRadius: "4px",
          border: "1px solid rgba(6,182,212,0.2)",
        }}
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    setCode(codeString);
    handleCodeChange(codeString);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  return (
    <div
      style={{
        margin: "10px 0",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "#080a14",
      }}
    >
      {/* Code Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "#101322",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <FileCode size={12} color="var(--c-cyan)" />
          <span
            style={{
              fontSize: "10px",
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--c-text-2)",
              letterSpacing: "0.5px",
            }}
          >
            {lang || "code"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={handleInsert}
            className="btn-ghost btn-xs"
            title="Replace editor content with this code"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "10px",
              color: inserted ? "var(--c-emerald)" : "var(--c-cyan)",
              padding: "2px 6px",
            }}
          >
            {inserted ? <Check size={11} /> : <CornerDownLeft size={11} />}
            {inserted ? "Applied" : "Apply to Editor"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-ghost btn-xs"
            title="Copy code"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "10px",
              color: copied ? "var(--c-emerald)" : "var(--c-text-3)",
              padding: "2px 6px",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <pre
        style={{
          margin: 0,
          padding: "12px",
          overflowX: "auto",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          lineHeight: 1.65,
          color: "#e2e8f0",
          background: "#080a14",
        }}
      >
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

export const MarkdownMessage = ({ content }) => {
  return (
    <div className="markdown-body" style={{ fontSize: "11.5px", lineHeight: 1.65 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          h1: ({ children }) => (
            <h1
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "var(--c-text)",
                marginTop: "12px",
                marginBottom: "6px",
                paddingBottom: "4px",
                borderBottom: "1px solid var(--c-border)",
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--c-cyan)",
                marginTop: "10px",
                marginBottom: "4px",
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--c-purple)",
                marginTop: "8px",
                marginBottom: "3px",
              }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => <p style={{ marginBottom: "8px", color: "var(--c-text-2)" }}>{children}</p>,
          ul: ({ children }) => (
            <ul style={{ paddingLeft: "16px", marginBottom: "8px", color: "var(--c-text-2)" }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: "16px", marginBottom: "8px", color: "var(--c-text-2)" }}>{children}</ol>
          ),
          li: ({ children }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: "var(--c-text)" }}>{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                margin: "8px 0",
                paddingLeft: "10px",
                borderLeft: "3px solid var(--c-cyan)",
                color: "var(--c-text-3)",
                fontStyle: "italic",
              }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "8px 0" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  border: "1px solid var(--c-border)",
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                padding: "5px 8px",
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border)",
                textAlign: "left",
                color: "var(--c-text)",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding: "4px 8px",
                border: "1px solid var(--c-border)",
                color: "var(--c-text-2)",
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
