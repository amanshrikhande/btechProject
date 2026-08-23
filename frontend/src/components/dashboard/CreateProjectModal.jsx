import { useState } from "react";
import { Modal } from "../common/Modal.jsx";
import { FolderPlus, Sparkles } from "lucide-react";

export const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a project name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onCreate({ name, description, defaultLanguage });
      setName("");
      setDescription("");
      setDefaultLanguage("javascript");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Project Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. React Portfolio, Distributed Cache"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#151624] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Description
          </label>
          <textarea
            placeholder="Briefly describe what you're building..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-[#151624] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Primary Language
          </label>
          <select
            value={defaultLanguage}
            onChange={(e) => setDefaultLanguage(e.target.value)}
            className="w-full bg-[#151624] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++ (GCC)</option>
            <option value="java">Java (OpenJDK)</option>
            <option value="typescript">TypeScript</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
