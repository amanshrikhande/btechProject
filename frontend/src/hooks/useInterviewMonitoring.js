import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export const useInterviewMonitoring = () => {
  const { interviewState, emitCandidateFocusEvent, socket } = useSocket();
  const { user } = useAuth();
  const [hasAcknowledgedPrivacy, setHasAcknowledgedPrivacy] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const isCandidate =
    interviewState.active &&
    (interviewState.candidateSocketId === socket?.id ||
      (interviewState.candidateId && user && interviewState.candidateId === (user.id || user._id)));

  // Show privacy notice when interview starts if user is candidate
  useEffect(() => {
    if (isCandidate && !hasAcknowledgedPrivacy) {
      setShowPrivacyNotice(true);
    }
  }, [isCandidate, hasAcknowledgedPrivacy]);

  const acknowledgePrivacy = () => {
    setHasAcknowledgedPrivacy(true);
    setShowPrivacyNotice(false);
  };

  useEffect(() => {
    if (!isCandidate || !hasAcknowledgedPrivacy) return;

    // 1. Visibility change listener (tab hidden / tab visible)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        emitCandidateFocusEvent("TAB_HIDDEN", {
          visibilityState: document.visibilityState,
          timestamp: new Date().toISOString(),
        });
      } else {
        emitCandidateFocusEvent("TAB_VISIBLE", {
          visibilityState: document.visibilityState,
          timestamp: new Date().toISOString(),
        });
      }
    };

    // 2. Window blur & focus listener
    const handleWindowBlur = () => {
      emitCandidateFocusEvent("WINDOW_BLURRED", {
        timestamp: new Date().toISOString(),
      });
    };

    const handleWindowFocus = () => {
      emitCandidateFocusEvent("WINDOW_FOCUSED", {
        timestamp: new Date().toISOString(),
      });
    };

    // 3. Fullscreen changes
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        emitCandidateFocusEvent("FULLSCREEN_ENTERED", {
          timestamp: new Date().toISOString(),
        });
      } else {
        emitCandidateFocusEvent("FULLSCREEN_EXITED", {
          timestamp: new Date().toISOString(),
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isCandidate, hasAcknowledgedPrivacy, emitCandidateFocusEvent]);

  return {
    isCandidate,
    showPrivacyNotice,
    acknowledgePrivacy,
  };
};
