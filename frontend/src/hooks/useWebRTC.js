import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../context/SocketContext.jsx";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = () => {
  const { socket, activeRoom } = useSocket();

  const [inCall, setInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // socketId -> { stream, userName, avatar, audioEnabled, videoEnabled, connectionState }
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [mediaError, setMediaError] = useState("");

  const localStreamRef = useRef(null);
  const peerConnections = useRef(new Map()); // socketId -> RTCPeerConnection
  const peerMetadata = useRef(new Map()); // socketId -> { userName, avatar, audioEnabled, videoEnabled }

  // Clean up a single peer connection
  const closePeer = useCallback((peerSocketId) => {
    const pc = peerConnections.current.get(peerSocketId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnections.current.delete(peerSocketId);
    }
    peerMetadata.current.delete(peerSocketId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerSocketId);
      return next;
    });
  }, []);

  // Helper to create and configure an RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback(
    (peerSocketId, peerUser = {}) => {
      if (peerConnections.current.has(peerSocketId)) {
        return peerConnections.current.get(peerSocketId);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(peerSocketId, pc);

      if (peerUser.userName) {
        peerMetadata.current.set(peerSocketId, {
          userName: peerUser.userName,
          avatar: peerUser.avatar || null,
          audioEnabled: true,
          videoEnabled: true,
        });
      }

      // Add local stream tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-signal", {
            targetSocketId: peerSocketId,
            signal: {
              type: "candidate",
              candidate: event.candidate,
            },
          });
        }
      };

      // Handle receiving remote audio/video tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        const meta = peerMetadata.current.get(peerSocketId) || {};
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerSocketId, {
            stream,
            userName: meta.userName || "Collaborator",
            avatar: meta.avatar || null,
            audioEnabled: meta.audioEnabled ?? true,
            videoEnabled: meta.videoEnabled ?? true,
            connectionState: pc.connectionState,
          });
          return next;
        });
      };

      // Track connection state
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "failed" || state === "closed" || state === "disconnected") {
          if (state === "failed") {
            closePeer(peerSocketId);
          }
        }
      };

      return pc;
    },
    [socket, closePeer]
  );

  // Join call action
  const joinCall = async () => {
    setMediaError("");
    setIsConnecting(true);

    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        });
      } catch (err) {
        // If camera is not available or blocked, try audio only
        console.warn("[WebRTC] Video failed, attempting audio only:", err.message);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoEnabled(false);
        } catch (audioErr) {
          throw new Error("Camera and Microphone access were denied. Check browser permissions to use voice/video.");
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setInCall(true);
      setIsConnecting(false);

      // Notify other peers in room
      if (socket && activeRoom) {
        socket.emit("webrtc-join", { roomId: activeRoom });
      }
    } catch (err) {
      console.error("[WebRTC Join Call Error]:", err.message);
      setMediaError(err.message || "Failed to initialize audio/video.");
      setIsConnecting(false);
      setInCall(false);
    }
  };

  // Leave call action
  const leaveCall = useCallback(() => {
    if (socket && activeRoom) {
      socket.emit("webrtc-leave", { roomId: activeRoom });
    }

    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Close all peer connections
    for (const [id] of peerConnections.current) {
      closePeer(id);
    }
    peerConnections.current.clear();
    peerMetadata.current.clear();
    setRemoteStreams(new Map());

    setInCall(false);
    setIsConnecting(false);
  }, [socket, activeRoom, closePeer]);

  // Toggle Microphone
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    const nextState = !isMicEnabled;
    audioTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsMicEnabled(nextState);

    if (socket && activeRoom) {
      socket.emit("webrtc-media-toggle", {
        roomId: activeRoom,
        audioEnabled: nextState,
        videoEnabled: isVideoEnabled,
      });
    }
  };

  // Toggle Video / Camera
  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    const nextState = !isVideoEnabled;
    videoTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsVideoEnabled(nextState);

    if (socket && activeRoom) {
      socket.emit("webrtc-media-toggle", {
        roomId: activeRoom,
        audioEnabled: isMicEnabled,
        videoEnabled: nextState,
      });
    }
  };

  // WebRTC Signaling socket listener effect
  useEffect(() => {
    if (!socket || !inCall) return;

    // A remote peer joined the call -> initiator creates offer
    const handlePeerJoined = async ({ socketId, userName, avatar }) => {
      if (socketId === socket.id) return;
      try {
        const pc = createPeerConnection(socketId, { userName, avatar });
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        socket.emit("webrtc-signal", {
          targetSocketId: socketId,
          signal: {
            type: "offer",
            sdp: pc.localDescription,
          },
        });
      } catch (err) {
        console.error("[WebRTC Offer Error]:", err.message);
      }
    };

    // Received a signal (offer, answer, or candidate)
    const handleSignal = async ({ senderSocketId, signal, userName }) => {
      if (!signal || senderSocketId === socket.id) return;

      try {
        let pc = peerConnections.current.get(senderSocketId);

        if (signal.type === "offer") {
          pc = createPeerConnection(senderSocketId, { userName });
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("webrtc-signal", {
            targetSocketId: senderSocketId,
            signal: {
              type: "answer",
              sdp: pc.localDescription,
            },
          });
        } else if (signal.type === "answer") {
          if (pc && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } else if (signal.type === "candidate") {
          if (pc && signal.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (iceErr) {
              console.warn("[WebRTC ICE add error]:", iceErr.message);
            }
          }
        }
      } catch (err) {
        console.error("[WebRTC handleSignal Error]:", err.message);
      }
    };

    // Remote peer muted/unmuted audio or video
    const handlePeerMediaStatus = ({ socketId, audioEnabled, videoEnabled }) => {
      setRemoteStreams((prev) => {
        const peer = prev.get(socketId);
        if (!peer) return prev;
        const next = new Map(prev);
        next.set(socketId, {
          ...peer,
          audioEnabled: audioEnabled !== undefined ? audioEnabled : peer.audioEnabled,
          videoEnabled: videoEnabled !== undefined ? videoEnabled : peer.videoEnabled,
        });
        return next;
      });
    };

    // Remote peer left call
    const handlePeerLeft = ({ socketId }) => {
      closePeer(socketId);
    };

    socket.on("webrtc-user-joined", handlePeerJoined);
    socket.on("webrtc-signal", handleSignal);
    socket.on("webrtc-peer-media-status", handlePeerMediaStatus);
    socket.on("webrtc-user-left", handlePeerLeft);

    return () => {
      socket.off("webrtc-user-joined", handlePeerJoined);
      socket.off("webrtc-signal", handleSignal);
      socket.off("webrtc-peer-media-status", handlePeerMediaStatus);
      socket.off("webrtc-user-left", handlePeerLeft);
    };
  }, [socket, inCall, createPeerConnection, closePeer]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      for (const [id] of peerConnections.current) {
        closePeer(id);
      }
    };
  }, [closePeer]);

  return {
    inCall,
    isConnecting,
    localStream,
    remoteStreams: Array.from(remoteStreams.entries()).map(([socketId, data]) => ({
      socketId,
      ...data,
    })),
    isMicEnabled,
    isVideoEnabled,
    mediaError,
    joinCall,
    leaveCall,
    toggleMic,
    toggleVideo,
  };
};
