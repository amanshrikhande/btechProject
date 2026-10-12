import React, { useState } from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { Layers, ChevronDown, ChevronUp, FileCode, ExternalLink, Hash, Code } from "lucide-react";

export const RAGEvidencePanel = ({
  sources = [],
  retrievalMetadata = null,
  rawContext = null,
  debugTrace = null,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showRawContext, setShowRawContext] = useState(false);
  const { jumpToFileAndLine } = useWorkspace();

  if ((!sources || sources.length === 0) && !rawContext) return null;

  const uniqueFilesCount = new Set(
    (sources || []).map((s) => s.fileName || (s.filePath ? s.filePath.split("/").pop().split("\\").pop() : "file"))
  ).size;

  return (
    <div
      style={{
        margin: "10px 0",
        borderRadius: 8,
        background: "#0d0f20",
        border: "1px solid rgba(6,182,212,0.3)",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px",
          background: "linear-gradient(90deg, rgba(6,182,212,0.15), rgba(99,102,241,0.1))",
          borderBottom: "1px solid rgba(6,182,212,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: "rgba(6,182,212,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--c-cyan)",
            }}
          >
            <Layers size={13} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--c-cyan)",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                }}
              >
                Retrieved Context
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(6,182,212,0.2)",
                  color: "var(--c-cyan)",
                  border: "1px solid rgba(6,182,212,0.3)",
                }}
              >
                {uniqueFilesCount} {uniqueFilesCount === 1 ? "file" : "files"}, {sources.length} {sources.length === 1 ? "chunk" : "chunks"}
              </span>
            </div>

            {retrievalMetadata?.retrievalTimeMs ? (
              <span style={{ fontSize: 10, color: "var(--c-text-3)", fontFamily: "monospace" }}>
                Hybrid Retrieval: {retrievalMetadata.retrievalTimeMs}ms
                {retrievalMetadata.exactMatchesCount > 0 && ` · ${retrievalMetadata.exactMatchesCount} exact`}
                {retrievalMetadata.lexicalCount > 0 && ` · ${retrievalMetadata.lexicalCount} lexical`}
                {retrievalMetadata.semanticCount > 0 && ` · ${retrievalMetadata.semanticCount} semantic`}
                {retrievalMetadata.structuralCount > 0 && ` · ${retrievalMetadata.structuralCount} structural`}
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-cyan)", fontSize: 11 }}>
          <span>{expanded ? "Hide" : "Show"}</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {/* Chunks List */}
      {expanded && (
        <>
          <div
            style={{
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {sources.map((src, idx) => {
              const rank = src.rank || idx + 1;
              const startLine = src.startLine || 1;
              const endLine = src.endLine || startLine + 10;
              const fileName =
                src.fileName || (src.filePath ? src.filePath.split("/").pop().split("\\").pop() : "file");
              const score = typeof src.score === "number" ? src.score : null;

              return (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "#080914",
                    border: "1px solid var(--c-border)",
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <span
                        style={{
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.08)",
                          color: "var(--c-cyan)",
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        #{rank}
                      </span>
                      <FileCode size={13} style={{ color: "var(--c-cyan)", flexShrink: 0 }} />
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--c-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fileName}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--c-text-3)" }}>
                        L{startLine}–L{endLine}
                      </span>
                    </div>

                    {score !== null && (
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: 10,
                          background: "rgba(16,185,129,0.12)",
                          color: "var(--c-green)",
                          border: "1px solid rgba(16,185,129,0.25)",
                          fontSize: 10,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        Score: {score}
                      </span>
                    )}
                  </div>

                  {src.retrievalSources && src.retrievalSources.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>
                      {src.retrievalSources.map((rs, rIdx) => {
                        const isExact = rs.includes("filename");
                        const isLex = rs.includes("keyword") || rs.includes("lexical");
                        const isSem = rs.includes("semantic");
                        const isDep = rs.includes("dependency");
                        const bg = isExact
                          ? "rgba(245, 158, 11, 0.15)"
                          : isLex
                          ? "rgba(59, 130, 246, 0.15)"
                          : isSem
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(168, 85, 247, 0.15)";
                        const border = isExact
                          ? "rgba(245, 158, 11, 0.3)"
                          : isLex
                          ? "rgba(59, 130, 246, 0.3)"
                          : isSem
                          ? "rgba(16, 185, 129, 0.3)"
                          : "rgba(168, 85, 247, 0.3)";
                        const color = isExact
                          ? "#fbbf24"
                          : isLex
                          ? "#60a5fa"
                          : isSem
                          ? "#34d399"
                          : "#c084fc";
                        const label = isExact
                          ? "Exact Filename"
                          : isLex
                          ? "BM25 Lexical"
                          : isSem
                          ? "ChromaDB Semantic"
                          : "Dependency Graph";
                        return (
                          <span
                            key={rIdx}
                            style={{
                              fontSize: 9,
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: bg,
                              border: `1px solid ${border}`,
                              color: color,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {src.symbol && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        color: "var(--c-purple)",
                        marginBottom: 5,
                      }}
                    >
                      <Hash size={11} />
                      <span>
                        Symbol: {src.symbol} ({src.symbolType || "block"})
                      </span>
                    </div>
                  )}

                  {/* Snippet Preview */}
                  <pre
                    style={{
                      padding: "6px 8px",
                      borderRadius: 4,
                      background: "#04050a",
                      border: "1px solid rgba(255,255,255,0.05)",
                      fontSize: 10,
                      color: "#cbd5e1",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.4,
                      maxHeight: 80,
                      overflowY: "auto",
                      margin: "4px 0",
                    }}
                  >
                    {src.snippet || src.content || "// snippet preview"}
                  </pre>

                  {/* Jump to Monaco Editor */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button
                      onClick={() =>
                        jumpToFileAndLine(
                          src.fileId ? { fileId: src.fileId, filePath: src.filePath, fileName: src.fileName } : (src.filePath || src.fileName),
                          startLine,
                          endLine
                        )
                      }
                      className="btn-ghost"
                      style={{
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontSize: 10,
                        color: "var(--c-cyan)",
                        border: "1px solid rgba(6,182,212,0.25)",
                        background: "rgba(6,182,212,0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontFamily: "var(--font-sans)",
                      }}
                      title={`Open ${fileName} at Line ${startLine}${endLine && endLine !== startLine ? `–${endLine}` : ""} in Monaco Editor`}
                    >
                      <ExternalLink size={10} />
                      <span>Open in Editor (L{startLine}{endLine && endLine !== startLine ? `–L${endLine}` : ""})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Raw Context Dev Inspection Panel */}
          {rawContext && (
            <div
              style={{
                padding: "8px 12px",
                borderTop: "1px solid rgba(6,182,212,0.15)",
                background: "rgba(6,182,212,0.03)",
              }}
            >
              <button
                onClick={() => setShowRawContext(!showRawContext)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  color: "var(--c-cyan)",
                  border: "1px solid rgba(6,182,212,0.25)",
                  background: showRawContext ? "rgba(6,182,212,0.18)" : "rgba(6,182,212,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
                title="Inspect the exact grounded context injected into the LLM prompt"
              >
                <Code size={11} />
                <span>{showRawContext ? "Hide Retrieved Context" : "Show Retrieved Context"}</span>
              </button>

              {showRawContext && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "var(--c-text-3)",
                      marginBottom: 4,
                      fontFamily: "monospace",
                    }}
                  >
                    <span>Raw Context Injected to LLM</span>
                    <span>{rawContext.length} chars</span>
                  </div>
                  <pre
                    style={{
                      padding: "8px 10px",
                      background: "#04050a",
                      border: "1px solid rgba(6,182,212,0.2)",
                      borderRadius: 6,
                      fontSize: 10,
                      color: "#94a3b8",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 200,
                      overflowY: "auto",
                      fontFamily: "monospace",
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    {rawContext}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
