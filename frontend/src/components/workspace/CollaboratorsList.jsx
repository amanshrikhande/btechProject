import { useState } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { Users, Copy, Check, Radio } from "lucide-react";

export const CollaboratorsList = ({ roomId, onLeaveRoom }) => {
  const { users, collaborators, typingUser } = useSocket();
  const [copied, setCopied] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback to legacy string array if collaborator objects not yet populated
  const displayUsers =
    collaborators.length > 0
      ? collaborators
      : users.map((u) => ({ name: u, avatar: null }));

  return (
    <div className="p-3 bg-[#10111a] border-t border-border-subtle select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          Active Peers ({displayUsers.length})
        </span>

        <button
          onClick={handleCopyRoomId}
          title="Copy Room ID"
          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>

      {/* Collaborator Avatars & Names */}
      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
        {displayUsers.map((collab, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-2 py-1 rounded bg-[#161826] text-xs font-mono text-gray-200"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" />
            <span className="truncate">{collab.name}</span>
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      {typingUser && (
        <div className="mt-2 text-[11px] text-cyan-400 font-mono italic animate-pulse flex items-center gap-1.5">
          <Radio className="w-3 h-3" />
          {typingUser}
        </div>
      )}
    </div>
  );
};
