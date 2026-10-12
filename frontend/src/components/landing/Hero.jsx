import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Terminal, ArrowRight } from "lucide-react";

const DEMO_LINES = [
  { text: "import { DevShareAI } from '@devshare/core';", color: "#c084fc" },
  { text: "const room = await DevShare.connect('project-alpha');", color: "var(--c-cyan)" },
  { text: "// ⚡ Aman & Sarah editing concurrently in real-time", color: "var(--c-emerald)" },
  { text: "const analysis = await DevShareAI.analyzeDefects(code);", color: "var(--c-amber)" },
  { text: "console.log('✅ 0 Defects Detected. Building...');", color: "#60a5fa" },
];

export const Hero = () => {
  const [activeLine, setActiveLine] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveLine(p => (p + 1) % DEMO_LINES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="landing-hero" style={{ textAlign: "center" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="hero-eyebrow">
          <span className="dot dot-cyan animate-pulse" />
          Next-Gen Real-Time Collaborative Workspace
        </div>

        <h1 className="hero-title">
          Code Together.<br />
          <span className="gradient-text">Build Together.</span>
        </h1>

        <p className="hero-sub" style={{ margin: "0 auto 40px" }}>
          A real-time collaborative coding environment with project-aware AI assistance,
          persistent multi-file workspaces, and instantaneous code execution.
        </p>

        <div className="hero-btns" style={{ justifyContent: "center" }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 15 }}>
            <Sparkles size={16} />
            Start Coding Free
            <ArrowRight size={15} />
          </Link>
          <Link to="/login" className="btn btn-secondary" style={{ padding: "12px 28px", fontSize: 15 }}>
            Sign In to Workspace
          </Link>
        </div>

        {/* Code Window Preview */}
        <div className="hero-code-window">
          <div className="code-win-bar">
            <div className="flex items-center gap-3">
              <div className="code-win-dots">
                <span style={{ background: "#ef4444" }} />
                <span style={{ background: "#f59e0b" }} />
                <span style={{ background: "#10b981" }} />
              </div>
              <span className="code-win-filename">devshare://workspace/index.js</span>
            </div>
            <div className="flex items-center gap-10" style={{ gap: 12 }}>
              <div className="flex items-center gap-2" style={{ gap: 6 }}>
                <span style={{ width: 22, height: 22, borderRadius: 99, background: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>AS</span>
                <span style={{ width: 22, height: 22, borderRadius: 99, background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", marginLeft: -6 }}>JD</span>
              </div>
              <span className="badge badge-green">
                <span className="dot dot-green animate-ping" style={{ width: 6, height: 6 }} />
                Live Sync
              </span>
            </div>
          </div>

          <div className="code-win-body">
            {DEMO_LINES.map((line, idx) => (
              <div key={idx} className={`code-line${activeLine === idx ? " active" : ""}`}>
                <span className="code-linenum">{idx + 1}</span>
                <span style={{ color: line.color }}>{line.text}</span>
                {activeLine === idx && <span className="code-cursor" />}
              </div>
            ))}
          </div>

          <div className="code-win-footer">
            <div className="flex items-center gap-2">
              <Terminal size={13} color="var(--c-cyan)" />
              <span>Compiler: DevShare Engine (JavaScript v22)</span>
            </div>
            <span style={{ color: "var(--c-emerald)", fontWeight: 600 }}>Exit Code: 0 (42ms)</span>
          </div>
        </div>
      </div>
    </section>
  );
};
