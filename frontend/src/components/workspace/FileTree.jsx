import { useState } from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import {
  FileCode,
  FilePlus,
  Trash2,
  ChevronRight,
  FolderOpen,
  File,
} from "lucide-react";

export const FileTree = () => {
  const { files, activeFile, selectFile, createNewFile, deleteFile } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [error, setError] = useState("");

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      setIsCreating(false);
      return;
    }

    try {
      setError("");
      await createNewFile(newFileName.trim());
      setNewFileName("");
      setIsCreating(false);
    } catch (err) {
      setError(err.response?.data?.error || "Error creating file");
    }
  };

  const getFileIconColor = (name) => {
    if (name.endsWith(".js") || name.endsWith(".jsx")) return "text-yellow-400";
    if (name.endsWith(".py")) return "text-blue-400";
    if (name.endsWith(".cpp") || name.endsWith(".c")) return "text-cyan-400";
    if (name.endsWith(".java")) return "text-orange-400";
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return "text-indigo-400";
    if (name.endsWith(".html")) return "text-rose-400";
    if (name.endsWith(".css")) return "text-sky-400";
    if (name.endsWith(".json")) return "text-emerald-400";
    return "text-gray-400";
  };

  return (
    <div className="w-60 bg-[#10111a] border-r border-border-subtle flex flex-col h-full select-none">
      {/* Explorer Header */}
      <div className="px-4 py-3 border-b border-border-subtle/60 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          Explorer
        </span>
        <button
          onClick={() => setIsCreating(true)}
          title="New File"
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <FilePlus className="w-4 h-4" />
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {files.map((file) => {
          const isActive = activeFile && activeFile._id === file._id;
          return (
            <div
              key={file._id}
              onClick={() => selectFile(file)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-200 font-medium border border-cyan-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FileCode className={`w-4 h-4 shrink-0 ${getFileIconColor(file.name)}`} />
                <span className="truncate">{file.name}</span>
                {file.isEntry && (
                  <span className="text-[9px] px-1 py-0.2 bg-cyan-500/20 text-cyan-300 rounded">
                    main
                  </span>
                )}
              </div>

              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${file.name}?`)) {
                      deleteFile(file._id);
                    }
                  }}
                  title="Delete File"
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Inline Create Input */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="pt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#161726] border border-cyan-500 rounded-lg">
              <File className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <input
                type="text"
                placeholder="filename.ext"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => {
                  if (!newFileName.trim()) setIsCreating(false);
                }}
                className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                autoFocus
              />
            </div>
            {error && <span className="text-[10px] text-rose-400 px-2 mt-1 block">{error}</span>}
          </form>
        )}
      </div>
    </div>
  );
};
