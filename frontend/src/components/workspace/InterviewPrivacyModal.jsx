import { Modal } from "../common/Modal.jsx";
import { Shield, Eye, CheckCircle2 } from "lucide-react";

export const InterviewPrivacyModal = ({ isOpen, onAcknowledge }) => {
  return (
    <Modal isOpen={isOpen} onClose={onAcknowledge} title="Interview Observability Notice">
      <div className="space-y-4">
        <div className="flex items-start gap-3" style={{ padding: 12, borderRadius: "var(--radius-sm)", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
          <Shield size={20} color="var(--c-cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--c-text-2)" }}>
            <strong style={{ color: "var(--c-text)", display: "block", marginBottom: 4 }}>
              Interview Session Observability Notice
            </strong>
            Interview Mode records session activity such as page visibility, focus changes, and fullscreen events. These events are used solely to provide interview-session observability.
          </div>
        </div>

        <div className="space-y-2" style={{ fontSize: 11, color: "var(--c-text-3)", lineHeight: 1.6 }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} color="var(--c-emerald)" />
            <span>Telemetry includes: browser tab visibility, window focus, and fullscreen transitions.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} color="var(--c-emerald)" />
            <span>DevShare does not secretly record microphone audio, camera video, or desktop screens.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} color="var(--c-emerald)" />
            <span>Audio and video transmit only when explicitly enabled through the Communication panel.</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
          <button onClick={onAcknowledge} className="btn btn-primary btn-sm">
            I Understand & Acknowledge
          </button>
        </div>
      </div>
    </Modal>
  );
};
