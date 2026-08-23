import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { aiAPI } from "../../api/ai.api.js";
import { MLDefectBadge } from "./MLDefectBadge.jsx";
import { RAGSnippetsViewer } from "./RAGSnippetsViewer.jsx";
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  RefreshCw,
  Zap,
  Bug,
  HelpCircle,
  Cpu,
  Layers,
} from "lucide-react";

export const AIAssistantDrawer = () => {
  const { code, activeFile, language, project, stderr } = useWorkspace();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am your project-aware AI Assistant. I can analyze your code with CodeBERT, retrieve repository context with ChromaDB RAG, and help debug errors in real-time.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mlAnalysis, setMlAnalysis] = useState(null);
  const [ragSnippets, setRagSnippets] = useState([]);
  const [aiStatus, setAiStatus] = useState("checking");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check health and run static/ML analysis on current file
  useEffect(() => {
    aiAPI
      .checkHealth()
      .then((res) => setAiStatus(res.status))
      .catch(() => setAiStatus("offline"));

    if (code && code.trim().length > 10) {
      aiAPI
        .analyzeCode(code, language)
        .then((res) => setMlAnalysis(res.data))
        .catch(() => setMlAnalysis(null));
    }
  }, [code, language]);

  const handleSendMessage = async (customText) => {
    const query = customText || inputQuery;
    if (!query.trim() || isLoading) return;

    const userMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
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
        chatHistory: messages.slice(-6),
      });

      if (res.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res.data.response,
          },
        ]);
        if (res.data.ml_analysis) setMlAnalysis(res.data.ml_analysis);
        if (res.data.retrieved_context) setRagSnippets(res.data.retrieved_context);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Note: The Python AI service or Ollama is currently offline. Ensure Python FastAPI is running on port 8000 and Ollama is active on port 11434.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndexProject = async () => {
    if (!project?._id) return;
    setIsLoading(true);
    try {
      await aiAPI.indexProjectFiles(project._id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "✅ Indexed all project files into ChromaDB vector store for RAG context retrieval.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to index project files (AI service unreachable)." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 bg-[#10111d] border-l border-border-subtle flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3 bg-[#141525] border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-purple-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              AI Assistant
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus === "online" ? "bg-emerald-400" : "bg-amber-400"
                }`}
                title={aiStatus === "online" ? "FastAPI Online" : "FastAPI Standby / Offline"}
              />
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">CodeBERT + RAG + LLM</span>
          </div>
        </div>

        <button
          onClick={handleIndexProject}
          title="Re-index Project Files in Vector DB"
          className="p-1 rounded text-gray-400 hover:text-cyan-300 hover:bg-white/5"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* CodeBERT Defect Analysis Banner */}
      <div className="p-2 space-y-2 border-b border-border-subtle/70 bg-[#0d0e19]">
        <MLDefectBadge analysis={mlAnalysis} />
        <RAGSnippetsViewer snippets={ragSnippets} />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0a0b14] text-xs">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-md bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                msg.role === "user"
                  ? "bg-cyan-600 text-white rounded-br-none"
                  : "bg-[#151627] text-gray-200 border border-white/5 rounded-bl-none font-sans"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>

            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-md bg-cyan-600 flex items-center justify-center shrink-0 text-white mt-0.5">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-purple-400 text-xs animate-pulse p-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Synthesizing code context & generating fix...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="px-2 py-1.5 bg-[#121322] border-t border-border-subtle/50 flex gap-1 overflow-x-auto text-[10px] font-medium text-gray-300">
        <button
          onClick={() => handleSendMessage("Explain this code step-by-step and how it works.")}
          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-white shrink-0 flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3 text-cyan-400" /> Explain
        </button>
        <button
          onClick={() => handleSendMessage("Inspect this code for potential runtime or logic bugs.")}
          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-white shrink-0 flex items-center gap-1"
        >
          <Bug className="w-3 h-3 text-rose-400" /> Find Bugs
        </button>
        <button
          onClick={() => handleSendMessage("Optimize this code for maximum time/space efficiency.")}
          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 hover:text-white shrink-0 flex items-center gap-1"
        >
          <Zap className="w-3 h-3 text-amber-400" /> Optimize
        </button>
      </div>

      {/* Chat Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 bg-[#141525] border-t border-border-subtle flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Ask AI about this project..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          className="flex-1 bg-[#0b0c16] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
