import { Server, Database, Brain, Terminal, Monitor, Sparkles } from "lucide-react";

export const ArchitectureDiagram = () => {
  return (
    <section className="py-20 bg-[#0d0e17]/60 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-purple-400 tracking-wider uppercase mb-3">
            System Architecture
          </h2>
          <p className="text-3xl font-bold text-white tracking-tight">
            Dual-Service Microservice Engine
          </p>
          <p className="mt-3 text-gray-400 text-sm">
            Separation of concerns: High-throughput WebSockets on Node.js and dedicated AI/ML inference on Python FastAPI.
          </p>
        </div>

        {/* Interactive Architecture Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Frontend Client */}
          <div className="glass-panel-elevated rounded-2xl p-6 border border-cyan-500/20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
              <Monitor className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">React 19 Frontend</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Monaco Editor, multi-file tree, real-time presence indicators, terminal console, and AI assistant drawer.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-auto">
              <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-500/10 text-cyan-300 font-mono">
                Monaco Editor
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-500/10 text-cyan-300 font-mono">
                Socket.IO Client
              </span>
            </div>
          </div>

          {/* Core Backend Node.js */}
          <div className="glass-panel-elevated rounded-2xl p-6 border border-indigo-500/20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4">
              <Server className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Node.js Express & Sockets</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              JWT auth, collaborative rooms, debounced MongoDB autosave, version snapshots, and Piston execution.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-auto">
              <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-300 font-mono">
                MongoDB 8.2
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-300 font-mono">
                Socket.IO
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-300 font-mono">
                Piston Engine
              </span>
            </div>
          </div>

          {/* Python AI Microservice */}
          <div className="glass-panel-elevated rounded-2xl p-6 border border-purple-500/20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Python FastAPI AI Engine</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              CodeBERT defect classifier, ChromaDB repository vector indexing, and local Ollama coding LLM inference.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-auto">
              <span className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-300 font-mono">
                CodeBERT
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-300 font-mono">
                ChromaDB
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-300 font-mono">
                Ollama LLM
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
