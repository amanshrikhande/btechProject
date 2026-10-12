import { useState, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
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
  Keyboard,
  Play,
  CornerDownLeft,
  FileText,
  Sparkles,
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
    activeFile,
    code,
    language,
    activeBottomTab,
    setActiveBottomTab,
    stdin,
    setStdin,
    setIsRunning,
  } = useWorkspace();
  const { emitCompileCode } = useSocket();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [quickInput, setQuickInput] = useState("");

  useEffect(() => {
    if (activeBottomTab === "history" && project?._id) {
      executionAPI
        .getProjectHistory(project._id)
        .then((res) => setHistoryLogs(res.data || []))
        .catch(console.error);
    }
  }, [activeBottomTab, project]);

  const handleRunCustomInput = (customStdin) => {
    const inputToUse = typeof customStdin === "string" ? customStdin : stdin;
    if (!code) return;
    setIsRunning(true);
    emitCompileCode({
      code,
      stdin: inputToUse,
      roomId: project?.activeRoomId,
      projectId: project?._id,
      fileId: activeFile?._id,
      language,
      version: "*",
    });
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const newStdin = stdin ? `${stdin}\n${quickInput}` : quickInput;
    setStdin(newStdin);
    handleRunCustomInput(newStdin);
    setQuickInput("");
  };

  if (isCollapsed) {
    return (
      <div
        className="terminal-panel collapsed"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          cursor: "pointer",
        }}
        onClick={() => setIsCollapsed(false)}
      >
        <div
          className="flex items-center gap-2"
          style={{ fontSize: 11, fontFamily: "monospace", color: "var(--c-text-3)" }}
        >
          <TerminalIcon size={13} color="var(--c-cyan)" />
          Terminal & Standard Input
          {stdin.trim() && (
            <span
              style={{
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 4,
                background: "var(--c-cyan-dim)",
                color: "var(--c-cyan)",
              }}
            >
              stdin active
            </span>
          )}
        </div>
        <ChevronUp size={14} color="var(--c-text-3)" />
      </div>
    );
  }

  return (
    <div className="terminal-panel" style={{ height: activeBottomTab === "stdin" ? 240 : 220 }}>
      {/* Header Tab Bar */}
      <div className="terminal-tabbar">
        <div className="terminal-tabs">
          <button
            className={`terminal-tab${activeBottomTab === "terminal" ? " active" : ""}`}
            onClick={() => setActiveBottomTab("terminal")}
          >
            <TerminalIcon size={12} /> Output Console
          </button>
          <button
            className={`terminal-tab${activeBottomTab === "stdin" ? " active" : ""}`}
            onClick={() => setActiveBottomTab("stdin")}
          >
            <Keyboard size={12} /> Standard Input (stdin)
            {stdin.trim() && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--c-cyan)",
                  display: "inline-block",
                  marginLeft: 4,
                }}
              />
            )}
          </button>
          <button
            className={`terminal-tab${activeBottomTab === "history" ? " active" : ""}`}
            onClick={() => setActiveBottomTab("history")}
          >
            <History size={12} /> Execution Logs
          </button>
        </div>
        <div className="terminal-actions">
          {executionTime !== null && (
            <span className="flex items-center gap-1">
              <Clock size={11} color="var(--c-cyan)" /> {executionTime}ms
            </span>
          )}
          <button
            className="btn-ghost"
            onClick={() => {
              setOutput("");
            }}
            title="Clear Terminal Output"
            style={{ padding: 4 }}
          >
            <Trash2 size={13} />
          </button>
          <button
            className="btn-ghost"
            onClick={() => setIsCollapsed(true)}
            title="Minimize Terminal"
            style={{ padding: 4 }}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div
        className="terminal-body"
        style={{
          display: "flex",
          flexDirection: "column",
          padding: activeBottomTab === "stdin" ? "10px 14px" : "12px 16px",
        }}
      >
        {activeBottomTab === "terminal" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {isRunning ? (
                <div className="terminal-running">
                  <span className="blinker" />
                  Executing {language} program...
                </div>
              ) : output ? (
                <div>
                  {stdin.trim() && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(6,182,212,0.08)",
                        border: "1px solid rgba(6,182,212,0.18)",
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "var(--c-cyan)",
                        marginBottom: 8,
                      }}
                    >
                      <Keyboard size={10} /> Ran with custom stdin ({stdin.split("\n").length} line{stdin.split("\n").length > 1 ? "s" : ""})
                    </div>
                  )}
                  <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "inherit", whiteSpace: "pre-wrap" }}>
                    {stdout && <span className="terminal-stdout">{stdout}</span>}
                    {stderr && <span className="terminal-stderr">{"\n"}{stderr}</span>}
                    {!stdout && !stderr && <span className="terminal-stdout">{output}</span>}
                  </pre>
                </div>
              ) : (
                <div style={{ color: "var(--c-text-3)", fontSize: 11, fontStyle: "italic" }}>
                  Output will appear here after clicking "Run".
                  <br />
                  <span style={{ fontSize: 10, opacity: 0.8 }}>
                    Need to provide input for Python <code style={{ color: "var(--c-cyan)" }}>input()</code> or C++ <code style={{ color: "var(--c-cyan)" }}>cin</code>? Use the "Standard Input (stdin)" tab or quick input bar below.
                  </span>
                </div>
              )}
            </div>

            {/* Quick Interactive Input Bar */}
            <form
              onSubmit={handleQuickSubmit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <Keyboard
                  size={12}
                  color="var(--c-text-3)"
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Interactive stdin input... (e.g. Alice or 42)"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: 6,
                    background: "var(--c-surface-2)",
                    border: "1px solid var(--c-border)",
                    color: "var(--c-text)",
                    fontSize: 11,
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isRunning || !quickInput.trim()}
                className="btn btn-secondary btn-xs"
                title="Send input and run code"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 10px",
                  color: quickInput.trim() ? "var(--c-cyan)" : "var(--c-text-3)",
                  borderColor: quickInput.trim() ? "rgba(6,182,212,0.3)" : "var(--c-border)",
                }}
              >
                <Play size={10} style={{ fill: "currentColor" }} /> Send & Run
              </button>
            </form>
          </div>
        )}

        {activeBottomTab === "stdin" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text)" }}>
                  Standard Input (stdin) Buffer
                </span>
                <span style={{ fontSize: 10, color: "var(--c-text-3)" }}>
                  (fed to input(), cin, Scanner, readline)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setStdin("10 20\n30 40 50")}
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: 10 }}
                >
                  Numbers Sample
                </button>
                <button
                  type="button"
                  onClick={() => setStdin("DevShare User\n42")}
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: 10 }}
                >
                  Text Sample
                </button>
                {stdin && (
                  <button
                    type="button"
                    onClick={() => setStdin("")}
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: 10, color: "var(--c-rose)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              placeholder={`Enter test input line by line here...\nExample for python:\ninput_name\n123`}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={4}
              style={{
                flex: 1,
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border)",
                color: "var(--c-text)",
                fontSize: 12,
                fontFamily: "monospace",
                lineHeight: 1.6,
                outline: "none",
                resize: "none",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--c-text-3)", fontFamily: "monospace" }}>
                {stdin.length} characters · {stdin ? stdin.split("\n").length : 0} lines
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveBottomTab("terminal");
                  handleRunCustomInput(stdin);
                }}
                disabled={isRunning}
                className="btn btn-primary btn-sm"
                style={{ padding: "5px 14px" }}
              >
                <Play size={12} style={{ fill: "currentColor" }} /> Run with this Input
              </button>
            </div>
          </div>
        )}

        {activeBottomTab === "history" && (
          <div style={{ overflowY: "auto", flex: 1 }}>
            {historyLogs.length === 0 ? (
              <span className="terminal-placeholder">No execution history recorded yet.</span>
            ) : (
              historyLogs.map((log) => (
                <div key={log._id} className="history-log-item">
                  <div>
                    <div className="history-log-meta">
                      {log.status === "success" ? (
                        <CheckCircle2 size={13} color="var(--c-emerald)" />
                      ) : (
                        <AlertCircle size={13} color="var(--c-rose)" />
                      )}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "var(--c-text)",
                        }}
                      >
                        {log.language}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--c-text-3)" }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="history-log-output">{log.stdout || log.stderr || "No output"}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--c-text-3)",
                      fontFamily: "monospace",
                      flexShrink: 0,
                    }}
                  >
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
