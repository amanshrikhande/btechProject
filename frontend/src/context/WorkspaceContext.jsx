import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { projectsAPI } from "../api/projects.api.js";
import { filesAPI } from "../api/files.api.js";
import { versionsAPI } from "../api/versions.api.js";
import { useSocket } from "./SocketContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket, emitCodeChange, emitLanguageChange, emitTyping } = useSocket();

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
  const [isAIOpen, setIsAIOpen] = useState(true);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [fileVersions, setFileVersions] = useState([]);

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
  const selectFile = (file) => {
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
    if (!openTabs.some((t) => t._id === file._id)) {
      setOpenTabs((prev) => [...prev, file]);
    }
  };

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

  // Handle local code changes
  const handleCodeChange = (newCode) => {
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
        fileVersions,
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
        loadVersions,
        saveSnapshot,
        restoreVersion,
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
