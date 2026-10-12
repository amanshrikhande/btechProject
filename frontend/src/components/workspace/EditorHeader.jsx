import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { Play, History, RefreshCw, X, FileCode, Share2 } from "lucide-react";

export const EditorHeader = ({ onShareRoom }) => {
  const {
    openTabs, activeFile, selectFile, closeTab,
    language, handleLanguageChange,
    saveStatus, code, project,
    isRunning, setIsRunning, setOutput,
    setIsVersionModalOpen, loadVersions,
    stdin,
  } = useWorkspace();
  const { emitCompileCode } = useSocket();

  const handleRun = () => {
    if (!code) return;
    setIsRunning(true);
    emitCompileCode({
      code,
      stdin: stdin || "",
      roomId: project?.activeRoomId,
      projectId: project?._id,
      fileId: activeFile?._id,
      language,
      version: "*",
    });
  };

  const handleOpenVersions = () => {
    if (activeFile) { loadVersions(activeFile._id); setIsVersionModalOpen(true); }
  };

  return (
    <>
      {/* Tab bar */}
      <div className="editor-tabbar">
        {openTabs.map(tab => {
          const isActive = activeFile?._id === tab._id;
          return (
            <div
              key={tab._id}
              onClick={() => selectFile(tab)}
              className={`editor-tab${isActive ? " active" : ""}`}
            >
              <FileCode size={12} color="var(--c-cyan)" />
              <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.name}</span>
              <button
                className="editor-tab-close"
                onClick={e => closeTab(tab._id, e)}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="save-status">
          {saveStatus === "saving" ? (
            <><RefreshCw size={11} color="var(--c-amber)" className="animate-spin" /> <span style={{ color: "var(--c-amber)" }}>Saving...</span></>
          ) : (
            <><span className="dot dot-green" style={{ width: 7, height: 7 }} /> <span>Saved</span></>
          )}
        </div>

        <select className="lang-select" value={language} onChange={e => handleLanguageChange(e.target.value)}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="typescript">TypeScript</option>
        </select>

        <button onClick={handleOpenVersions} className="btn btn-secondary btn-sm">
          <History size={13} color="var(--c-purple)" /> History
        </button>

        <button onClick={onShareRoom} className="btn btn-secondary btn-sm" style={{ color: "var(--c-cyan)" }}>
          <Share2 size={13} /> Share
        </button>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="btn btn-primary btn-sm"
        >
          {isRunning
            ? <><RefreshCw size={13} className="animate-spin" /> Running...</>
            : <><Play size={13} style={{ fill: "currentColor" }} /> Run</>}
        </button>

      </div>
    </>
  );
};
