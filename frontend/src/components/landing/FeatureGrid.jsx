import { Users, Database, History, ShieldAlert, Layers, Terminal } from "lucide-react";

const FEATURES = [
  { Icon: Users, title: "Real-Time Collaborative Coding", desc: "Socket.IO synchronized code editing with Monaco Editor, peer presence indicators, typing broadcast, and instant room sharing.", iconBg: "rgba(6,182,212,0.12)", iconColor: "var(--c-cyan)" },
  { Icon: Database, title: "Persistent Projects & Workspaces", desc: "Your code never vanishes when a room ends. Multi-file directory trees, project ownership, and automatic debounced cloud persistence.", iconBg: "rgba(99,102,241,0.12)", iconColor: "var(--c-indigo)" },
  { Icon: History, title: "Code Versioning & Snapshots", desc: "Capture manual milestones, pre-execution snapshots, and full rollback with interactive version diff inspections.", iconBg: "rgba(168,85,247,0.12)", iconColor: "var(--c-purple)" },
  { Icon: ShieldAlert, title: "CodeBERT ML Defect Detection", desc: "Neural defect classification trained on CodeBERT to flag logic flaws, runtime exceptions, performance bottlenecks, and security vulnerabilities.", iconBg: "rgba(244,63,94,0.12)", iconColor: "var(--c-rose)" },
  { Icon: Layers, title: "ChromaDB Project-Aware RAG", desc: "Vector-indexed code embeddings across all project files. The AI understands your full repository architecture, imports, and cross-file functions.", iconBg: "rgba(16,185,129,0.12)", iconColor: "var(--c-emerald)" },
  { Icon: Terminal, title: "Multi-Language Execution Engine", desc: "Instant execution for JavaScript, Python, C++, Java, and TypeScript with stdout, stderr, execution timing, and history logs.", iconBg: "rgba(245,158,11,0.12)", iconColor: "var(--c-amber)" },
];

export const FeatureGrid = () => (
  <section className="features-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
    <div style={{ textAlign: "center", marginBottom: 52 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--c-cyan)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Comprehensive Engineering Suite</p>
      <h2>Everything you need for modern collaborative development</h2>
      <p className="sub">Engineered for distributed teams, pair programmers, and AI-augmented workflows.</p>
    </div>
    <div className="grid grid-3" style={{ gap: 18 }}>
      {FEATURES.map(({ Icon, title, desc, iconBg, iconColor }, i) => (
        <div key={i} className="feature-card">
          <div className="feature-icon" style={{ background: iconBg, color: iconColor }}>
            <Icon size={22} />
          </div>
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      ))}
    </div>
  </section>
);
