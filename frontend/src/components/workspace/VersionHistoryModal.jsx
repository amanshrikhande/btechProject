import { useState } from "react";
import { Modal } from "../common/Modal.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { History, RotateCcw, Plus, Clock, Check } from "lucide-react";

export const VersionHistoryModal = () => {
  const { isVersionModalOpen, setIsVersionModalOpen, fileVersions, activeFile, saveSnapshot, restoreVersion } = useWorkspace();
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [summary, setSummary] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [restoredId, setRestoredId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!summary.trim()) return;
    try { await saveSnapshot(summary.trim()); setSummary(""); setIsCreating(false); }
    catch (e) { console.error(e); }
  };

  const handleRestore = async (id) => {
    if (confirm("Restore this version? Active file content will be updated.")) {
      try { await restoreVersion(id); setRestoredId(id); setTimeout(() => setRestoredId(null), 2000); }
      catch (e) { console.error(e); }
    }
  };

  return (
    <Modal isOpen={isVersionModalOpen} onClose={() => setIsVersionModalOpen(false)} title={`Version History — ${activeFile?.name || "File"}`} maxWidth="lg">
      <div className="space-y-4">
        {/* Snapshot creation bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "var(--c-surface-2)", borderRadius: 10, border: "1px solid var(--c-border)" }}>
          {isCreating ? (
            <form onSubmit={handleCreate} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <input
                className="input"
                type="text"
                placeholder="Commit summary (e.g. Added login helper)"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                autoFocus
                style={{ flex: 1, borderColor: "var(--c-cyan)" }}
              />
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCreating(false)}>Cancel</button>
            </form>
          ) : (
            <>
              <span style={{ fontSize: 12, color: "var(--c-text-3)", fontFamily: "monospace" }}>Capture milestone snapshot of current code</span>
              <button onClick={() => setIsCreating(true)} className="btn btn-primary btn-sm">
                <Plus size={13} /> New Snapshot
              </button>
            </>
          )}
        </div>

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxHeight: 380, overflow: "hidden" }}>
          {/* Snapshots list */}
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
              Snapshots ({fileVersions.length})
            </p>
            {fileVersions.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--c-text-3)", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>No versions recorded yet.</p>
            ) : fileVersions.map(ver => {
              const isSelected = selectedVersion?._id === ver._id;
              return (
                <div
                  key={ver._id}
                  onClick={() => setSelectedVersion(ver)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? "var(--c-cyan)" : "var(--c-border)"}`,
                    background: isSelected ? "rgba(6,182,212,0.08)" : "var(--c-surface-2)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: isSelected ? "var(--c-cyan)" : "var(--c-text)" }}>
                      v{ver.versionNumber} — {ver.changeSummary}
                    </span>
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "var(--c-text-3)", textTransform: "uppercase" }}>
                      {ver.triggerType}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: "var(--c-text-3)" }}>
                    <span>{ver.authorName || "Collaborator"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={10} />{new Date(ver.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Code preview */}
          <div style={{ display: "flex", flexDirection: "column", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--c-text-3)" }}>
                {selectedVersion ? `Snapshot v${selectedVersion.versionNumber}` : "Preview"}
              </span>
              {selectedVersion && (
                <button
                  onClick={() => handleRestore(selectedVersion._id)}
                  className="btn btn-secondary btn-xs"
                  style={{ color: "var(--c-purple)", borderColor: "rgba(168,85,247,0.3)" }}
                >
                  {restoredId === selectedVersion._id
                    ? <><Check size={11} color="var(--c-emerald)" /> Restored</>
                    : <><RotateCcw size={11} /> Restore</>}
                </button>
              )}
            </div>
            <div style={{ flex: 1, padding: "12px", overflowY: "auto", fontFamily: "monospace", fontSize: 11, color: "var(--c-text-2)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {selectedVersion
                ? selectedVersion.content
                : <span style={{ color: "var(--c-text-3)", fontStyle: "italic" }}>Select a snapshot to preview.</span>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
