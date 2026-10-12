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
    if (!roomId.trim()) { setError("Please enter a valid Room ID or Project ID"); return; }
    onClose();
    navigate(`/workspace/${roomId.trim()}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Collaborative Room">
      <form onSubmit={handleJoin}>
        {error && <div className="alert-error">{error}</div>}
        <div className="form-group">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text-2)", marginBottom: 7 }}>Room Code / Project ID</label>
          <div className="input-icon">
            <Hash size={15} className="icon-left" />
            <input className="input" type="text" placeholder="e.g. room_a1b2c3d4 or 64f..." value={roomId} onChange={e => setRoomId(e.target.value)} style={{ fontFamily: "monospace" }} autoFocus />
          </div>
          <p style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 6 }}>Ask your collaborator for their room ID or project link.</p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm">
            <LogIn size={13} /> Join Room
          </button>
        </div>
      </form>
    </Modal>
  );
};
