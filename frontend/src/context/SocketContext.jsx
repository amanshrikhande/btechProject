import { createContext, useContext, useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  // Leader Mode & Permissions state
  const [leaderMode, setLeaderMode] = useState(false);
  const [leaderSocketId, setLeaderSocketId] = useState(null);
  const [leaderName, setLeaderName] = useState("");
  const [myRole, setMyRole] = useState("EDITOR"); // 'LEADER', 'EDITOR', 'VIEWER'
  const [canEdit, setCanEdit] = useState(true);
  const [roomPermissions, setRoomPermissions] = useState([]);
  const [permissionNotice, setPermissionNotice] = useState("");

  // Interview Mode state
  const [interviewState, setInterviewState] = useState({
    active: false,
    candidateSocketId: null,
    candidateName: null,
    candidateId: null,
    startedAt: null,
  });
  const [interviewAlerts, setInterviewAlerts] = useState([]);

  // Pending permission requests for Leader
  const [pendingPermissionRequests, setPendingPermissionRequests] = useState([]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    const socket = io(backendUrl, {
      auth: { token },
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Backward-compatible userJoined listener
    socket.on("userJoined", (userList) => {
      setUsers(userList);
    });

    // Rich collaborator update listener
    socket.on("collaboratorsUpdate", (collabList) => {
      setCollaborators(collabList);
    });

    socket.on("userTyping", (userName) => {
      setTypingUser(`${userName.slice(0, 10)}... is typing`);
      setTimeout(() => setTypingUser(""), 2000);
    });

    // Room state synchronization from backend
    socket.on("roomStateSync", (data) => {
      if (!data) return;
      setLeaderMode(!!data.leaderMode);
      setLeaderSocketId(data.leaderSocketId);
      setLeaderName(data.leaderName || "Leader");
      if (data.myRole) setMyRole(data.myRole);
      if (typeof data.canEdit === "boolean") setCanEdit(data.canEdit);
      if (data.permissions) setRoomPermissions(data.permissions);
      if (data.interviewState) setInterviewState(data.interviewState);
    });

    // Leader mode change broadcast
    socket.on("leaderModeChanged", (data) => {
      setLeaderMode(!!data.enabled);
      if (data.leaderSocketId) setLeaderSocketId(data.leaderSocketId);
      if (data.leaderName) setLeaderName(data.leaderName);
    });

    // Edit permission change notification
    socket.on("editPermissionChanged", ({ role, canEdit: allowed }) => {
      setMyRole(role);
      setCanEdit(allowed);
      if (!allowed) {
        setPermissionNotice("Leader has restricted your editing access (VIEW ONLY mode).");
      } else {
        setPermissionNotice("You have been granted editing permissions.");
      }
      setTimeout(() => setPermissionNotice(""), 4000);
    });

    // Real-time permissions list update
    socket.on("roomPermissionsUpdate", (perms) => {
      if (Array.isArray(perms)) {
        setRoomPermissions(perms);
        const myPerm = perms.find((p) => p.socketId === socket.id);
        if (myPerm) {
          setMyRole(myPerm.role);
          setCanEdit(myPerm.canEdit);
        }
      }
    });

    // Permission denied rejection from server
    socket.on("permissionDenied", ({ message }) => {
      setPermissionNotice(message || "Action not allowed by server permissions.");
      setTimeout(() => setPermissionNotice(""), 4000);
    });

    // Leader received request for edit permissions
    socket.on("editPermissionRequested", (req) => {
      setPendingPermissionRequests((prev) => [...prev, req]);
    });

    // Interview mode events
    socket.on("interviewStarted", (state) => {
      setInterviewState(state);
      setInterviewAlerts((prev) => [
        ...prev,
        {
          eventType: "INTERVIEW_STARTED",
          text: `Interview started for ${state.candidateName || "Candidate"}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "info",
        },
      ]);
    });

    socket.on("interviewEnded", ({ durationSeconds }) => {
      setInterviewState({
        active: false,
        candidateSocketId: null,
        candidateName: null,
        candidateId: null,
        startedAt: null,
      });
      setInterviewAlerts((prev) => [
        ...prev,
        {
          eventType: "INTERVIEW_ENDED",
          text: `Interview ended. Total duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
          timestamp: new Date().toLocaleTimeString(),
          type: "info",
        },
      ]);
    });

    // Candidate focus and visibility alerts
    socket.on("interviewActivityAlert", ({ eventType, candidateName, timestamp }) => {
      const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
      let alertText = `${candidateName}: ${eventType}`;
      let alertType = "info";

      switch (eventType) {
        case "TAB_HIDDEN":
          alertText = `⚠ ${candidateName} changed page visibility (tab hidden)`;
          alertType = "warning";
          break;
        case "TAB_VISIBLE":
          alertText = `✓ ${candidateName} returned to interview tab`;
          alertType = "success";
          break;
        case "WINDOW_BLURRED":
          alertText = `⚠ ${candidateName} lost window focus`;
          alertType = "warning";
          break;
        case "WINDOW_FOCUSED":
          alertText = `✓ ${candidateName} focused window`;
          alertType = "success";
          break;
        case "FULLSCREEN_ENTERED":
          alertText = `⛶ ${candidateName} entered fullscreen`;
          alertType = "info";
          break;
        case "FULLSCREEN_EXITED":
          alertText = `⚠ ${candidateName} exited fullscreen`;
          alertType = "warning";
          break;
      }

      setInterviewAlerts((prev) => [
        ...prev,
        {
          eventType,
          text: alertText,
          timestamp: timeStr,
          type: alertType,
        },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [backendUrl, token]);

  const isLeader = myRole === "LEADER" || socketRef.current?.id === leaderSocketId;

  const joinRoom = (roomId, userName, projectId) => {
    if (!socketRef.current) return;
    const resolvedName = userName || (user ? user.name : "Anonymous");
    const userId = user ? user.id || user._id : null;
    const avatar = user ? user.avatar : null;

    socketRef.current.emit("join", {
      roomId,
      userName: resolvedName,
      userId,
      avatar,
      projectId,
    });
    setActiveRoom(roomId);
  };

  const leaveRoom = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("leaveRoom");
    setActiveRoom(null);
    setUsers([]);
    setCollaborators([]);
    setRoomPermissions([]);
    setInterviewAlerts([]);
    setInterviewState({
      active: false,
      candidateSocketId: null,
      candidateName: null,
      candidateId: null,
      startedAt: null,
    });
  };

  const emitCodeChange = (roomId, code, fileId, language) => {
    if (!socketRef.current) return;
    // Client-side guard (matches server-side enforcement)
    if (leaderMode && !canEdit && !isLeader) {
      setPermissionNotice("Cannot edit: You are in VIEW ONLY mode.");
      setTimeout(() => setPermissionNotice(""), 3000);
      return;
    }
    socketRef.current.emit("codeChange", { roomId, code, fileId, language });
  };

  const emitTyping = (roomId, userName) => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { roomId, userName });
  };

  const emitLanguageChange = (roomId, language, fileId) => {
    if (!socketRef.current) return;
    socketRef.current.emit("languageChange", { roomId, language, fileId });
  };

  const emitCompileCode = (payload) => {
    if (!socketRef.current) return;
    socketRef.current.emit("compileCode", payload);
  };

  // Leader Mode Controls
  const toggleLeaderMode = (enabled) => {
    if (!socketRef.current || !activeRoom) return;
    socketRef.current.emit("setLeaderMode", { roomId: activeRoom, enabled });
  };

  const grantEditPermission = (targetSocketId) => {
    if (!socketRef.current || !activeRoom) return;
    socketRef.current.emit("grantEditPermission", { roomId: activeRoom, targetSocketId });
    setPendingPermissionRequests((prev) => prev.filter((r) => r.requesterSocketId !== targetSocketId));
  };

  const revokeEditPermission = (targetSocketId) => {
    if (!socketRef.current || !activeRoom) return;
    socketRef.current.emit("revokeEditPermission", { roomId: activeRoom, targetSocketId });
  };

  const requestEditPermission = () => {
    if (!socketRef.current || !activeRoom) return;
    socketRef.current.emit("requestEditPermission", { roomId: activeRoom });
    setPermissionNotice("Permission requested from Room Leader.");
    setTimeout(() => setPermissionNotice(""), 3000);
  };

  // Interview Mode Controls
  const startInterview = (candidateSocketId, candidateName, candidateId) => {
    if (!socketRef.current || !activeRoom) return;
    socketRef.current.emit("startInterview", {
      roomId: activeRoom,
      candidateSocketId,
      candidateName,
      candidateId,
    });
  };

  const endInterview = () => {
    if (!socketRef.current || !activeRoom) return;
    socketRef.current.emit("endInterview", { roomId: activeRoom });
  };

  const emitCandidateFocusEvent = (eventType, metadata = {}) => {
    if (!socketRef.current || !activeRoom) return;
    socketRef.current.emit("candidateFocusEvent", {
      roomId: activeRoom,
      eventType,
      metadata,
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        activeRoom,
        users,
        collaborators,
        typingUser,
        isLeader,
        leaderMode,
        leaderSocketId,
        leaderName,
        myRole,
        canEdit,
        roomPermissions,
        permissionNotice,
        interviewState,
        interviewAlerts,
        pendingPermissionRequests,
        joinRoom,
        leaveRoom,
        emitCodeChange,
        emitTyping,
        emitLanguageChange,
        emitCompileCode,
        toggleLeaderMode,
        grantEditPermission,
        revokeEditPermission,
        requestEditPermission,
        startInterview,
        endInterview,
        emitCandidateFocusEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
