import { useState, useEffect } from "react";
import { aiAPI } from "../../api/ai.api.js";
import { X, Play, Zap, Database, ArrowRight, Layers, Clock, Cpu, CheckCircle2 } from "lucide-react";

const SAMPLE_BENCHMARK_QUESTIONS = [
  "Where is authentication implemented and how are credentials validated?",
  "Which component initializes Socket.IO and handles real-time room connections?",
  "How does registration reach MongoDB and what fields are persisted on the user document?",
  "Where is Leader Mode authorization enforced and how are non-leader edits rejected?",
  "Where is MongoDB connection initialized?",
  "How does code execution flow from Monaco to the execution service?",
];

export const AIComparisonModal = ({ isOpen, onClose, project, activeFile, code, language }) => {
  const [question, setQuestion] = useState(SAMPLE_BENCHMARK_QUESTIONS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [genericResult, setGenericResult] = useState(null);
  const [ragResult, setRagResult] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRunComparison = async () => {
    if (!question.trim() || isRunning) return;
    setIsRunning(true);
    setGenericResult(null);
    setRagResult(null);

    try {
      // 1. Run Generic AI (Condition: GENERIC)
      const t0Gen = Date.now();
      const genRes = await aiAPI.chatAssistant({
        message: question,
        projectId: project?._id,
        activeFileName: activeFile?.name || "main",
        activeCode: code,
        language,
        condition: "GENERIC",
      });
      const genTotal = Date.now() - t0Gen;
      setGenericResult({
        answer: genRes.data?.response || "No response generated.",
        sources: [],
        latencyMs: genRes.data?.latency_ms || genTotal,
        llmLatencyMs: genRes.data?.llm_latency_ms || 0,
        model: genRes.data?.model || "qwen2.5-coder:1.5b",
        provider: genRes.data?.provider || "ollama",
        fallback: genRes.data?.fallback || false,
      });

      // 2. Run Project RAG (Condition: RAG)
      const t0Rag = Date.now();
      const ragRes = await aiAPI.chatAssistant({
        message: question,
        projectId: project?._id,
        activeFileName: activeFile?.name || "main",
        activeCode: code,
        language,
        condition: "RAG",
      });
      const ragTotal = Date.now() - t0Rag;
      setRagResult({
        answer: ragRes.data?.response || "No response generated.",
        sources: ragRes.data?.sources || [],
        retrievalMetadata: ragRes.data?.retrievalMetadata || {},
        latencyMs: ragRes.data?.latency_ms || ragTotal,
        retrievalLatencyMs: ragRes.data?.retrievalMetadata?.retrievalTimeMs || 0,
        llmLatencyMs: ragRes.data?.llm_latency_ms || 0,
        model: ragRes.data?.model || "qwen2.5-coder:1.5b",
        provider: ragRes.data?.provider || "ollama",
        fallback: ragRes.data?.fallback || false,
      });
    } catch (e) {
      console.error("[Comparison Run Error]:", e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box modal-lg"
        style={{
          maxWidth: 1060,
          width: "95vw",
          height: "88vh",
          display: "flex",
          flexDirection: "column",
          background: "#0c0e1c",
          border: "1px solid rgba(6,182,212,0.3)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 24px rgba(6,182,212,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--c-border)",
            background: "#101326",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>
                Generic AI vs. Project-Aware RAG Comparison
              </h2>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: "rgba(6,182,212,0.15)",
                  color: "var(--c-cyan)",
                  border: "1px solid rgba(6,182,212,0.3)",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                Side-by-Side Benchmark
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--c-text-3)", margin: "3px 0 0 0" }}>
              Same local model (<code style={{ color: "var(--c-cyan)" }}>qwen2.5-coder:1.5b</code>) tested with zero repo context vs. multi-file ChromaDB embeddings.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: 6, color: "var(--c-text-3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-rose)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-3)")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Question Selector & Query Bar */}
        <div
          style={{
            padding: "14px 22px",
            background: "#080a14",
            borderBottom: "1px solid var(--c-border)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text-2)", marginBottom: 8 }}>
            Select Benchmark Question:
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 8,
              marginBottom: 10,
              scrollbarWidth: "thin",
            }}
          >
            {SAMPLE_BENCHMARK_QUESTIONS.slice(0, 4).map((q, idx) => (
              <button
                key={idx}
                onClick={() => setQuestion(q)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: question === q ? "1px solid var(--c-cyan)" : "1px solid var(--c-border)",
                  background: question === q ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.03)",
                  color: question === q ? "var(--c-cyan)" : "var(--c-text-2)",
                  fontWeight: question === q ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                Q{idx + 1}: {q.substring(0, 42)}...
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter benchmark question..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#101222",
                border: "1px solid var(--c-border)",
                color: "var(--c-text)",
                fontSize: 12,
                outline: "none",
                fontFamily: "monospace",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--c-cyan)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--c-border)")}
            />

            <button
              onClick={handleRunComparison}
              disabled={isRunning || !question.trim()}
              className="btn btn-primary btn-sm"
              style={{
                padding: "8px 18px",
                fontSize: 12,
                boxShadow: "0 0 14px rgba(6,182,212,0.3)",
              }}
            >
              <Play size={13} className={isRunning ? "animate-spin" : ""} />
              <span>{isRunning ? "Evaluating Both..." : "Run Comparison"}</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison Columns */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "16px 22px",
            display: "flex",
            gap: 16,
          }}
        >
          {/* Column 1: Generic AI Baseline */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 10,
              background: "#090a16",
              border: "1px solid rgba(168,85,247,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(168,85,247,0.08)",
                borderBottom: "1px solid rgba(168,85,247,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Cpu size={14} style={{ color: "var(--c-purple)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-purple)" }}>
                  Generic AI (Baseline)
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--c-text-3)" }}>
                Sources: None (Blind)
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px", fontSize: 12 }}>
              {isRunning && !genericResult ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--c-text-3)",
                    gap: 8,
                  }}
                >
                  <Cpu size={24} className="animate-pulse" style={{ color: "var(--c-purple)" }} />
                  <span>Generating baseline answer without project files...</span>
                </div>
              ) : genericResult ? (
                <div>
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--c-border)",
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "var(--c-text-3)",
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <span>Latency: {genericResult.latencyMs}ms</span>
                    <span>Model: {genericResult.model}</span>
                  </div>

                  <div
                    style={{
                      color: "var(--c-text-2)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                    }}
                  >
                    {genericResult.answer}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--c-text-3)",
                  }}
                >
                  Click "Run Comparison" to generate baseline.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Project-Aware RAG */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              borderRadius: 10,
              background: "#090a16",
              border: "1px solid rgba(6,182,212,0.35)",
              boxShadow: "0 0 16px rgba(6,182,212,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(6,182,212,0.1)",
                borderBottom: "1px solid rgba(6,182,212,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Database size={14} style={{ color: "var(--c-cyan)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-cyan)" }}>
                  Project-Aware RAG (DevShare)
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--c-cyan)" }}>
                Sources: {ragResult ? `${ragResult.sources?.length || 0} chunks` : "ChromaDB"}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px", fontSize: 12 }}>
              {isRunning && !ragResult ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--c-cyan)",
                    gap: 8,
                  }}
                >
                  <Database size={24} className="animate-spin" />
                  <span>Retrieving project vectors & synthesizing...</span>
                </div>
              ) : ragResult ? (
                <div>
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(6,182,212,0.08)",
                      border: "1px solid rgba(6,182,212,0.25)",
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "var(--c-cyan)",
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <span>Total Latency: {ragResult.latencyMs}ms</span>
                    <span>Retrieval: {ragResult.retrievalLatencyMs}ms</span>
                  </div>

                  {/* Evidence Source Chips */}
                  {ragResult.sources && ragResult.sources.length > 0 && (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "#101224",
                        border: "1px solid rgba(6,182,212,0.25)",
                        marginBottom: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-cyan)", textTransform: "uppercase" }}>
                        Retrieved Code Evidence:
                      </div>
                      {ragResult.sources.map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 11,
                            fontFamily: "monospace",
                          }}
                        >
                          <span style={{ color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            #{idx + 1} {s.fileName} (Lines {s.startLine}–{s.endLine})
                          </span>
                          <span style={{ color: "var(--c-green)", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                            Score: {s.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      color: "var(--c-text)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                    }}
                  >
                    {ragResult.answer}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--c-text-3)",
                  }}
                >
                  Click "Run Comparison" to evaluate RAG with project context.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
