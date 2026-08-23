import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import {
  Play,
  History,
  Sparkles,
  CloudCheck,
  RefreshCw,
  X,
  FileCode,
  Share2,
} from "lucide-react";

export const EditorHeader = ({ onShareRoom }) => {
  const {
    openTabs,
    activeFile,
    selectFile,
    closeTab,
    language,
    handleLanguageChange,
    saveStatus,
    code,
    project,
    isRunning,
    setIsRunning,
    setOutput,
    isAIOpen,
    setIsAIOpen,
    setIsVersionModalOpen,
    loadVersions,
  } = useWorkspace();

  const { emitCompileCode } = useSocket();

  const handleRun = () => {
    if (!code) return;
    setIsRunning(true);

    emitCompileCode({
      code,
      roomId: project?.activeRoomId,
      projectId: project?._id,
      fileId: activeFile?._id,
      language,
      version: "*",
    });
  };

  const handleOpenVersions = () => {
    if (activeFile) {
      loadVersions(activeFile._id);
      setIsVersionModalOpen(true);
    }
  };

  return (
    <div className="h-11 bg-[#12131f] border-b border-border-subtle flex items-center justify-between px-2 gap-2 overflow-x-auto select-none">
      {/* File Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto h-full py-1">
        {openTabs.map((tab) => {
          const isActive = activeFile && activeFile._id === tab._id;
          return (
            <div
              key={tab._id}
              onClick={() => selectFile(tab)}
              className={`h-full px-3 flex items-center gap-2 rounded-t-lg text-xs font-mono border-t-2 cursor-pointer transition-all ${
                isActive
                  ? "bg-[#0b0c16] text-white border-cyan-400 font-medium"
                  : "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 border-transparent"
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate max-w-[120px]">{tab.name}</span>
              <button
                onClick={(e) => closeTab(tab._id, e)}
                className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Autosave Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono text-gray-400">
          {saveStatus === "saving" ? (
            <>
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-amber-400">Saving...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-gray-400">Saved</span>
            </>
          )}
        </div>

        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-[#181a29] text-xs font-mono text-gray-200 border border-white/10 rounded-md px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="typescript">TypeScript</option>
        </select>

        {/* Version History Button */}
        <button
          onClick={handleOpenVersions}
          title="Version History & Rollback"
          className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5"
        >
          <History className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">History</span>
        </button>

        {/* Share Room Button */}
        <button
          onClick={onShareRoom}
          title="Share Room ID"
          className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 text-cyan-300"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Share</span>
        </button>

        {/* Run Code Button */}
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="btn-primary text-xs px-3.5 py-1 flex items-center gap-1.5"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-white" />
              Run
            </>
          )}
        </button>

        {/* AI Assistant Toggle */}
        <button
          onClick={() => setIsAIOpen(!isAIOpen)}
          title="Toggle AI Assistant"
          className={`p-1.5 rounded-md border transition-all ${
            isAIOpen
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20"
              : "text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 border-transparent"
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
