import { Link } from "react-router-dom";
import { Navbar } from "../components/common/Navbar.jsx";
import { Hero } from "../components/landing/Hero.jsx";
import { FeatureGrid } from "../components/landing/FeatureGrid.jsx";
import { Sparkles, ArrowRight, Code2 } from "lucide-react";

export const LandingPage = () => (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
    <Navbar />
    <main style={{ flex: 1 }}>
      <Hero />
      <FeatureGrid />

      {/* CTA */}
      <div className="landing-cta">
        <div className="cta-box">
          <h2>Ready to upgrade your collaborative workflow?</h2>
          <p>Create your free account, invite your team, and build with real-time sync and project-aware AI assistance.</p>
          <Link to="/register" className="btn btn-primary" style={{ padding: "13px 30px", fontSize: 15 }}>
            <Sparkles size={16} />
            Get Started with DevShare
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </main>

    <footer className="landing-footer">
      <div className="flex items-center gap-2">
        <Code2 size={15} color="var(--c-cyan)" />
        <span style={{ fontWeight: 600, color: "var(--c-text-2)" }}>DevShare</span>
        <span>— Real-Time Collaborative Coding & AI Workspace</span>
      </div>
      <span>Built with modern web standards and deep neural AI.</span>
    </footer>
  </div>
);
