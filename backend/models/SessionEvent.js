import mongoose from "mongoose";

const sessionEventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomSession",
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
      type: String,
      default: "Anonymous",
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "SESSION_STARTED",
        "SESSION_ENDED",
        "USER_JOINED",
        "USER_LEFT",
        "CODE_EDIT",
        "CODE_EXECUTED",
        "CODE_EXECUTION_SUCCESS",
        "CODE_EXECUTION_FAILURE",
        "FILE_OPENED",
        "AI_REQUEST",
        "AI_RESPONSE",
        "LEADER_MODE_ENABLED",
        "LEADER_MODE_DISABLED",
        "EDIT_PERMISSION_GRANTED",
        "EDIT_PERMISSION_REVOKED",
        "INTERVIEW_STARTED",
        "INTERVIEW_ENDED",
        "TAB_HIDDEN",
        "TAB_VISIBLE",
        "WINDOW_BLURRED",
        "WINDOW_FOCUSED",
        "FULLSCREEN_ENTERED",
        "FULLSCREEN_EXITED",
        "AUDIO_ENABLED",
        "AUDIO_DISABLED",
        "VIDEO_ENABLED",
        "VIDEO_DISABLED",
        "TASK_STARTED",
        "TASK_SUBMITTED",
        "QUESTIONNAIRE_SUBMITTED",
      ],
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const SessionEvent = mongoose.model("SessionEvent", sessionEventSchema);
