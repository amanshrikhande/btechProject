import { useState } from "react";
import { Modal } from "../common/Modal.jsx";
import { LogIn, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const JoinRoomModal = ({ isOpen, onClose }) => {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim()) {
      setError("Please enter a valid Room ID or Project ID");
      return;
    }
    onClose();
    navigate(`/workspace/${roomId.trim()}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Collaborative Room">
      <form onSubmit={handleJoin} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Room Code / Project ID
          </label>
          <div className="relative">
            <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. room_a1b2c3d4 or 64f..."
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-[#151624] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            Ask your collaborator for their room ID or project link.
          </p>
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
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            Join Room
          </button>
        </div>
      </form>
    </Modal>
  );
};
