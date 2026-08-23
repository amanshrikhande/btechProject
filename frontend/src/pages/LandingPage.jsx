import { Navbar } from "../components/common/Navbar.jsx";
import { Hero } from "../components/landing/Hero.jsx";
import { FeatureGrid } from "../components/landing/FeatureGrid.jsx";
import { ArchitectureDiagram } from "../components/landing/ArchitectureDiagram.jsx";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Code2, Heart } from "lucide-react";

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />

      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <ArchitectureDiagram />

        {/* Bottom CTA Banner */}
        <section className="py-20 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-6">
            <div className="glass-panel-elevated rounded-3xl p-10 sm:p-14 border border-cyan-500/30 relative overflow-hidden text-center bg-gradient-to-b from-[#16182c] to-[#0d0e19]">
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                  Ready to upgrade your collaborative workflow?
                </h2>
                <p className="text-gray-300 text-sm sm:text-base mb-8">
                  Create your free account, invite your team, and build with real-time sync and project-aware AI assistance.
                </p>
                <Link
                  to="/register"
                  className="btn-primary px-8 py-3.5 text-base inline-flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-cyan-200" />
                  Get Started with DevShare
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 bg-[#090a12] text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-gray-200">DevShare</span> — Real-Time Collaborative Coding & AI Workspace
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            Built with modern web standards and deep neural AI.
          </div>
        </div>
      </footer>
    </div>
  );
};
