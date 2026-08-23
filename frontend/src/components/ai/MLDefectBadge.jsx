import { ShieldCheck, AlertTriangle, AlertOctagon, Zap, ShieldAlert, Cpu } from "lucide-react";

export const MLDefectBadge = ({ analysis }) => {
  if (!analysis) return null;

  const { classification = "NO_ISSUE", confidence = 1.0, details, suggestions = [] } = analysis;

  const getBadgeConfig = () => {
    switch (classification) {
      case "NO_ISSUE":
        return {
          icon: ShieldCheck,
          label: "No Issues Flagged",
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
        };
      case "LOGIC_ERROR":
        return {
          icon: AlertTriangle,
          label: "Potential Logic Defect",
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/30",
        };
      case "RUNTIME_ERROR":
        return {
          icon: AlertOctagon,
          label: "Runtime Hazard",
          bg: "bg-rose-500/10",
          text: "text-rose-400",
          border: "border-rose-500/30",
        };
      case "PERFORMANCE_ISSUE":
        return {
          icon: Zap,
          label: "Performance Bottleneck",
          bg: "bg-purple-500/10",
          text: "text-purple-400",
          border: "border-purple-500/30",
        };
      case "SECURITY_ISSUE":
        return {
          icon: ShieldAlert,
          label: "Security Risk",
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/30",
        };
      default:
        return {
          icon: Cpu,
          label: classification,
          bg: "bg-cyan-500/10",
          text: "text-cyan-400",
          border: "border-cyan-500/30",
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <div className={`p-2.5 rounded-xl border ${config.bg} ${config.border} space-y-1.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-4 h-4 ${config.text}`} />
          <span className={`text-xs font-semibold ${config.text}`}>
            {config.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-400 bg-black/30 px-1.5 py-0.5 rounded">
          CodeBERT {Math.round(confidence * 100)}%
        </span>
      </div>

      {details && <p className="text-[11px] text-gray-300 leading-snug">{details}</p>}

      {suggestions && suggestions.length > 0 && (
        <ul className="text-[10px] text-gray-400 list-disc list-inside pt-1 space-y-0.5">
          {suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
