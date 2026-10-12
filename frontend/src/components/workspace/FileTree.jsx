import { useState } from "react";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { FileCode, FilePlus, Trash2, FolderOpen, File } from "lucide-react";

const getFileColor = (name) => {
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "var(--c-yellow)";
  if (name.endsWith(".py")) return "var(--c-blue)";
  if (name.endsWith(".cpp") || name.endsWith(".c")) return "var(--c-cyan)";
  if (name.endsWith(".java")) return "var(--c-orange)";
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "var(--c-indigo)";
  if (name.endsWith(".html")) return "var(--c-rose)";
  if (name.endsWith(".css")) return "#38bdf8";
  if (name.endsWith(".json")) return "var(--c-emerald)";
  return "var(--c-text-3)";
};

export const FileTree = () => {
  const { files, activeFile, selectFile, createNewFile, deleteFile } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) { setIsCreating(false); return; }
    try {
      setError("");
      await createNewFile(newFileName.trim());
      setNewFileName(""); setIsCreating(false);
    } catch (err) { setError(err.response?.data?.error || "Error creating file"); }
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-label">
          <FolderOpen size={13} color="var(--c-cyan)" />
          Explorer
        </span>
        <button onClick={() => setIsCreating(true)} className="btn-ghost" title="New File" style={{ padding: 4 }}>
          <FilePlus size={14} />
        </button>
      </div>

      <div className="file-tree-list">
        {files.map(file => {
          const isActive = activeFile?._id === file._id;
          return (
            <div
              key={file._id}
              onClick={() => selectFile(file)}
              className={`file-item${isActive ? " active" : ""}`}
            >
              <div className="file-item-left">
                <FileCode size={13} color={getFileColor(file.name)} style={{ flexShrink: 0 }} />
                <span className="file-item-name">{file.name}</span>
                {file.isEntry && <span className="file-main-badge">main</span>}
              </div>
              {files.length > 1 && (
                <button
                  className="file-item-del"
                  onClick={e => { e.stopPropagation(); if (confirm(`Delete ${file.name}?`)) deleteFile(file._id); }}
                  title="Delete file"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}

        {isCreating && (
          <form onSubmit={handleCreate}>
            <div className="file-new-input">
              <File size={12} color="var(--c-cyan)" />
              <input
                type="text"
                placeholder="filename.ext"
                value={newFileName}
                onChange={e => setNewFileName(e.target.value)}
                onBlur={() => { if (!newFileName.trim()) setIsCreating(false); }}
                autoFocus
              />
            </div>
            {error && <p style={{ fontSize: 10, color: "var(--c-rose)", padding: "3px 8px" }}>{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
};
