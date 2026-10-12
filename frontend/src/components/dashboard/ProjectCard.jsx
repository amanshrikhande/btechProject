import { Link } from "react-router-dom";
import { FolderCode, Users, Clock, Trash2, Share2, ExternalLink } from "lucide-react";

const formatDate = (dateStr) => {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  const diffHours = Math.round((Date.now() - date) / 3600000);
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const d = Math.round(diffHours / 24);
  return d === 1 ? "Yesterday" : `${d}d ago`;
};

const LANG_CLASS = { javascript: "lang-js", python: "lang-py", cpp: "lang-cpp", java: "lang-java", typescript: "lang-ts" };

export const ProjectCard = ({ project, onDelete, onShare }) => (
  <div className="project-card">
    <div>
      <div className="project-card-top">
        <div className="flex items-center gap-3">
          <div className="project-icon">
            <FolderCode size={18} />
          </div>
          <div>
            <h3 className="project-card-title">{project.name}</h3>
            <div className="project-room-id">Room: {project.activeRoomId}</div>
          </div>
        </div>
        <span className={`lang-badge ${LANG_CLASS[project.defaultLanguage] || "lang-default"}`}>
          {project.defaultLanguage}
        </span>
      </div>
      <p className="project-desc line-clamp-2">
        {project.description || "No description provided."}
      </p>
    </div>

    <div className="project-card-footer">
      <div className="project-meta">
        <span className="project-meta-item">
          <Users size={12} />
          {project.members?.length || 1}
        </span>
        <span className="project-meta-item">
          <Clock size={12} />
          {formatDate(project.updatedAt)}
        </span>
      </div>
      <div className="project-actions">
        <button onClick={() => onShare(project)} className="btn-ghost" title="Share room" style={{ padding: 6 }}>
          <Share2 size={15} />
        </button>
        <button onClick={() => onDelete(project._id)} className="btn-ghost" title="Delete project" style={{ padding: 6, color: "var(--c-text-3)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--c-rose)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--c-text-3)"}>
          <Trash2 size={15} />
        </button>
        <Link to={`/workspace/${project._id}`} className="btn btn-primary btn-sm" style={{ marginLeft: 4 }}>
          Open <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  </div>
);
