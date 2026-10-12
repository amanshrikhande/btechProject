import { executePistonCode } from "../services/piston.service.js";
import { ProjectFile } from "../models/ProjectFile.js";
import { Project } from "../models/Project.js";
import { CodeVersion } from "../models/CodeVersion.js";
import { RoomSession } from "../models/RoomSession.js";
import { ExecutionLog } from "../models/ExecutionLog.js";
import { SessionEvent } from "../models/SessionEvent.js";
import { User } from "../models/User.js";

export const setupSockets = (io) => {
  // In-memory room state: roomId -> {
  //   users: Map(socketId -> { name, userId, avatar }),
  //   codeBuffers: Map(fileId -> { content, language }),
  //   debounceTimers: Map(fileId -> timer),
  //   projectId: string,
  //   sessionStartTime: number,
  //   leaderId: string | null,
  //   leaderSocketId: string | null,
  //   leaderName: string | null,
  //   leaderMode: boolean,
  //   permissions: Map(socketId -> { socketId, userId, name, role: 'LEADER'|'EDITOR'|'VIEWER', canEdit: boolean }),
  //   interviewState: { active: boolean, candidateSocketId: string | null, candidateName: string | null, candidateId: string | null, startedAt: number | null },
  //   lastEditLogTimestamps: Map(string -> number)
  // }
  const rooms = new Map();

  const getOrCreateRoom = (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        codeBuffers: new Map(),
        debounceTimers: new Map(),
        projectId: null,
        sessionStartTime: Date.now(),
        leaderId: null,
        leaderSocketId: null,
        leaderName: null,
        leaderMode: false,
        permissions: new Map(),
        interviewState: {
          active: false,
          candidateSocketId: null,
          candidateName: null,
          candidateId: null,
          startedAt: null,
        },
        lastEditLogTimestamps: new Map(),
      });
    }
    return rooms.get(roomId);
  };

  // Helper to log a session event to MongoDB without blocking
  const logEvent = async (roomId, projectId, userId, userName, eventType, metadata = {}) => {
    try {
      const room = rooms.get(roomId);
      let session = null;
      if (projectId && projectId.match(/^[0-9a-fA-F]{24}$/)) {
        session = await RoomSession.findOne({ roomId, projectId, endedAt: null });
      } else {
        session = await RoomSession.findOne({ roomId, endedAt: null });
      }

      await SessionEvent.create({
        sessionId: session?._id || null,
        roomId,
        projectId: projectId && projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null,
        userId: userId && userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null,
        userName: userName || "Anonymous",
        eventType,
        metadata,
      });
    } catch (err) {
      console.error(`[Event Log Error] ${eventType}:`, err.message);
    }
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
          io.to(roomId).emit("fileSaved", { fileId, timestamp: new Date() });
        }
      } catch (err) {
        console.error(`[Autosave Error] fileId ${fileId}:`, err.message);
      } finally {
        room.debounceTimers.delete(fileId);
      }
    }, 2000);

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

    // Helper to check if current socket is Leader
    const isSocketLeader = (room) => {
      if (!room) return false;
      return room.leaderSocketId === socket.id;
    };

    // Authoritative server-side project leadership resolution
    const findAuthorizedProjectLeader = async (room, remainingUsers) => {
      if (!room.projectId || !room.projectId.match(/^[0-9a-fA-F]{24}$/)) return null;
      try {
        const proj = await Project.findById(room.projectId);
        if (!proj) return null;

        for (const u of remainingUsers) {
          if (!u.userId || !u.userId.match(/^[0-9a-fA-F]{24}$/)) continue;
          const uidStr = u.userId.toString();

          // 1. Authoritative project owner
          if (proj.owner && proj.owner.toString() === uidStr) {
            return u;
          }

          // 2. Member with owner role on THIS project
          const member = proj.members?.find((m) => m.user && m.user.toString() === uidStr);
          if (member && member.role === "owner") {
            return u;
          }

          // 3. Authorized researcher/admin on THIS project
          if (member) {
            const userDoc = await User.findById(u.userId);
            if (userDoc && (userDoc.role === "researcher" || userDoc.role === "admin")) {
              return u;
            }
          }
        }
      } catch (err) {
        console.error("[findAuthorizedProjectLeader error]:", err.message);
      }
      return null;
    };

    // Join room
    socket.on("join", async ({ roomId, userName, userId, avatar, projectId }) => {
      if (currentRoom) {
        socket.leave(currentRoom);
        const prevRoom = rooms.get(currentRoom);
        if (prevRoom) {
          prevRoom.users.delete(socket.id);
          prevRoom.permissions.delete(socket.id);

          if (prevRoom.leaderSocketId === socket.id) {
            const remaining = Array.from(prevRoom.users.values());
            const authorizedLeader = await findAuthorizedProjectLeader(prevRoom, remaining);
            if (authorizedLeader) {
              prevRoom.leaderSocketId = authorizedLeader.socketId;
              prevRoom.leaderName = authorizedLeader.name;
              prevRoom.leaderId = authorizedLeader.userId;
              const p = prevRoom.permissions.get(authorizedLeader.socketId);
              if (p) {
                p.role = "LEADER";
                p.canEdit = true;
              }
            } else {
              prevRoom.leaderSocketId = null;
              prevRoom.leaderName = null;
              prevRoom.leaderId = null;
            }
          }

          if (prevRoom.users.size === 0) {
            await flushRoomBuffers(currentRoom);
            rooms.delete(currentRoom);
          } else {
            const userList = Array.from(prevRoom.users.values()).map((u) => u.name);
            const userDetails = Array.from(prevRoom.users.values());
            const permsList = Array.from(prevRoom.permissions.values());

            io.to(currentRoom).emit("userJoined", userList);
            io.to(currentRoom).emit("collaboratorsUpdate", userDetails);
            io.to(currentRoom).emit("roomPermissionsUpdate", permsList);
            io.to(currentRoom).emit("leaderModeChanged", {
              enabled: prevRoom.leaderMode,
              leaderSocketId: prevRoom.leaderSocketId,
              leaderName: prevRoom.leaderName,
            });
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

      // Determine project authorization for leadership:
      let isAuthorizedLeader = false;
      if (projectId && projectId.match(/^[0-9a-fA-F]{24}$/) && currentUserId && currentUserId.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          const proj = await Project.findById(projectId);
          if (proj) {
            const uidStr = currentUserId.toString();
            // 1. Authoritative project owner
            if (proj.owner && proj.owner.toString() === uidStr) {
              isAuthorizedLeader = true;
            }
            // 2. Member with owner role on THIS project
            const member = proj.members?.find((m) => m.user && m.user.toString() === uidStr);
            if (member && member.role === "owner") {
              isAuthorizedLeader = true;
            }
            // 3. Authorized researcher/admin on THIS project
            if (!isAuthorizedLeader && member) {
              const userDoc = await User.findById(currentUserId);
              if (userDoc && (userDoc.role === "researcher" || userDoc.role === "admin")) {
                isAuthorizedLeader = true;
              }
            }
          }
        } catch (e) {
          console.error("[Project leadership check error]:", e.message);
        }
      }

      // STRICT LEADERSHIP ASSIGNMENT:
      // A user is assigned Leader IF AND ONLY IF they are authorized for THIS specific project/session.
      // First participant or unrelated admin does NOT become leader.
      if (isAuthorizedLeader && (!room.leaderSocketId || isAuthorizedLeader)) {
        room.leaderSocketId = socket.id;
        room.leaderName = currentUser;
        room.leaderId = currentUserId;
      }

      // Determine initial user role & permissions
      const isLeader = room.leaderSocketId === socket.id;
      let initialRole = "EDITOR";
      let initialCanEdit = true;

      if (isLeader) {
        initialRole = "LEADER";
        initialCanEdit = true;
      } else if (room.leaderMode) {
        // If Leader Mode is currently ON, new non-leaders enter as VIEW ONLY
        initialRole = "VIEWER";
        initialCanEdit = false;
      }

      room.users.set(socket.id, {
        socketId: socket.id,
        name: currentUser,
        userId: currentUserId,
        avatar: currentAvatar,
      });

      room.permissions.set(socket.id, {
        socketId: socket.id,
        userId: currentUserId,
        name: currentUser,
        role: initialRole,
        canEdit: initialCanEdit,
      });

      const userList = Array.from(room.users.values()).map((u) => u.name);
      const userDetails = Array.from(room.users.values());
      const permsList = Array.from(room.permissions.values());

      // Send initial room sync to the connecting socket
      socket.emit("roomStateSync", {
        roomId,
        leaderId: room.leaderId,
        leaderSocketId: room.leaderSocketId,
        leaderName: room.leaderName,
        leaderMode: room.leaderMode,
        myRole: initialRole,
        canEdit: initialCanEdit,
        interviewState: room.interviewState,
        permissions: permsList,
      });

      // Broadcast room updates to all participants
      io.to(roomId).emit("userJoined", userList);
      io.to(roomId).emit("collaboratorsUpdate", userDetails);
      io.to(roomId).emit("roomPermissionsUpdate", permsList);
      io.to(roomId).emit("leaderModeChanged", {
        enabled: room.leaderMode,
        leaderSocketId: room.leaderSocketId,
        leaderName: room.leaderName,
      });

      // Log USER_JOINED event
      await logEvent(roomId, room.projectId, currentUserId, currentUser, "USER_JOINED", {
        role: initialRole,
        isLeader,
      });

      // Track session in MongoDB
      if (projectId && projectId.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          await RoomSession.findOneAndUpdate(
            { roomId, projectId, endedAt: null },
            {
              $setOnInsert: {
                roomId,
                projectId,
                startedAt: new Date(),
                leaderId: room.leaderId && room.leaderId.match(/^[0-9a-fA-F]{24}$/) ? room.leaderId : null,
                leaderName: room.leaderName || "Room Leader",
                collaborationMode: room.leaderMode ? "LEADER" : "NORMAL",
              },
              $addToSet: {
                participants: {
                  user: currentUserId && currentUserId.match(/^[0-9a-fA-F]{24}$/) ? currentUserId : null,
                  name: currentUser,
                  joinedAt: new Date(),
                },
              },
            },
            { upsert: true, returnDocument: "after" }
          );
        } catch (err) {
          console.error("[RoomSession tracking error]:", err.message);
        }
      }
    });

    // Real-time code change with strict server-side validation
    socket.on("codeChange", ({ roomId, code, fileId, language }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room) return;

      // SECURITY CHECK: In Leader Mode, only LEADER or explicit EDITOR can edit
      const userPerm = room.permissions.get(socket.id);
      const isLeader = room.leaderSocketId === socket.id;

      if (room.leaderMode) {
        const canEdit = isLeader || (userPerm && userPerm.canEdit === true);
        if (!canEdit) {
          // Reject edit attempt
          socket.emit("permissionDenied", {
            message: "Leader Mode is active. You have view-only access.",
            role: "VIEWER",
          });
          return;
        }
      }

      const key = fileId || "default";
      room.codeBuffers.set(key, { content: code, language: language || "javascript" });

      if (fileId) {
        queueFileSave(targetRoom, fileId, code, language, currentUserId);
      }

      // Log CODE_EDIT event throttled (max once every 8 seconds per user to prevent DB flood)
      const now = Date.now();
      const userKey = currentUserId || socket.id;
      const lastLog = room.lastEditLogTimestamps.get(userKey) || 0;
      if (now - lastLog > 8000) {
        room.lastEditLogTimestamps.set(userKey, now);
        logEvent(targetRoom, room.projectId, currentUserId, currentUser, "CODE_EDIT", {
          fileId,
          language,
        });
      }

      // Broadcast to other peers
      socket.to(targetRoom).emit("codeUpdate", { code, fileId, updatedBy: currentUser });
      socket.to(targetRoom).emit("legacyCodeUpdate", code);
    });

    // Typing notification
    socket.on("typing", ({ roomId, userName }) => {
      socket.to(roomId || currentRoom).emit("userTyping", userName || currentUser);
    });

    // Cursor sync
    socket.on("cursorPosition", ({ roomId, fileId, position }) => {
      socket.to(roomId || currentRoom).emit("userCursor", {
        userName: currentUser,
        avatar: currentAvatar,
        fileId,
        position,
      });
    });

    // Language change
    socket.on("languageChange", ({ roomId, language, fileId }) => {
      const room = rooms.get(roomId || currentRoom);
      if (room && fileId) {
        const buffer = room.codeBuffers.get(fileId);
        if (buffer) buffer.language = language;
      }
      io.to(roomId || currentRoom).emit("languageUpdate", language);
      io.to(roomId || currentRoom).emit("fileLanguageUpdate", { fileId, language });
    });

    // Active file sync
    socket.on("activeFileChange", ({ roomId, fileId, fileName }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (room) {
        logEvent(targetRoom, room.projectId, currentUserId, currentUser, "FILE_OPENED", {
          fileId,
          fileName,
        });
      }
      socket.to(targetRoom).emit("userActiveFile", {
        userName: currentUser,
        fileId,
        fileName,
      });
    });

    // ==========================================
    // 1. LEADER MODE & PERMISSIONS CONTROL
    // ==========================================

    socket.on("setLeaderMode", async ({ roomId, enabled }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room) return;

      // Only the Leader can toggle Leader Mode
      if (!isSocketLeader(room)) {
        socket.emit("permissionDenied", { message: "Only the Room Leader can toggle Leader Mode." });
        return;
      }

      room.leaderMode = !!enabled;

      // Update participant permissions
      for (const [sId, perm] of room.permissions.entries()) {
        if (sId === room.leaderSocketId) {
          perm.role = "LEADER";
          perm.canEdit = true;
        } else if (room.leaderMode) {
          // When Leader Mode turns ON, all other participants become VIEW ONLY by default
          perm.role = "VIEWER";
          perm.canEdit = false;
        } else {
          // If turning Leader Mode OFF, participants regain normal editing permissions
          perm.role = "EDITOR";
          perm.canEdit = true;
        }
      }

      // Log event
      await logEvent(
        targetRoom,
        room.projectId,
        currentUserId,
        currentUser,
        room.leaderMode ? "LEADER_MODE_ENABLED" : "LEADER_MODE_DISABLED",
        { enabled: room.leaderMode }
      );

      // Update database session
      try {
        await RoomSession.findOneAndUpdate(
          { roomId: targetRoom, endedAt: null },
          { collaborationMode: room.leaderMode ? "LEADER" : "NORMAL" }
        );
      } catch (e) {
        console.error("[Session update error]:", e.message);
      }

      const permsList = Array.from(room.permissions.values());

      // Notify all participants
      io.to(targetRoom).emit("leaderModeChanged", {
        enabled: room.leaderMode,
        leaderSocketId: room.leaderSocketId,
        leaderName: room.leaderName,
      });
      io.to(targetRoom).emit("roomPermissionsUpdate", permsList);

      // Send individual edit permission updates to each socket
      for (const [sId, perm] of room.permissions.entries()) {
        io.to(sId).emit("editPermissionChanged", {
          role: perm.role,
          canEdit: perm.canEdit,
        });
      }
    });

    socket.on("grantEditPermission", async ({ roomId, targetSocketId }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room) return;

      if (!isSocketLeader(room)) {
        socket.emit("permissionDenied", { message: "Only the Room Leader can manage permissions." });
        return;
      }

      const perm = room.permissions.get(targetSocketId);
      if (perm) {
        perm.role = "EDITOR";
        perm.canEdit = true;

        await logEvent(targetRoom, room.projectId, currentUserId, currentUser, "EDIT_PERMISSION_GRANTED", {
          targetUserId: perm.userId,
          targetName: perm.name,
        });

        // Notify specific user immediately
        io.to(targetSocketId).emit("editPermissionChanged", {
          role: "EDITOR",
          canEdit: true,
        });

        // Broadcast updated permission list to room
        io.to(targetRoom).emit("roomPermissionsUpdate", Array.from(room.permissions.values()));
      }
    });

    socket.on("revokeEditPermission", async ({ roomId, targetSocketId }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room) return;

      if (!isSocketLeader(room)) {
        socket.emit("permissionDenied", { message: "Only the Room Leader can manage permissions." });
        return;
      }

      // Do not allow revoking leader's own edit permission
      if (targetSocketId === room.leaderSocketId) return;

      const perm = room.permissions.get(targetSocketId);
      if (perm) {
        perm.role = "VIEWER";
        perm.canEdit = false;

        await logEvent(targetRoom, room.projectId, currentUserId, currentUser, "EDIT_PERMISSION_REVOKED", {
          targetUserId: perm.userId,
          targetName: perm.name,
        });

        // Notify specific user immediately
        io.to(targetSocketId).emit("editPermissionChanged", {
          role: "VIEWER",
          canEdit: false,
        });

        // Broadcast updated permission list to room
        io.to(targetRoom).emit("roomPermissionsUpdate", Array.from(room.permissions.values()));
      }
    });

    socket.on("requestEditPermission", ({ roomId }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room || !room.leaderSocketId) return;

      io.to(room.leaderSocketId).emit("editPermissionRequested", {
        requesterSocketId: socket.id,
        requesterName: currentUser,
        requesterUserId: currentUserId,
      });
    });

    // ==========================================
    // 2. WEBRTC AUDIO / VIDEO SIGNALING ONLY
    // ==========================================

    socket.on("webrtc-join", ({ roomId }) => {
      const targetRoom = roomId || currentRoom;
      // Notify other peers in the room that a new peer joined for WebRTC calling
      socket.to(targetRoom).emit("webrtc-user-joined", {
        socketId: socket.id,
        userName: currentUser,
        avatar: currentAvatar,
      });
    });

    socket.on("webrtc-signal", ({ targetSocketId, signal }) => {
      // Forward signaling data (offer, answer, iceCandidate) directly to target peer
      io.to(targetSocketId).emit("webrtc-signal", {
        senderSocketId: socket.id,
        signal,
        userName: currentUser,
      });
    });

    socket.on("webrtc-media-toggle", async ({ roomId, audioEnabled, videoEnabled }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);

      // Broadcast media status to room
      socket.to(targetRoom).emit("webrtc-peer-media-status", {
        socketId: socket.id,
        audioEnabled,
        videoEnabled,
      });

      // Log research events
      if (room) {
        if (audioEnabled !== undefined) {
          logEvent(
            targetRoom,
            room.projectId,
            currentUserId,
            currentUser,
            audioEnabled ? "AUDIO_ENABLED" : "AUDIO_DISABLED"
          );
        }
        if (videoEnabled !== undefined) {
          logEvent(
            targetRoom,
            room.projectId,
            currentUserId,
            currentUser,
            videoEnabled ? "VIDEO_ENABLED" : "VIDEO_DISABLED"
          );
        }
      }
    });

    socket.on("webrtc-leave", ({ roomId }) => {
      const targetRoom = roomId || currentRoom;
      socket.to(targetRoom).emit("webrtc-user-left", { socketId: socket.id });
    });

    // ==========================================
    // 3. INTERVIEW MODE & VISIBILITY / FOCUS TELEMETRY
    // ==========================================

    socket.on("startInterview", async ({ roomId, candidateSocketId, candidateName, candidateId }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room) return;

      if (!isSocketLeader(room)) {
        socket.emit("permissionDenied", { message: "Only the Room Leader can start an interview." });
        return;
      }

      room.interviewState = {
        active: true,
        candidateSocketId,
        candidateName: candidateName || "Candidate",
        candidateId: candidateId || null,
        startedAt: Date.now(),
      };

      await logEvent(targetRoom, room.projectId, currentUserId, currentUser, "INTERVIEW_STARTED", {
        candidateSocketId,
        candidateName: room.interviewState.candidateName,
      });

      try {
        await RoomSession.findOneAndUpdate(
          { roomId: targetRoom, endedAt: null },
          {
            "interview.active": true,
            "interview.candidateName": room.interviewState.candidateName,
            "interview.candidateSocketId": candidateSocketId,
            "interview.startedAt": new Date(),
          }
        );
      } catch (e) {
        console.error("[Interview update error]:", e.message);
      }

      io.to(targetRoom).emit("interviewStarted", room.interviewState);
    });

    socket.on("endInterview", async ({ roomId }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room) return;

      if (!isSocketLeader(room)) {
        socket.emit("permissionDenied", { message: "Only the Room Leader can end an interview." });
        return;
      }

      const durationSec = room.interviewState.startedAt
        ? Math.round((Date.now() - room.interviewState.startedAt) / 1000)
        : 0;

      await logEvent(targetRoom, room.projectId, currentUserId, currentUser, "INTERVIEW_ENDED", {
        durationSeconds: durationSec,
      });

      try {
        await RoomSession.findOneAndUpdate(
          { roomId: targetRoom, endedAt: null },
          {
            "interview.active": false,
            "interview.endedAt": new Date(),
          }
        );
      } catch (e) {
        console.error("[Interview end error]:", e.message);
      }

      room.interviewState = {
        active: false,
        candidateSocketId: null,
        candidateName: null,
        candidateId: null,
        startedAt: null,
      };

      io.to(targetRoom).emit("interviewEnded", { durationSeconds: durationSec });
    });

    // Attention / focus monitoring events from candidate browser
    socket.on("candidateFocusEvent", async ({ roomId, eventType, metadata = {} }) => {
      const targetRoom = roomId || currentRoom;
      const room = rooms.get(targetRoom);
      if (!room) return;

      const validEvents = [
        "TAB_HIDDEN",
        "TAB_VISIBLE",
        "WINDOW_BLURRED",
        "WINDOW_FOCUSED",
        "FULLSCREEN_ENTERED",
        "FULLSCREEN_EXITED",
      ];

      if (!validEvents.includes(eventType)) return;

      // Log focus event to MongoDB
      await logEvent(targetRoom, room.projectId, currentUserId, currentUser, eventType, metadata);

      // Real-time notification to Leader (and room)
      io.to(targetRoom).emit("interviewActivityAlert", {
        eventType,
        candidateName: currentUser,
        timestamp: new Date().toISOString(),
        metadata,
      });
    });

    // ==========================================
    // 4. CODE COMPILATION WITH EVENT LOGGING
    // ==========================================

    socket.on("compileCode", async ({ code, roomId, language, version = "*", stdin = "", fileId, projectId }) => {
      const targetRoom = roomId || currentRoom;
      const targetLang = language || "javascript";
      const room = rooms.get(targetRoom);

      io.to(targetRoom).emit("executionStarted", {
        startedBy: currentUser,
        language: targetLang,
      });

      if (room) {
        logEvent(targetRoom, projectId || room.projectId, currentUserId, currentUser, "CODE_EXECUTED", {
          language: targetLang,
        });
      }

      try {
        const executionResult = await executePistonCode({
          code,
          language: targetLang,
          version,
          stdin,
        });

        const isSuccess = !(executionResult.stderr && executionResult.exitCode !== 0);

        if (room) {
          logEvent(
            targetRoom,
            projectId || room.projectId,
            currentUserId,
            currentUser,
            isSuccess ? "CODE_EXECUTION_SUCCESS" : "CODE_EXECUTION_FAILURE",
            {
              exitCode: executionResult.exitCode,
              executionTimeMs: executionResult.executionTimeMs,
            }
          );
        }

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
              status: isSuccess ? "success" : "error",
            });
          } catch (err) {
            console.error("[Execution log error]:", err.message);
          }
        }

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
        if (room) {
          logEvent(targetRoom, projectId || room.projectId, currentUserId, currentUser, "CODE_EXECUTION_FAILURE", {
            error: error.message,
          });
        }
        io.to(targetRoom).emit("codeResponse", {
          run: { output: `Execution error: ${error.message}` },
          error: "Failed to compile code. Please try again.",
        });
      }
    });

    // Leave room
    socket.on("leaveRoom", async () => {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.users.delete(socket.id);
          room.permissions.delete(socket.id);

          await logEvent(currentRoom, room.projectId, currentUserId, currentUser, "USER_LEFT");
          socket.to(currentRoom).emit("webrtc-user-left", { socketId: socket.id });

          if (room.leaderSocketId === socket.id) {
            const remaining = Array.from(room.users.values());
            const authorizedLeader = await findAuthorizedProjectLeader(room, remaining);
            if (authorizedLeader) {
              room.leaderSocketId = authorizedLeader.socketId;
              room.leaderName = authorizedLeader.name;
              room.leaderId = authorizedLeader.userId;
              const p = room.permissions.get(authorizedLeader.socketId);
              if (p) {
                p.role = "LEADER";
                p.canEdit = true;
              }
            } else {
              room.leaderSocketId = null;
              room.leaderName = null;
              room.leaderId = null;
            }
          }

          if (room.users.size === 0) {
            await flushRoomBuffers(currentRoom);
            rooms.delete(currentRoom);
          } else {
            const userList = Array.from(room.users.values()).map((u) => u.name);
            const userDetails = Array.from(room.users.values());
            const permsList = Array.from(room.permissions.values());

            io.to(currentRoom).emit("userJoined", userList);
            io.to(currentRoom).emit("collaboratorsUpdate", userDetails);
            io.to(currentRoom).emit("roomPermissionsUpdate", permsList);
            io.to(currentRoom).emit("leaderModeChanged", {
              enabled: room.leaderMode,
              leaderSocketId: room.leaderSocketId,
              leaderName: room.leaderName,
            });
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
          room.permissions.delete(socket.id);

          await logEvent(currentRoom, room.projectId, currentUserId, currentUser, "USER_LEFT");
          socket.to(currentRoom).emit("webrtc-user-left", { socketId: socket.id });

          if (room.leaderSocketId === socket.id) {
            const remaining = Array.from(room.users.values());
            const authorizedLeader = await findAuthorizedProjectLeader(room, remaining);
            if (authorizedLeader) {
              room.leaderSocketId = authorizedLeader.socketId;
              room.leaderName = authorizedLeader.name;
              room.leaderId = authorizedLeader.userId;
              const p = room.permissions.get(authorizedLeader.socketId);
              if (p) {
                p.role = "LEADER";
                p.canEdit = true;
              }
            } else {
              room.leaderSocketId = null;
              room.leaderName = null;
              room.leaderId = null;
            }
          }

          if (room.users.size === 0) {
            await flushRoomBuffers(currentRoom);
            rooms.delete(currentRoom);
          } else {
            const userList = Array.from(room.users.values()).map((u) => u.name);
            const userDetails = Array.from(room.users.values());
            const permsList = Array.from(room.permissions.values());

            io.to(currentRoom).emit("userJoined", userList);
            io.to(currentRoom).emit("collaboratorsUpdate", userDetails);
            io.to(currentRoom).emit("roomPermissionsUpdate", permsList);
            io.to(currentRoom).emit("leaderModeChanged", {
              enabled: room.leaderMode,
              leaderSocketId: room.leaderSocketId,
              leaderName: room.leaderName,
            });
          }
        }
      }
    });
  });
};
