import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { projectsAPI } from "../api/projects.api.js";
import { filesAPI } from "../api/files.api.js";
import { versionsAPI } from "../api/versions.api.js";
import { aiAPI } from "../api/ai.api.js";
import { useSocket } from "./SocketContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket, emitCodeChange, emitLanguageChange, emitTyping, canEdit, isLeader, leaderMode } = useSocket();

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);
  const [code, setCode] = useState("// start code here");
  const [language, setLanguage] = useState("javascript");
  const [saveStatus, setSaveStatus] = useState("saved"); // 'saved', 'saving', 'unsaved'
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [stdout, setStdout] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [activeBottomTab, setActiveBottomTab] = useState("terminal"); // 'terminal', 'history', 'errors'
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState("none"); // 'none' | 'leader' | 'communication' | 'interviewActivity'
  const [stdin, setStdin] = useState("");
  const [fileVersions, setFileVersions] = useState([]);
  const [editorInstance, setEditorInstance] = useState(null);
  const reindexTimerRef = useRef(null);

  // Silently re-index project files in the background (debounced)
  const triggerAutoReindex = useCallback((projectId) => {
    if (!projectId) return;
    if (reindexTimerRef.current) clearTimeout(reindexTimerRef.current);
    reindexTimerRef.current = setTimeout(() => {
      aiAPI.indexProjectFiles(projectId).catch((err) => {
        console.warn("[AutoReindex] Background indexing failed:", err.message);
      });
    }, 2000); // 2s debounce so rapid file ops don't spam the AI service
  }, []);


  // Load project by ID or Room ID
  const loadProject = async (projectIdOrRoom) => {
    try {
      const res = await projectsAPI.getProjectById(projectIdOrRoom);
      const proj = res.data;
      const projFiles = res.files || [];

      setProject(proj);
      setFiles(projFiles);

      if (projFiles.length > 0) {
        const entry = projFiles.find((f) => f.isEntry) || projFiles[0];
        setActiveFile(entry);
        setOpenTabs([entry]);
        setCode(entry.content || "");
        setLanguage(entry.language || "javascript");
      }

      // Auto-index on project load so RAG is always ready
      triggerAutoReindex(proj._id);

      return proj;
    } catch (err) {
      console.error("[Load Project Error]:", err);
      throw err;
    }
  };

  // Socket event listeners for real-time synchronization
  useEffect(() => {
    if (!socket) return;

    // Real-time code update from another user
    const handleCodeUpdate = (payload) => {
      // payload can be an object { code, fileId, updatedBy } or legacy string
      if (typeof payload === "string") {
        setCode(payload);
      } else if (payload && (!payload.fileId || (activeFile && payload.fileId === activeFile._id))) {
        setCode(payload.code);
      }
    };

    // Autosave notification from backend
    const handleFileSaved = ({ fileId }) => {
      if (activeFile && activeFile._id === fileId) {
        setSaveStatus("saved");
      }
    };

    // Language sync
    const handleLanguageUpdate = (newLang) => {
      setLanguage(newLang);
    };

    // Code execution response
    const handleCodeResponse = (response) => {
      setIsRunning(false);
      if (response && response.run) {
        setOutput(response.run.output || "");
        setStdout(response.run.stdout || "");
        setStderr(response.run.stderr || "");
      } else if (response && response.error) {
        setOutput(response.error);
        setStderr(response.error);
      }
    };

    const handleExecutionResult = (res) => {
      setIsRunning(false);
      setOutput(res.output || "");
      setStdout(res.stdout || "");
      setStderr(res.stderr || "");
      setExecutionTime(res.executionTimeMs);
    };

    socket.on("codeUpdate", handleCodeUpdate);
    socket.on("legacyCodeUpdate", handleCodeUpdate);
    socket.on("fileSaved", handleFileSaved);
    socket.on("languageUpdate", handleLanguageUpdate);
    socket.on("codeResponse", handleCodeResponse);
    socket.on("executionResult", handleExecutionResult);

    return () => {
      socket.off("codeUpdate", handleCodeUpdate);
      socket.off("legacyCodeUpdate", handleCodeUpdate);
      socket.off("fileSaved", handleFileSaved);
      socket.off("languageUpdate", handleLanguageUpdate);
      socket.off("codeResponse", handleCodeResponse);
      socket.off("executionResult", handleExecutionResult);
    };
  }, [socket, activeFile]);

  // Select a file
  const selectFile = useCallback(
    (file) => {
      if (!file) return;
      // If selecting currently active file, no-op
      if (activeFile && activeFile._id === file._id) return;

      // Save previous file in files list
      if (activeFile) {
        setFiles((prev) =>
          prev.map((f) => (f._id === activeFile._id ? { ...f, content: code, language } : f))
        );
      }

      setActiveFile(file);
      setCode(file.content || "");
      setLanguage(file.language || "javascript");

      // Add to open tabs if not present
      setOpenTabs((prev) => (!prev.some((t) => t._id === file._id) ? [...prev, file] : prev));
    },
    [activeFile, code, language]
  );

  // Close a tab
  const closeTab = (fileId, e) => {
    if (e) e.stopPropagation();
    const remainingTabs = openTabs.filter((t) => t._id !== fileId);
    setOpenTabs(remainingTabs);

    if (activeFile && activeFile._id === fileId) {
      if (remainingTabs.length > 0) {
        const next = remainingTabs[remainingTabs.length - 1];
        selectFile(next);
      } else {
        setActiveFile(null);
        setCode("");
      }
    }
  };

  // Jump to specific file and line range in Monaco editor (Priority: 1. fileId, 2. exact filePath, 3. filename)
  const jumpToFileAndLine = useCallback(
    (target, startLine = 1, endLine = null) => {
      if (!target) return;

      let targetId = null;
      let targetPath = null;
      let targetName = null;

      if (typeof target === "object") {
        targetId = target.fileId || target._id || null;
        targetPath = target.filePath || target.path || null;
        targetName = target.fileName || target.name || null;
      } else if (typeof target === "string") {
        // If 24-char hex string, could be fileId
        if (/^[0-9a-fA-F]{24}$/.test(target)) {
          targetId = target;
        } else if (target.includes("/") || target.includes("\\")) {
          targetPath = target;
          targetName = target.split("/").pop().split("\\").pop();
        } else {
          targetName = target;
        }
      }

      // Priority 1: Match by exact fileId
      let targetFile = null;
      if (targetId) {
        targetFile = files.find((f) => f._id?.toString() === targetId.toString());
      }

      // Priority 2: Match by exact filePath
      if (!targetFile && targetPath) {
        targetFile = files.find(
          (f) =>
            f.path === targetPath ||
            f.path === `/${targetPath.replace(/^\//, "")}` ||
            targetPath.endsWith(f.path)
        );
      }

      // Priority 3: Fallback by fileName
      if (!targetFile && (targetName || targetPath)) {
        const lookup = (targetName || targetPath).split("/").pop().split("\\").pop();
        targetFile = files.find(
          (f) =>
            f.name === lookup ||
            f.path?.endsWith(lookup) ||
            lookup.endsWith(f.name)
        );
      }

      if (targetFile) {
        selectFile(targetFile);
      }

      const sLine = Math.max(1, Number(startLine || 1));
      const eLine = Math.max(sLine, Number(endLine || sLine));

      if (editorInstance) {
        setTimeout(() => {
          try {
            if (eLine > sLine) {
              editorInstance.revealRangeInCenter({
                startLineNumber: sLine,
                startColumn: 1,
                endLineNumber: eLine,
                endColumn: 1000,
              });
              editorInstance.setSelection({
                startLineNumber: sLine,
                startColumn: 1,
                endLineNumber: eLine,
                endColumn: 1000,
              });
            } else {
              editorInstance.revealLineInCenter(sLine);
              editorInstance.setPosition({ lineNumber: sLine, column: 1 });
            }
            editorInstance.focus();

            // Temporary 3-second highlight decoration
            const decos = editorInstance.deltaDecorations(
              [],
              [
                {
                  range: {
                    startLineNumber: sLine,
                    startColumn: 1,
                    endLineNumber: eLine,
                    endColumn: 1000,
                  },
                  options: {
                    isWholeLine: true,
                    className: "monaco-ai-finding-highlight",
                  },
                },
              ]
            );
            setTimeout(() => {
              try {
                editorInstance.deltaDecorations(decos, []);
              } catch (e) {}
            }, 3000);
          } catch (e) {
            console.warn("[Editor Jump Error]:", e);
          }
        }, 200);
      }
    },
    [files, selectFile, editorInstance]
  );

  // Handle local code changes
  const handleCodeChange = (newCode) => {
    // If Leader Mode is active and user is not permitted to edit, block local mutation
    if (leaderMode && !canEdit && !isLeader) {
      return;
    }

    setCode(newCode);
    setSaveStatus("saving");

    if (project) {
      emitCodeChange(
        project.activeRoomId,
        newCode,
        activeFile ? activeFile._id : null,
        language
      );
      emitTyping(project.activeRoomId, user ? user.name : "Anonymous");
    }
  };

  // Handle language changes
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (activeFile) {
      filesAPI.updateFile(activeFile._id, { language: newLang }).catch(console.error);
    }
    if (project) {
      emitLanguageChange(project.activeRoomId, newLang, activeFile ? activeFile._id : null);
    }
  };

  // Create new file
  const createNewFile = async (name, path) => {
    if (!project) return;
    try {
      const res = await filesAPI.createFile(project._id, { name, path });
      const newFile = res.data;
      setFiles((prev) => [...prev, newFile]);
      selectFile(newFile);
      // Re-index after file creation so the new file is immediately searchable
      triggerAutoReindex(project._id);
      return newFile;
    } catch (err) {
      console.error("[Create File Error]:", err);
      throw err;
    }
  };

  // Delete file
  const deleteFile = async (fileId) => {
    try {
      await filesAPI.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      closeTab(fileId);
      // Re-index after file deletion to remove stale embeddings
      triggerAutoReindex(project?._id);
    } catch (err) {
      console.error("[Delete File Error]:", err);
      throw err;
    }
  };

  // Fetch file version history
  const loadVersions = async (fileId) => {
    const targetFileId = fileId || (activeFile ? activeFile._id : null);
    if (!targetFileId) return;
    try {
      const res = await versionsAPI.getFileVersions(targetFileId);
      setFileVersions(res.data || []);
      return res.data;
    } catch (err) {
      console.error("[Load Versions Error]:", err);
    }
  };

  // Create snapshot
  const saveSnapshot = async (summary) => {
    if (!activeFile) return;
    try {
      const res = await versionsAPI.createSnapshot(activeFile._id, {
        content: code,
        changeSummary: summary || "Manual Snapshot",
      });
      await loadVersions(activeFile._id);
      return res.data;
    } catch (err) {
      console.error("[Save Snapshot Error]:", err);
      throw err;
    }
  };

  // Restore version
  const restoreVersion = async (versionId) => {
    if (!activeFile) return;
    try {
      const res = await versionsAPI.restoreVersion(activeFile._id, versionId);
      const restoredFile = res.data;
      setCode(restoredFile.content);
      handleCodeChange(restoredFile.content);
      await loadVersions(activeFile._id);
      return restoredFile;
    } catch (err) {
      console.error("[Restore Version Error]:", err);
      throw err;
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        project,
        files,
        activeFile,
        openTabs,
        code,
        language,
        saveStatus,
        output,
        stderr,
        stdout,
        isRunning,
        executionTime,
        activeBottomTab,
        isAIOpen,
        isVersionModalOpen,
        isAnalyticsOpen,
        activeSidePanel,
        fileVersions,
        stdin,
        setStdin,
        setCode,
        setProject,
        loadProject,
        selectFile,
        closeTab,
        handleCodeChange,
        handleLanguageChange,
        createNewFile,
        deleteFile,
        setIsRunning,
        setOutput,
        setActiveBottomTab,
        setIsAIOpen,
        setIsVersionModalOpen,
        setIsAnalyticsOpen,
        setActiveSidePanel,
        loadVersions,
        saveSnapshot,
        restoreVersion,
        editorInstance,
        setEditorInstance,
        jumpToFileAndLine,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
