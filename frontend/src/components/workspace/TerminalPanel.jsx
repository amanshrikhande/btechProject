import { useState, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { executionAPI } from "../../api/execution.api.js";
import {
  Terminal as TerminalIcon,
  Clock,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export const TerminalPanel = () => {
  const {
    output,
    stderr,
    stdout,
    isRunning,
    executionTime,
    setOutput,
    project,
    activeBottomTab,
    setActiveBottomTab,
  } = useWorkspace();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);

  useEffect(() => {
    if (activeBottomTab === "history" && project?._id) {
      executionAPI
        .getProjectHistory(project._id)
        .then((res) => setHistoryLogs(res.data || []))
        .catch(console.error);
    }
  }, [activeBottomTab, project]);

  if (isCollapsed) {
    return (
      <div className="h-8 bg-[#10111d] border-t border-border-subtle flex items-center justify-between px-4 text-xs font-mono text-gray-400 select-none">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsCollapsed(false)}>
          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>Terminal Output</span>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1 hover:text-white"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-56 bg-[#0e0f1a] border-t border-border-subtle flex flex-col select-none">
      {/* Terminal Tab Bar */}
      <div className="h-9 bg-[#141524] border-b border-border-subtle/70 flex items-center justify-between px-4">
        <div className="flex items-center gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveBottomTab("terminal")}
            className={`flex items-center gap-1.5 py-2 border-b-2 font-medium transition-colors ${
              activeBottomTab === "terminal"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            Output Console
          </button>

          <button
            onClick={() => setActiveBottomTab("history")}
            className={`flex items-center gap-1.5 py-2 border-b-2 font-medium transition-colors ${
              activeBottomTab === "history"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Execution Logs
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {executionTime !== null && (
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="w-3 h-3 text-cyan-400" />
              {executionTime}ms
            </span>
          )}

          <button
            onClick={() => setOutput("")}
            title="Clear Console"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            title="Minimize"
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-left bg-[#0a0b14] leading-relaxed">
        {activeBottomTab === "terminal" ? (
          <div>
            {isRunning ? (
              <div className="text-cyan-400 animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Executing code via Piston sandbox engine...
              </div>
            ) : output ? (
              <pre className="whitespace-pre-wrap font-mono text-gray-200">
                {stdout && <span className="text-gray-100">{stdout}</span>}
                {stderr && <span className="text-rose-400 block mt-1">{stderr}</span>}
                {!stdout && !stderr && <span>{output}</span>}
              </pre>
            ) : (
              <span className="text-gray-600 italic">
                Output will appear here after clicking "Run".
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {historyLogs.length === 0 ? (
              <span className="text-gray-600 italic">No execution history recorded yet.</span>
            ) : (
              historyLogs.map((log) => (
                <div
                  key={log._id}
                  className="p-2.5 rounded-lg bg-[#141524] border border-white/5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="font-semibold text-white uppercase text-[10px]">
                        {log.language}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 font-mono line-clamp-1">
                      {log.stdout || log.stderr || "No output"}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono shrink-0">
                    {log.executionTimeMs}ms
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
