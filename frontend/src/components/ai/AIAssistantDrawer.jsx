import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { aiAPI } from "../../api/ai.api.js";
import { MLDefectBadge } from "./MLDefectBadge.jsx";
import { RAGEvidencePanel } from "./RAGEvidencePanel.jsx";
import { CodeIntelligenceFindingsPanel } from "./CodeIntelligenceFindingsPanel.jsx";
import { ProjectKnowledgeCard } from "./ProjectKnowledgeCard.jsx";
import { AIComparisonModal } from "./AIComparisonModal.jsx";
import { AIArchitectureModal } from "./AIArchitectureModal.jsx";
import { MarkdownMessage } from "./MarkdownMessage.jsx";
import { CodeSuggestionCard } from "./CodeSuggestionCard.jsx";
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Scale,
  Network,
  Check,
  X,
  Wand2,
  Database,
  Code,
  Copy,
  CheckCheck,
  Layers,
  Zap,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

export const AIAssistantDrawer = ({ onClose }) => {
  const {
    code,
    activeFile,
    language,
    project,
    stderr,
    handleCodeChange,
    saveSnapshot,
    setIsAIOpen,
    jumpToFileAndLine,
    editorInstance,
  } = useWorkspace();

  const handleClose = () => {
    if (onClose) onClose();
    else if (setIsAIOpen) setIsAIOpen(false);
  };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "### 👋 Welcome to DevShare Project-Aware AI\nI am connected to your workspace using **ChromaDB Multi-File RAG** and code intelligence.\n\nAsk questions about your project, diagnose cross-module bugs, or generate tests and patches with full file and line citations.",
      condition: "RAG",
      sources: [],
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [condition, setCondition] = useState("RAG"); // Always RAG — Generic AI mode removed
  const [mlAnalysis, setMlAnalysis] = useState(null);
  const [aiStatus, setAiStatus] = useState("checking");
  const [ollamaInfo, setOllamaInfo] = useState(null);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false); // Collapsed by default for clean chat view
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [indexStatus, setIndexStatus] = useState(null);
  const endRef = useRef(null);

  const fetchIndexStatus = () => {
    if (project?._id) {
      aiAPI
        .getIndexStatus(project._id)
        .then((res) => {
          setIndexStatus(res?.data || res);
        })
        .catch((err) => {
          console.warn("[AIAssistantDrawer] getIndexStatus error:", err.message);
        });
    }
  };

  useEffect(() => {
    fetchIndexStatus();
  }, [project?._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const pollHealth = () => {
      aiAPI
        .checkHealth()
        .then((res) => {
          setAiStatus(res.status || "online");
          if (res.ollama) setOllamaInfo(res.ollama);
        })
        .catch(() => setAiStatus("offline"));
    };

    pollHealth();
    const interval = setInterval(pollHealth, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (code?.trim().length > 10) {
      aiAPI
        .analyzeCode(code, language)
        .then((res) => setMlAnalysis(res.data))
        .catch(() => setMlAnalysis(null));
    }
  }, [code, language]);

  const copyMessageText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Surgical apply: replace only startLine→endLine, leave rest of file intact
  const handleApplyCodeChange = (codeChange) => {
    const { fileId, filePath, startLine, endLine, newCode } = codeChange;

    // Step 1: If the change targets a different file, switch to it first
    if (fileId || filePath) {
      jumpToFileAndLine({ fileId, filePath }, startLine, endLine);
    }

    // Step 2: Apply the edit after Monaco has had time to load the target file
    setTimeout(() => {
      if (!editorInstance) {
        // No editor — fall back to full replace on current file
        handleCodeChange(newCode);
        return;
      }

      const model = editorInstance.getModel();
      if (!model) {
        handleCodeChange(newCode);
        return;
      }

      const totalLines = model.getLineCount();
      const safeStart = Math.max(1, Math.min(startLine, totalLines));
      const safeEnd = Math.max(safeStart, Math.min(endLine, totalLines));

      // Build the edit range — replace from column 1 of startLine to end of endLine
      const endCol = model.getLineMaxColumn(safeEnd);
      editorInstance.executeEdits("ai-suggestion", [
        {
          range: {
            startLineNumber: safeStart,
            startColumn: 1,
            endLineNumber: safeEnd,
            endColumn: endCol,
          },
          text: newCode,
          forceMoveMarkers: true,
        },
      ]);

      // Highlight the new lines for 4 seconds so user sees what changed
      const newEndLine = safeStart + newCode.split("\n").length - 1;
      const decos = editorInstance.deltaDecorations([], [
        {
          range: {
            startLineNumber: safeStart,
            startColumn: 1,
            endLineNumber: newEndLine,
            endColumn: 1000,
          },
          options: { isWholeLine: true, className: "monaco-ai-finding-highlight" },
        },
      ]);
      setTimeout(() => {
        try { editorInstance.deltaDecorations(decos, []); } catch (_) { }
      }, 4000);

      // Scroll to the changed region
      editorInstance.revealRangeInCenter({
        startLineNumber: safeStart,
        startColumn: 1,
        endLineNumber: newEndLine,
        endColumn: 1000,
      });
      editorInstance.focus();

      // Sync React state + broadcast via socket
      handleCodeChange(editorInstance.getValue());
    }, fileId || filePath ? 350 : 0);
  };

  // Dismiss a code suggestion on a specific message
  const handleDismissCodeChange = (msgIndex) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, codeChange: null } : m))
    );
  };

  const sendMessage = async (customText, overrideMode = "chat") => {
    const query = customText || inputQuery;
    if (!query.trim() || isLoading) return;

    setMessages((p) => [...p, { role: "user", content: query, condition }]);
    if (!customText) setInputQuery("");
    setIsLoading(true);

    try {
      const res = await aiAPI.chatAssistant({
        message: query,
        projectId: project?._id,
        activeFileName: activeFile?.name || "main",
        activeCode: code,
        language,
        lastError: stderr || null,
        chatHistory: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        condition,
        mode: overrideMode,
      });

      if (res?.data) {
        const responseData = res.data;
        setMessages((p) => [
          ...p,
          {
            role: "assistant",
            content: responseData.response || "No response generated.",
            intent: responseData.intent || null,
            status: responseData.status || null,
            findings: responseData.findings || [],
            claims: responseData.claims || [],
            codeChange: responseData.codeChange || null,
            diagnostics: responseData.diagnostics || null,
            warning: responseData.warning || null,
            analysisMethods: responseData.analysisMethods || [],
            sources: responseData.sources || [],
            retrievalMetadata: responseData.retrievalMetadata || null,
            rawContext: responseData.rawContext || null,
            debugTrace: responseData.debugTrace || null,
            isFallback: responseData.fallback || false,
            condition: responseData.condition || condition,
            engine: responseData.engine,
          },
        ]);
      }
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: `⚠️ LLM connection error. The AI service did not respond. Core collaboration and code execution remain operational.`,
          isFallback: true,
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="ai-side-panel">
      {/* Sleek Header */}
      <header className="ai-side-panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(168,85,247,0.25))",
              border: "1px solid rgba(6,182,212,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--c-cyan)",
              boxShadow: "0 0 14px rgba(6,182,212,0.25)",
            }}
          >
            <Sparkles size={16} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", letterSpacing: "-0.2px" }}>
                DevShare AI
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(6,182,212,0.15)",
                  color: "var(--c-cyan)",
                  border: "1px solid rgba(6,182,212,0.3)",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                RAG v2.6
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--c-text-3)", marginTop: 1 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: ollamaInfo?.online ? "var(--c-green)" : "var(--c-amber)",
                  boxShadow: ollamaInfo?.online ? "0 0 6px var(--c-green)" : "none",
                }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 10 }}>
                {ollamaInfo?.online
                  ? "LLM: Connected"
                  : "LLM: Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <button
            onClick={() => setIsCompareOpen(true)}
            className="btn-ghost"
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              color: "var(--c-cyan)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid rgba(6,182,212,0.25)",
              background: "rgba(6,182,212,0.06)",
            }}
            title="Side-by-side Generic AI vs. Project RAG Comparison"
          >
            <Scale size={12} />
            <span>Eval</span>
          </button>

          <button
            onClick={() => setIsArchOpen(true)}
            className="btn-ghost"
            style={{
              padding: "4px 7px",
              borderRadius: 6,
              fontSize: 11,
              color: "var(--c-purple)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid rgba(168,85,247,0.25)",
              background: "rgba(168,85,247,0.06)",
            }}
            title="View Research Architecture Diagram"
          >
            <Network size={13} />
          </button>

          <button
            onClick={handleClose}
            className="btn-ghost"
            style={{
              padding: 6,
              borderRadius: 6,
              color: "var(--c-text-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-rose)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-3)")}
            title="Close AI Assistant"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Mode / Status Bar */}
      <div
        style={{
          padding: "7px 14px",
          background: "#090a14",
          borderBottom: "1px solid var(--c-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--c-cyan)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--c-cyan)",
              boxShadow: "0 0 6px var(--c-cyan)",
              flexShrink: 0,
            }}
          />
          Project RAG
        </span>
        <span
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            color: "var(--c-text-3)",
          }}
        >
          ● ChromaDB Active
        </span>
      </div>

      {/* Active Project RAG Status Banner */}
      {condition === "RAG" && (
        <div
          style={{
            padding: "5px 14px",
            background: "rgba(6,182,212,0.06)",
            borderBottom: "1px solid rgba(6,182,212,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 10,
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--c-cyan)", fontWeight: 700 }}>PROJECT RAG ● Active</span>
            <span style={{ color: "var(--c-text-3)" }}>|</span>
            <span style={{ color: "var(--c-text-2)" }}>
              Project: <strong style={{ color: "var(--c-text)" }}>{project?.name || "Active Project"}</strong>
            </span>
          </div>
          <span style={{ color: "var(--c-cyan)" }}>
            Indexed: {indexStatus?.indexedFiles ?? indexStatus?.filesCount ?? 0} files, {indexStatus?.indexedChunks ?? indexStatus?.chunksCount ?? 0} chunks
          </span>
        </div>
      )}

      {/* Collapsible Project Knowledge Bar */}
      <div
        style={{
          borderBottom: "1px solid var(--c-border)",
          background: "#0d0f1b",
        }}
      >
        <div
          onClick={() => setIsKnowledgeOpen(!isKnowledgeOpen)}
          style={{
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            userSelect: "none",
            fontSize: 11,
            color: "var(--c-text-2)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Database size={13} style={{ color: "var(--c-cyan)" }} />
            <span style={{ fontWeight: 600, color: "var(--c-text)" }}>Project Vector Knowledge</span>
            <span
              style={{
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 4,
                background: "rgba(16,185,129,0.15)",
                color: "var(--c-green)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              Ready
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--c-text-3)", fontSize: 10 }}>
            <span>{isKnowledgeOpen ? "Hide" : "Details"}</span>
            {isKnowledgeOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </div>

        {isKnowledgeOpen && (
          <div style={{ padding: "0 12px 12px 12px" }}>
            <ProjectKnowledgeCard project={project} onIndexComplete={fetchIndexStatus} />
          </div>
        )}
      </div>

      {/* Real-time CodeBERT ML Defect Badge */}
      {mlAnalysis && mlAnalysis.classification !== "NO_ISSUE" && (
        <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--c-border)", background: "rgba(245,158,11,0.06)" }}>
          <MLDefectBadge analysis={mlAnalysis} />
        </div>
      )}

      {/* Messages Stream */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              width: "100%",
            }}
          >
            {/* Header: Role indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
                padding: "0 4px",
              }}
            >
              {msg.role === "user" ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-cyan)" }}>You</span>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: "rgba(6,182,212,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--c-cyan)",
                    }}
                  >
                    <UserIcon size={11} />
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(168,85,247,0.3))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--c-cyan)",
                    }}
                  >
                    <Bot size={11} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text)" }}>
                    DevShare AI
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: msg.condition === "GENERIC" ? "rgba(168,85,247,0.15)" : "rgba(6,182,212,0.15)",
                      color: msg.condition === "GENERIC" ? "var(--c-purple)" : "var(--c-cyan)",
                      fontFamily: "monospace",
                    }}
                  >
                    {msg.condition || condition}
                  </span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              style={{
                maxWidth: "96%",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 12,
                lineHeight: 1.6,
                position: "relative",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.15))"
                    : "#121424",
                border:
                  msg.role === "user"
                    ? "1px solid rgba(6,182,212,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                color: "var(--c-text)",
                boxShadow:
                  msg.role === "user"
                    ? "0 4px 14px rgba(6,182,212,0.12)"
                    : "0 4px 14px rgba(0,0,0,0.25)",
              }}
            >
              {/* Intent Badge */}
              {msg.role === "assistant" && msg.intent && (
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      padding: "2px 6px",
                      borderRadius: 3,
                      background:
                        msg.intent === "BUG"
                          ? "rgba(239,68,68,0.2)"
                          : msg.intent === "SECURITY"
                            ? "rgba(244,63,94,0.2)"
                            : "rgba(6,182,212,0.15)",
                      color:
                        msg.intent === "BUG"
                          ? "#fca5a5"
                          : msg.intent === "SECURITY"
                            ? "#fda4af"
                            : "var(--c-cyan)",
                      border: `1px solid ${msg.intent === "BUG"
                        ? "rgba(239,68,68,0.35)"
                        : "rgba(6,182,212,0.3)"
                        }`,
                    }}
                  >
                    [{msg.intent.replace(/_/g, " ")}]
                  </span>
                </div>
              )}

              {/* Code Intelligence Findings or NO_FINDING Banner */}
              {msg.role === "assistant" &&
                ((msg.findings && msg.findings.length > 0) || msg.status === "NO_FINDING") && (
                  <CodeIntelligenceFindingsPanel
                    status={msg.status || "FINDINGS"}
                    findings={msg.findings || []}
                    intent={msg.intent || "BUG"}
                    analysisMethods={msg.analysisMethods || []}
                  />
                )}

              {/* Evidence Panel (if RAG context exists) */}
              {msg.role === "assistant" && ((msg.sources && msg.sources.length > 0) || msg.rawContext) && (
                <RAGEvidencePanel
                  sources={msg.sources || []}
                  retrievalMetadata={msg.retrievalMetadata}
                  rawContext={msg.rawContext}
                  debugTrace={msg.debugTrace}
                />
              )}

              {/* Evidence Validation Warning Banner (Phase 15) */}
              {msg.role === "assistant" && !msg.diagnostics?.summaryOnlyFallback && (msg.warning || (msg.diagnostics && msg.diagnostics.rejectedClaimCount > 0)) && (
                <div
                  style={{
                    margin: "8px 0",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#fbbf24",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <span>{msg.warning || "Some generated claims could not be verified against the supplied project evidence."}</span>
                </div>
              )}

              {/* Insufficient Evidence Notice */}
              {msg.role === "assistant" && msg.status === "INSUFFICIENT_EVIDENCE" && (
                <div
                  style={{
                    margin: "8px 0",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "rgba(99, 102, 241, 0.12)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    color: "#a5b4fc",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <ShieldAlert size={15} color="#818cf8" style={{ flexShrink: 0 }} />
                  <span>The requested entities or functionality are not established by the supplied project evidence.</span>
                </div>
              )}

              {/* Grounded Structured Claims Panel */}
              {msg.role === "assistant" && msg.claims && msg.claims.length > 0 && (
                <div
                  style={{
                    margin: "10px 0",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: "#0d0f20",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: "#34d399", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                    <Check size={12} /> Grounded Evidence Citations
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {msg.claims.filter((claim) => claim && typeof claim.text === "string" && claim.text.trim()).map((claim, cIdx) => (
                      <div key={cIdx} style={{ fontSize: "11px", color: "var(--c-text-2)", display: "flex", flexDirection: "column", gap: 3 }}>
                        <div>• {claim.text}</div>
                        {claim.evidence && claim.evidence.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginLeft: 10 }}>
                            {claim.evidence.map((ev, evIdx) => (
                              <button
                                key={evIdx}
                                type="button"
                                onClick={() => jumpToFileAndLine && jumpToFileAndLine(
                                  { fileId: ev.fileId, filePath: ev.filePath },
                                  ev.startLine,
                                  ev.endLine
                                )}
                                className="btn-ghost"
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "9.5px",
                                  borderRadius: 4,
                                  background: "rgba(6, 182, 212, 0.12)",
                                  border: "1px solid rgba(6, 182, 212, 0.25)",
                                  color: "var(--c-cyan)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                  cursor: "pointer",
                                }}
                                title={`Open ${ev.filePath} at line ${ev.startLine}`}
                              >
                                <ExternalLink size={9} />
                                <span>{ev.filePath ? ev.filePath.split("/").pop().split("\\").pop() : "file"}:{ev.startLine}-{ev.endLine}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Content */}
              <MarkdownMessage content={msg.content} />

              {/* Inline Code Suggestion Card */}
              {msg.role === "assistant" && msg.codeChange && (
                <CodeSuggestionCard
                  codeChange={msg.codeChange}
                  onApply={handleApplyCodeChange}
                  onDismiss={() => handleDismissCodeChange(index)}
                />
              )}

              {/* Message Footer */}
              {msg.role === "assistant" && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 6,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: "var(--c-text-3)",
                    fontFamily: "monospace",
                  }}
                >
                  <span>{msg.engine || (msg.isFallback ? "LLM connection error" : "DevShare AI")}</span>

                  <button
                    onClick={() => copyMessageText(msg.content, index)}
                    className="btn-ghost"
                    style={{ padding: "2px 6px", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}
                    title="Copy response"
                  >
                    {copiedIndex === index ? (
                      <>
                        <CheckCheck size={11} style={{ color: "var(--c-green)" }} />
                        <span style={{ color: "var(--c-green)" }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.25)",
              color: "var(--c-cyan)",
              fontSize: 12,
            }}
          >
            <RefreshCw size={14} className="animate-spin" />
            <span>
              {condition === "RAG"
                ? "Retrieving context & generating response..."
                : "Generating response..."}
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick Action Chips Toolbar */}
      <div
        style={{
          padding: "7px 12px",
          background: "#0a0b16",
          borderTop: "1px solid var(--c-border)",
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={() =>
            sendMessage(
              `Explain step-by-step how ${activeFile?.name || "this file"} connects to the rest of the project`,
              "explain"
            )
          }
          disabled={isLoading}
          className="btn-ghost"
          style={{
            padding: "3px 8px",
            borderRadius: 5,
            fontSize: 11,
            color: "var(--c-text-2)",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--c-border)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          title="Explain active file and connections"
        >
          <Sparkles size={11} style={{ color: "var(--c-cyan)" }} />
          <span>Explain</span>
        </button>

      </div>

      {/* Input Bar */}
      <div
        style={{
          padding: "10px 14px",
          background: "#101222",
          borderTop: "1px solid var(--c-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 8,
            padding: "4px 8px",
            background: "#080a14",
            border: "1px solid var(--c-border)",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--c-cyan)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--c-border)")}
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              condition === "RAG"
                ? `Ask DevShare AI about this project in RAG mode...`
                : "Ask generic programming question..."
            }
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--c-text)",
              fontSize: 12,
              padding: "5px 4px",
            }}
          />

          <button
            onClick={() => sendMessage()}
            disabled={!inputQuery.trim() || isLoading}
            className="btn btn-primary btn-sm"
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            title="Send prompt (Enter)"
          >
            <Send size={12} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 6,
            fontSize: 10,
            color: "var(--c-text-3)",
          }}
        >
          <span>Enter to send • Privacy preserved</span>
          <span>{condition === "RAG" ? "⚡ Multi-File Grounding" : "Standalone"}</span>
        </div>
      </div>

      {/* AI Comparison Modal */}
      <AIComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        project={project}
        activeFile={activeFile}
        code={code}
        language={language}
      />

      {/* AI Architecture Modal */}
      <AIArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />
    </aside>
  );
};
