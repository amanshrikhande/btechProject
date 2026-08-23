import { useState } from "react";
import { Modal } from "../common/Modal.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { History, RotateCcw, Plus, Clock, FileCode, Check } from "lucide-react";

export const VersionHistoryModal = () => {
  const {
    isVersionModalOpen,
    setIsVersionModalOpen,
    fileVersions,
    activeFile,
    saveSnapshot,
    restoreVersion,
  } = useWorkspace();

  const [selectedVersion, setSelectedVersion] = useState(null);
  const [snapshotSummary, setSnapshotSummary] = useState("");
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [restoredId, setRestoredId] = useState(null);

  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    if (!snapshotSummary.trim()) return;
    try {
      await saveSnapshot(snapshotSummary.trim());
      setSnapshotSummary("");
      setIsCreatingSnapshot(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (versionId) => {
    if (confirm("Restore this version? Active file content will be updated.")) {
      try {
        await restoreVersion(versionId);
        setRestoredId(versionId);
        setTimeout(() => setRestoredId(null), 2000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <Modal
      isOpen={isVersionModalOpen}
      onClose={() => setIsVersionModalOpen(false)}
      title={`Version History — ${activeFile?.name || "File"}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Snapshot creation toolbar */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#141524] border border-white/5">
          {isCreatingSnapshot ? (
            <form onSubmit={handleCreateSnapshot} className="flex items-center gap-2 w-full">
              <input
                type="text"
                placeholder="Commit summary (e.g. Added user login helper)"
                value={snapshotSummary}
                onChange={(e) => setSnapshotSummary(e.target.value)}
                className="flex-1 bg-[#1c1e30] border border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                autoFocus
              />
              <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingSnapshot(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span className="text-xs text-gray-400 font-mono">
                Capture milestone snapshot of the current code state
              </span>
              <button
                onClick={() => setIsCreatingSnapshot(true)}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Snapshot
              </button>
            </>
          )}
        </div>

        {/* Versions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
          {/* Versions List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Snapshots ({fileVersions.length})
            </h4>

            {fileVersions.length === 0 ? (
              <p className="text-xs text-gray-500 italic p-4 text-center">
                No versions recorded yet.
              </p>
            ) : (
              fileVersions.map((ver) => {
                const isSelected = selectedVersion?._id === ver._id;
                return (
                  <div
                    key={ver._id}
                    onClick={() => setSelectedVersion(ver)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-200"
                        : "bg-[#141524] border-white/5 text-gray-300 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs font-mono">
                        v{ver.versionNumber} — {ver.changeSummary}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase">
                        {ver.triggerType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{ver.authorName || "Collaborator"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Version Code Preview */}
          <div className="flex flex-col bg-[#0d0e18] border border-white/10 rounded-xl overflow-hidden min-h-[250px]">
            <div className="px-3 py-2 bg-[#141524] border-b border-white/5 flex items-center justify-between text-xs font-mono text-gray-400">
              <span>{selectedVersion ? `Snapshot v${selectedVersion.versionNumber}` : "Preview"}</span>
              {selectedVersion && (
                <button
                  onClick={() => handleRestore(selectedVersion._id)}
                  className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
                >
                  {restoredId === selectedVersion._id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Restored
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3" /> Restore Version
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-gray-200 bg-[#090a12] whitespace-pre-wrap">
              {selectedVersion ? (
                selectedVersion.content
              ) : (
                <span className="text-gray-600 italic">Select a snapshot on the left to preview code.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
