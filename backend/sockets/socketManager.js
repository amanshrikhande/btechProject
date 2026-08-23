import { executePistonCode } from "../services/piston.service.js";
import { ProjectFile } from "../models/ProjectFile.js";
import { Project } from "../models/Project.js";
import { CodeVersion } from "../models/CodeVersion.js";
import { RoomSession } from "../models/RoomSession.js";
import { ExecutionLog } from "../models/ExecutionLog.js";

export const setupSockets = (io) => {
  // In-memory room state: roomId -> { users: Map(socketId -> { name, userId, avatar }), codeBuffers: Map(fileId -> { content, language }), debounceTimers: Map(fileId -> timer) }
  const rooms = new Map();

  const getOrCreateRoom = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        codeBuffers: new Map(),
        debounceTimers: new Map(),
        projectId: null,
        sessionStartTime: Date.now(),
      });
    }
    return rooms.get(roomId);
  };

  // Debounced database flush for a file
  const queueFileSave = (roomId, fileId, content, language, userId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.debounceTimers.has(fileId)) {
      clearTimeout(room.debounceTimers.get(fileId));
    }

    const timer = setTimeout(async () => {
      try {
        if (fileId && fileId.match(/^[0-9a-fA-F]{24}$/)) {
          await ProjectFile.findByIdAndUpdate(fileId, {
            content,
            language,
            lastModifiedBy: userId || null,
          });
          // Notify room of saved status
          io.to(roomId).emit("fileSaved", { fileId, timestamp: new Date() });
        }
      } catch (err) {
        console.error(`[Autosave Error] fileId ${fileId}:`, err.message);
      } finally {
        room.debounceTimers.delete(fileId);
      }
    }, 2000); // 2-second debounce

    room.debounceTimers.set(fileId, timer);
  };

  // Immediate flush of all buffered files in a room to MongoDB
  const flushRoomBuffers = async (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    for (const [fileId, buffer] of room.codeBuffers.entries()) {
      if (fileId && fileId.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          await ProjectFile.findByIdAndUpdate(fileId, {
            content: buffer.content,
            language: buffer.language,
          });
        } catch (err) {
          console.error(`[Flush Error] file ${fileId}:`, err.message);
        }
      }
    }
  };

  io.on("connection", (socket) => {
    let currentRoom = null;
    let currentUser = null;
    let currentUserId = null;
    let currentAvatar = null;

    // Join room
    socket.on("join", async ({ roomId, userName, userId, avatar, projectId }) => {
      if (currentRoom) {
        socket.leave(currentRoom);
        const prevRoom = rooms.get(currentRoom);
        if (prevRoom) {
          prevRoom.users.delete(socket.id);
          if (prevRoom.users.size === 0) {
            await flushRoomBuffers(currentRoom);
            rooms.delete(currentRoom);
          } else {
            const userList = Array.from(prevRoom.users.values()).map((u) => u.name);
            const userDetails = Array.from(prevRoom.users.values());
            io.to(currentRoom).emit("userJoined", userList);
            io.to(currentRoom).emit("collaboratorsUpdate", userDetails);
          }
        }
      }

      currentRoom = roomId;
      currentUser = userName || "Anonymous";
      currentUserId = userId || null;
      currentAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser)}`;

      socket.join(roomId);

      const room = getOrCreateRoom(roomId);
      if (projectId) room.projectId = projectId;

      room.users.set(socket.id, {
        socketId: socket.id,
        name: currentUser,
        userId: currentUserId,
        avatar: currentAvatar,
      });

      // Backward compatible user list (array of strings) + rich user list (array of objects)
      const userList = Array.from(room.users.values()).map((u) => u.name);
      const userDetails = Array.from(room.users.values());

      io.to(roomId).emit("userJoined", userList);
      io.to(roomId).emit("collaboratorsUpdate", userDetails);

      // Track session in database if project exists
      if (projectId && projectId.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          await RoomSession.findOneAndUpdate(
            { roomId, projectId, endedAt: null },
            {
              $setOnInsert: { roomId, projectId, startedAt: new Date() },
              $addToSet: {
                participants: {
                  user: currentUserId,
                  name: currentUser,
                  joinedAt: new Date(),
                },
              },
            },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error("[RoomSession tracking error]:", err.message);
        }
      }
    });

    // Real-time code changes (with backward compatibility)
    socket.on("codeChange", ({ roomId, code, fileId, language }) => {
      const room = rooms.get(roomId || currentRoom);
      if (room) {
        const key = fileId || "default";
        room.codeBuffers.set(key, { content: code, language: language || "javascript" });

        // Queue debounced autosave to MongoDB if valid fileId
        if (fileId) {
          queueFileSave(roomId || currentRoom, fileId, code, language, currentUserId);
        }
      }

      // Broadcast to other peers in room
      socket.to(roomId || currentRoom).emit("codeUpdate", { code, fileId, updatedBy: currentUser });
      // Legacy broadcast (direct string)
      socket.to(roomId || currentRoom).emit("legacyCodeUpdate", code);
    });

    // Typing notification
    socket.on("typing", ({ roomId, userName }) => {
      socket.to(roomId || currentRoom).emit("userTyping", userName || currentUser);
    });

    // Cursor position sync
    socket.on("cursorPosition", ({ roomId, fileId, position }) => {
      socket.to(roomId || currentRoom).emit("userCursor", {
        userName: currentUser,
        avatar: currentAvatar,
        fileId,
        position,
      });
    });

    // Language selector sync
    socket.on("languageChange", ({ roomId, language, fileId }) => {
      const room = rooms.get(roomId || currentRoom);
      if (room && fileId) {
        const buffer = room.codeBuffers.get(fileId);
        if (buffer) buffer.language = language;
      }

      io.to(roomId || currentRoom).emit("languageUpdate", language);
      io.to(roomId || currentRoom).emit("fileLanguageUpdate", { fileId, language });
    });

    // File tab switch / active file sync
    socket.on("activeFileChange", ({ roomId, fileId, fileName }) => {
      socket.to(roomId || currentRoom).emit("userActiveFile", {
        userName: currentUser,
        fileId,
        fileName,
      });
    });

    // Code execution via socket
    socket.on("compileCode", async ({ code, roomId, language, version = "*", stdin = "", fileId, projectId }) => {
      const targetRoom = roomId || currentRoom;
      const targetLang = language || "javascript";

      io.to(targetRoom).emit("executionStarted", {
        startedBy: currentUser,
        language: targetLang,
      });

      try {
        const executionResult = await executePistonCode({
          code,
          language: targetLang,
          version,
          stdin,
        });

        // Save execution log in database if projectId is present
        if (projectId && projectId.match(/^[0-9a-fA-F]{24}$/)) {
          try {
            await ExecutionLog.create({
              projectId,
              fileId: fileId || null,
              language: targetLang,
              version: executionResult.version || version,
              codeSnapshot: code,
              stdout: executionResult.stdout,
              stderr: executionResult.stderr,
              exitCode: executionResult.exitCode,
              executionTimeMs: executionResult.executionTimeMs,
              executedBy: currentUserId,
              executedByName: currentUser,
              status: executionResult.stderr && executionResult.exitCode !== 0 ? "error" : "success",
            });
          } catch (err) {
            console.error("[Execution log error]:", err.message);
          }
        }

        // Emit modern formatted response and legacy response
        io.to(targetRoom).emit("executionResult", executionResult);
        io.to(targetRoom).emit("codeResponse", {
          run: {
            output: executionResult.output,
            stdout: executionResult.stdout,
            stderr: executionResult.stderr,
            code: executionResult.exitCode,
          },
          language: executionResult.language,
          version: executionResult.version,
        });
      } catch (error) {
        console.error("[Socket compileCode Error]", error.message);
        const errorData = {
          run: { output: `Execution error: ${error.message}` },
          error: "Failed to compile code. Please try again.",
        };
        io.to(targetRoom).emit("codeResponse", errorData);
      }
    });

    // Leave room
    socket.on("leaveRoom", async () => {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.users.delete(socket.id);
          if (room.users.size === 0) {
            await flushRoomBuffers(currentRoom);
            rooms.delete(currentRoom);
          } else {
            const userList = Array.from(room.users.values()).map((u) => u.name);
            const userDetails = Array.from(room.users.values());
            io.to(currentRoom).emit("userJoined", userList);
            io.to(currentRoom).emit("collaboratorsUpdate", userDetails);
          }
        }
        socket.leave(currentRoom);
        currentRoom = null;
        currentUser = null;
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.users.delete(socket.id);
          if (room.users.size === 0) {
            await flushRoomBuffers(currentRoom);
            rooms.delete(currentRoom);
          } else {
            const userList = Array.from(room.users.values()).map((u) => u.name);
            const userDetails = Array.from(room.users.values());
            io.to(currentRoom).emit("userJoined", userList);
            io.to(currentRoom).emit("collaboratorsUpdate", userDetails);
          }
        }
      }
      console.log("[User Disconnected]", socket.id);
    });
  });
};
