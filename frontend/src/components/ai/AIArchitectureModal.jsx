import { useEffect } from "react";
import { X, ArrowDown, ShieldCheck, Cpu, Database, Network } from "lucide-react";

export const AIArchitectureModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      num: "1",
      color: "var(--c-blue)",
      bg: "rgba(59,130,246,0.15)",
      border: "rgba(59,130,246,0.3)",
      title: "Developer Query & Workspace State Capture",
      desc: "Captures natural language question + active file + Monaco buffer + stderr runtime errors",
    },
    {
      num: "2",
      color: "var(--c-cyan)",
      bg: "rgba(6,182,212,0.15)",
      border: "rgba(6,182,212,0.3)",
      title: "Dense Semantic Vector Embedding",
      desc: "Encodes the query into a 384-dimensional dense semantic vector via sentence-transformers",
    },
    {
      num: "3",
      color: "var(--c-purple)",
      bg: "rgba(168,85,247,0.15)",
      border: "rgba(168,85,247,0.3)",
      title: "ChromaDB Project-Isolated Collection (proj_<id>)",
      desc: "Executes cosine similarity search over chunked codebase; retrieves top-K relevant chunks with exact line spans",
    },
    {
      num: "4",
      color: "var(--c-indigo)",
      bg: "rgba(99,102,241,0.15)",
      border: "rgba(99,102,241,0.3)",
      title: "Context Construction & CodeBERT Defect Audit",
      desc: "Assembles retrieved file context, symbol hierarchies, and ML defect classifications into system prompt",
    },
    {
      num: "5",
      color: "var(--c-green)",
      bg: "rgba(16,185,129,0.15)",
      border: "rgba(16,185,129,0.3)",
      title: "Local Ollama LLM Inference (qwen2.5-coder:1.5b)",
      desc: "Generates grounded technical response on localhost:11434 with zero external telemetry or cloud leakage",
    },
    {
      num: "6",
      color: "var(--c-amber)",
      bg: "rgba(245,158,11,0.15)",
      border: "rgba(245,158,11,0.3)",
      title: "Final Answer with Interactive Citations & Editor Jumps",
      desc: "Renders markdown answer with Evidence Panel, cosine similarity scores, and Monaco editor line jump buttons",
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box modal-lg"
        style={{
          maxWidth: 680,
          width: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "#0d0f1c",
          border: "1px solid rgba(6,182,212,0.3)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 20px rgba(6,182,212,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--c-border)",
            background: "#111324",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(168,85,247,0.15)",
                border: "1px solid rgba(168,85,247,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--c-purple)",
              }}
            >
              <Network size={17} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", margin: 0 }}>
                DevShare AI Architecture Pipeline
              </h2>
              <span style={{ fontSize: 11, color: "var(--c-cyan)", fontFamily: "monospace" }}>
                Multi-File RAG + ChromaDB + Local Ollama
              </span>
            </div>
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

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {steps.map((s, idx) => (
            <div key={s.num}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "#131525",
                  border: `1px solid ${s.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: s.color,
                    flexShrink: 0,
                  }}
                >
                  {s.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 2 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--c-text-2)", lineHeight: 1.5 }}>
                    {s.desc}
                  </div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <ArrowDown size={14} style={{ color: "var(--c-cyan)", opacity: 0.6 }} />
                </div>
              )}
            </div>
          ))}

          {/* Separation Guarantee Callout */}
          <div
            style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(6,182,212,0.06)",
              border: "1px solid rgba(6,182,212,0.25)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <ShieldCheck size={18} style={{ color: "var(--c-cyan)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "var(--c-text-2)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--c-text)" }}>Strict Separation Guarantee: </strong>
              Antigravity (Gemini) is used strictly as an external development assistant. The DevShare runtime exclusively queries your locally hosted <strong>Ollama instance</strong> and in-memory <strong>ChromaDB collections</strong>. Zero user code or workspace data is ever transmitted to cloud AI providers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
