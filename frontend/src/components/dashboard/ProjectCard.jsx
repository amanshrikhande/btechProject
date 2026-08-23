import { Link } from "react-router-dom";
import {
  FolderCode,
  Users,
  Clock,
  Trash2,
  Share2,
  ExternalLink,
  Code2,
} from "lucide-react";

export const ProjectCard = ({ project, onDelete, onShare }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently";
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const getLanguageColor = (lang) => {
    switch (lang) {
      case "javascript":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "python":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "cpp":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "java":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "typescript":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-white/10 flex flex-col justify-between group hover:border-cyan-500/30">
      <div>
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FolderCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors text-base line-clamp-1">
                {project.name}
              </h3>
              <span className="text-xs text-gray-500 font-mono">
                Room: {project.activeRoomId}
              </span>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono border capitalize ${getLanguageColor(
              project.defaultLanguage
            )}`}
          >
            {project.defaultLanguage}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
          {project.description || "No description provided."}
        </p>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            {project.members?.length || 1}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            {formatDate(project.updatedAt)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onShare(project)}
            title="Share Room Code"
            className="p-1.5 rounded-md text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(project._id)}
            title="Delete Project"
            className="p-1.5 rounded-md text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Link
            to={`/workspace/${project._id}`}
            className="btn-primary text-xs py-1.5 px-3 rounded-md flex items-center gap-1 ml-1"
          >
            Open
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
