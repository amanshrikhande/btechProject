import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Terminal, Play, Users, GitBranch, ArrowRight, ShieldCheck } from "lucide-react";

export const Hero = () => {
  const [activeCodeLine, setActiveCodeLine] = useState(0);

  const demoLines = [
    { text: "import { DevShareAI } from '@devshare/core';", color: "text-purple-400" },
    { text: "const room = await DevShare.connect('project-alpha');", color: "text-cyan-400" },
    { text: "// ⚡ Aman & Sarah editing concurrently in real-time", color: "text-emerald-400" },
    { text: "const analysis = await DevShareAI.analyzeDefects(code);", color: "text-amber-400" },
    { text: "console.log('✅ 0 Defects Detected. Building...');", color: "text-blue-400" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCodeLine((prev) => (prev + 1) % demoLines.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-24 pb-20 overflow-hidden gradient-hero">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          {/* Version badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border-cyan-500/30 text-cyan-300 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500 shadow-lg shadow-cyan-500/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Next-Gen Real-Time Collaborative Workspace
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
            Code Together. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Build Together.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl font-normal leading-relaxed mb-10">
            A real-time collaborative coding environment with project-aware AI assistance, persistent multi-file workspaces, and instantaneous code execution.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
            <Link
              to="/register"
              className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-cyan-200" />
              Start Coding Free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              to="/login"
              className="btn-secondary w-full sm:w-auto px-8 py-3.5 text-base flex items-center justify-center gap-2"
            >
              Sign In to Workspace
            </Link>
          </div>

          {/* Collaborative Code Preview Card */}
          <div className="w-full max-w-4xl glass-panel-elevated rounded-2xl p-1 border border-white/15 shadow-2xl relative">
            {/* Window title bar */}
            <div className="bg-[#151624] px-4 py-3 rounded-t-xl flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-gray-400 ml-2">devshare://workspace/index.js</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 border border-black flex items-center justify-center text-[10px] font-bold text-white">
                    AS
                  </span>
                  <span className="w-6 h-6 rounded-full bg-purple-600 border border-black flex items-center justify-center text-[10px] font-bold text-white">
                    JD
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
            </div>

            {/* Code Body */}
            <div className="bg-[#0b0c16] p-6 text-left font-mono text-sm leading-relaxed overflow-x-auto min-h-[190px]">
              {demoLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 py-1 px-2 rounded transition-all duration-300 ${
                    activeCodeLine === idx ? "bg-white/5 border-l-2 border-cyan-400 pl-3" : "opacity-80"
                  }`}
                >
                  <span className="text-gray-600 select-none w-5 text-right">{idx + 1}</span>
                  <span className={line.color}>{line.text}</span>
                  {activeCodeLine === idx && (
                    <span className="w-2 h-4 bg-cyan-400 inline-block animate-pulse ml-1" />
                  )}
                </div>
              ))}
            </div>

            {/* Terminal bar */}
            <div className="bg-[#121320] px-4 py-2.5 rounded-b-xl flex items-center justify-between text-xs font-mono border-t border-white/5 text-gray-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Compiler: Piston Engine (JavaScript v18.15.0)</span>
              </div>
              <span className="text-emerald-400 font-medium">Exit Code: 0 (Execution: 42ms)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
