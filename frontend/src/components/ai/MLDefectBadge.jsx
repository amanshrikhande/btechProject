import { ShieldCheck, AlertTriangle, AlertOctagon, Zap, ShieldAlert, Cpu } from "lucide-react";

const CONFIGS = {
  NO_ISSUE:          { Icon: ShieldCheck,  label: "No Issues Flagged",      cls: "ok" },
  LOGIC_ERROR:       { Icon: AlertTriangle, label: "Potential Logic Defect", cls: "warn" },
  RUNTIME_ERROR:     { Icon: AlertOctagon,  label: "Runtime Hazard",         cls: "danger" },
  PERFORMANCE_ISSUE: { Icon: Zap,           label: "Performance Bottleneck", cls: "warn" },
  SECURITY_ISSUE:    { Icon: ShieldAlert,   label: "Security Risk",          cls: "danger" },
};

export const MLDefectBadge = ({ analysis }) => {
  if (!analysis) return null;
  const { classification = "NO_ISSUE", confidence = 1.0, details, suggestions = [] } = analysis;
  const cfg = CONFIGS[classification] || { Icon: Cpu, label: classification, cls: "ok" };
  const { Icon, label, cls } = cfg;

  return (
    <div className={`ml-badge ${cls}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 8 }}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
        </div>
        <span style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.7, padding: "1px 5px", borderRadius: 4, background: "rgba(0,0,0,0.2)" }}>
          CodeBERT {Math.round(confidence * 100)}%
        </span>
      </div>
      {details && <p style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.5 }}>{details}</p>}
      {suggestions.length > 0 && (
        <ul style={{ fontSize: 10, opacity: 0.7, paddingLeft: 14 }}>
          {suggestions.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
    </div>
  );
};
