import { useEffect } from "react";
import { X } from "lucide-react";

export const Modal = ({ isOpen, onClose, title, children, maxWidth }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-box${maxWidth ? " modal-lg" : ""}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 5 }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
