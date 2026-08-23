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

    return () => {
      socket.disconnect();
    };
  }, [backendUrl, token]);

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
  };

  const emitCodeChange = (roomId, code, fileId, language) => {
    if (!socketRef.current) return;
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

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        activeRoom,
        users,
        collaborators,
        typingUser,
        joinRoom,
        leaveRoom,
        emitCodeChange,
        emitTyping,
        emitLanguageChange,
        emitCompileCode,
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
