import { Server, Brain, Monitor } from "lucide-react";

const arch_card_style = (borderColor, bg) => ({
  padding: "28px 24px",
  borderRadius: 16,
  border: `1px solid ${borderColor}`,
  background: "var(--c-surface)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  flex: 1,
});

const pill_style = (color, bg) => ({
  padding: "2px 9px",
  borderRadius: 4,
  fontSize: 10,
  fontFamily: "monospace",
  fontWeight: 600,
  background: bg,
  color: color,
});

export const ArchitectureDiagram = () => (
  <section style={{ padding: "72px 28px", background: "rgba(10,12,20,0.6)", borderTop: "1px solid var(--c-border)", borderBottom: "1px solid var(--c-border)" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-purple)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>System Architecture</p>
        <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Dual-Service Microservice Engine</h2>
        <p style={{ fontSize: 13, color: "var(--c-text-2)", marginTop: 10 }}>
          High-throughput WebSockets on Node.js and dedicated AI/ML inference on Python FastAPI.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {/* Frontend */}
        <div style={arch_card_style("rgba(6,182,212,0.2)")}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--c-cyan-dim)", border: "1px solid rgba(6,182,212,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Monitor size={22} color="var(--c-cyan)" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>React 19 Frontend</h3>
          <p style={{ fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.65, marginBottom: 16 }}>
            Monaco Editor, multi-file tree, real-time presence indicators, terminal console, and AI assistant drawer.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5 }}>
            <span style={pill_style("var(--c-cyan)", "var(--c-cyan-dim)")}>Monaco Editor</span>
            <span style={pill_style("var(--c-cyan)", "var(--c-cyan-dim)")}>Socket.IO Client</span>
          </div>
        </div>

        {/* Backend */}
        <div style={arch_card_style("rgba(99,102,241,0.2)")}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Server size={22} color="var(--c-indigo)" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Node.js Express & Sockets</h3>
          <p style={{ fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.65, marginBottom: 16 }}>
            JWT auth, collaborative rooms, debounced MongoDB autosave, version snapshots, and Piston execution.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5 }}>
            <span style={pill_style("var(--c-indigo)", "rgba(99,102,241,0.1)")}>MongoDB 8.2</span>
            <span style={pill_style("var(--c-indigo)", "rgba(99,102,241,0.1)")}>Socket.IO</span>
            <span style={pill_style("var(--c-indigo)", "rgba(99,102,241,0.1)")}>Piston Engine</span>
          </div>
        </div>

        {/* AI */}
        <div style={arch_card_style("rgba(168,85,247,0.2)")}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--c-purple-dim)", border: "1px solid rgba(168,85,247,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Brain size={22} color="var(--c-purple)" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Python FastAPI AI Engine</h3>
          <p style={{ fontSize: 12, color: "var(--c-text-2)", lineHeight: 1.65, marginBottom: 16 }}>
            CodeBERT defect classifier, ChromaDB repository vector indexing, and local Ollama coding LLM inference.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5 }}>
            <span style={pill_style("var(--c-purple)", "var(--c-purple-dim)")}>CodeBERT</span>
            <span style={pill_style("var(--c-purple)", "var(--c-purple-dim)")}>ChromaDB</span>
            <span style={pill_style("var(--c-purple)", "var(--c-purple-dim)")}>Ollama LLM</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
