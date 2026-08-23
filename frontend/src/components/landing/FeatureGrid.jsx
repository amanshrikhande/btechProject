import {
  Users,
  BrainCircuit,
  Database,
  Terminal,
  History,
  ShieldAlert,
  Cpu,
  Layers,
} from "lucide-react";

export const FeatureGrid = () => {
  const features = [
    {
      icon: Users,
      title: "Real-Time Collaborative Coding",
      description:
        "Socket.IO synchronized code editing with Monaco Editor, peer presence indicators, typing broadcast, and instant room sharing.",
      color: "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30",
    },
    {
      icon: Database,
      title: "Persistent Projects & Workspaces",
      description:
        "Your code never vanishes when a room ends. Multi-file directory trees, project ownership, and automatic debounced cloud persistence.",
      color: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30",
    },
    {
      icon: History,
      title: "Code Versioning & Snapshots",
      description:
        "Capture manual milestones, pre-execution snapshots, and full rollback capabilities with interactive version diff inspections.",
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    },
    {
      icon: ShieldAlert,
      title: "CodeBERT ML Defect Detection",
      description:
        "Neural defect classification trained on CodeBERT to flag logic flaws, runtime exceptions, performance bottlenecks, and security vulnerabilities.",
      color: "from-rose-500/20 to-amber-500/20 text-rose-400 border-rose-500/30",
    },
    {
      icon: Layers,
      title: "ChromaDB Project-Aware RAG",
      description:
        "Vector-indexed code embeddings across all project files. The AI understands your full repository architecture, imports, and cross-file functions.",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      icon: Terminal,
      title: "Multi-Language Execution Engine",
      description:
        "Instant execution for JavaScript, Python, C++, Java, and TypeScript with stdout, stderr, execution timing, and complete history logs.",
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    },
  ];

  return (
    <section className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs font-semibold text-cyan-400 tracking-wider uppercase mb-3">
          Comprehensive Engineering Suite
        </h2>
        <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Everything you need for modern collaborative development
        </p>
        <p className="mt-4 text-gray-400 text-base">
          Engineered for distributed teams, pair programmers, and AI-augmented workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-500/40"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed font-normal">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
