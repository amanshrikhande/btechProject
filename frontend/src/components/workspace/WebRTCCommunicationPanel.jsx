import { useEffect, useRef } from "react";
import { useWebRTC } from "../../hooks/useWebRTC.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  PhoneCall,
  X,
  AlertTriangle,
  Radio,
  User,
} from "lucide-react";

export const WebRTCCommunicationPanel = ({ onClose }) => {
  const { user } = useAuth();
  const {
    inCall,
    isConnecting,
    localStream,
    remoteStreams,
    isMicEnabled,
    isVideoEnabled,
    mediaError,
    joinCall,
    leaveCall,
    toggleMic,
    toggleVideo,
  } = useWebRTC();

  const localVideoRef = useRef(null);

  // Attach local stream to video element when available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, inCall]);

  return (
    <div className="side-panel" style={{ width: 340 }}>
      {/* Header */}
      <div className="side-panel-header">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(6,182,212,0.3)",
            }}
          >
            <VideoIcon size={14} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)" }}>Communication</div>
            <div style={{ fontSize: 9, color: "var(--c-text-3)", fontFamily: "monospace" }}>
              WebRTC Audio & Video Mesh
            </div>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      <div className="side-panel-body space-y-3">
        {/* Error notification banner if permission denied */}
        {mediaError && (
          <div
            style={{
              padding: 10,
              borderRadius: "var(--radius-sm)",
              background: "rgba(244,63,94,0.1)",
              border: "1px solid rgba(244,63,94,0.3)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 11,
              color: "#fda4af",
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={14} color="var(--c-rose)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Media Permission Notice:</strong> {mediaError}
              <div style={{ marginTop: 4, color: "var(--c-text-3)", fontSize: 10 }}>
                Code editing and execution remain fully functional.
              </div>
            </div>
          </div>
        )}

        {/* Join Call Prompt if not in call */}
        {!inCall ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              background: "var(--c-surface-2)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--c-border)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--c-cyan-dim)",
                color: "var(--c-cyan)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <Radio size={22} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", marginBottom: 4 }}>
              Voice & Video Room
            </div>
            <p style={{ fontSize: 11, color: "var(--c-text-2)", marginBottom: 16, lineHeight: 1.5 }}>
              Connect with room participants in real time. Media is transmitted peer-to-peer via WebRTC.
            </p>
            <button
              onClick={joinCall}
              disabled={isConnecting}
              className="btn btn-primary w-full"
              style={{ justifyContent: "center" }}
            >
              {isConnecting ? (
                <>Connecting...</>
              ) : (
                <>
                  <PhoneCall size={14} /> Join Communication
                </>
              )}
            </button>
          </div>
        ) : (
          /* Active Call Interface */
          <>
            {/* Control Bar: Mic, Camera, Leave Call */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: "var(--radius)",
                background: "var(--c-surface-2)",
                border: "1px solid var(--c-border)",
              }}
            >
              {/* Mic Toggle */}
              <button
                onClick={toggleMic}
                title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isMicEnabled ? "rgba(255,255,255,0.08)" : "rgba(244,63,94,0.15)",
                  color: isMicEnabled ? "var(--c-text)" : "var(--c-rose)",
                  border: isMicEnabled ? "1px solid var(--c-border)" : "1px solid rgba(244,63,94,0.3)",
                  transition: "all 0.15s",
                }}
              >
                {isMicEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={toggleVideo}
                title={isVideoEnabled ? "Disable Camera" : "Enable Camera"}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isVideoEnabled ? "rgba(255,255,255,0.08)" : "rgba(244,63,94,0.15)",
                  color: isVideoEnabled ? "var(--c-text)" : "var(--c-rose)",
                  border: isVideoEnabled ? "1px solid var(--c-border)" : "1px solid rgba(244,63,94,0.3)",
                  transition: "all 0.15s",
                }}
              >
                {isVideoEnabled ? <VideoIcon size={16} /> : <VideoOff size={16} />}
              </button>

              {/* Leave Call */}
              <button
                onClick={leaveCall}
                title="Leave Communication Call"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--c-rose)",
                  color: "#fff",
                  boxShadow: "0 2px 10px rgba(244,63,94,0.3)",
                  transition: "all 0.15s",
                }}
              >
                <PhoneOff size={16} />
              </button>
            </div>

            {/* Video Tiles Grid */}
            <div className="space-y-3" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
              {/* Local Participant Tile */}
              <div
                style={{
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  background: "#070913",
                  border: "1px solid var(--c-border)",
                  position: "relative",
                  aspectRatio: "4 / 3",
                }}
              >
                {isVideoEnabled && localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)", // Mirror local video
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--c-text-3)",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "var(--c-surface-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--c-cyan)",
                      }}
                    >
                      <User size={24} />
                    </div>
                    <span style={{ fontSize: 11 }}>Camera Off</span>
                  </div>
                )}

                {/* Tile Overlay: Name & Media Badges */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    right: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.65)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>
                    {user?.name || "You"} (You)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isMicEnabled ? (
                      <Mic size={11} color="var(--c-emerald)" />
                    ) : (
                      <MicOff size={11} color="var(--c-rose)" />
                    )}
                    {isVideoEnabled ? (
                      <VideoIcon size={11} color="var(--c-cyan)" />
                    ) : (
                      <VideoOff size={11} color="var(--c-rose)" />
                    )}
                  </div>
                </div>
              </div>

              {/* Remote Participants Video Tiles */}
              {remoteStreams.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--c-text-3)",
                    fontSize: 11,
                    background: "var(--c-surface-2)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  Waiting for other participants to join the call...
                </div>
              ) : (
                remoteStreams.map((peer) => (
                  <RemoteVideoTile key={peer.socketId} peer={peer} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Subcomponent for a remote peer's video tile
const RemoteVideoTile = ({ peer }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div
      style={{
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "#070913",
        border: "1px solid var(--c-border)",
        position: "relative",
        aspectRatio: "4 / 3",
      }}
    >
      {peer.videoEnabled && peer.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--c-text-3)",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--c-surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--c-purple)",
            }}
          >
            <User size={24} />
          </div>
          <span style={{ fontSize: 11 }}>Camera Off</span>
        </div>
      )}

      {/* Peer Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="dot dot-green" style={{ width: 6, height: 6 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{peer.userName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {peer.audioEnabled ? (
            <Mic size={11} color="var(--c-emerald)" />
          ) : (
            <MicOff size={11} color="var(--c-rose)" />
          )}
          {peer.videoEnabled ? (
            <VideoIcon size={11} color="var(--c-cyan)" />
          ) : (
            <VideoOff size={11} color="var(--c-rose)" />
          )}
        </div>
      </div>
    </div>
  );
};
