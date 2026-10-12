import mongoose from "mongoose";

const roomSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    leaderName: {
      type: String,
      default: "Room Leader",
    },
    collaborationMode: {
      type: String,
      enum: ["NORMAL", "LEADER", "CONTROLLED"],
      default: "NORMAL",
    },
    aiMode: {
      type: String,
      enum: ["NONE", "GENERIC", "RAG"],
      default: "RAG",
    },
    interview: {
      active: { type: Boolean, default: false },
      candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      candidateName: { type: String, default: "" },
      candidateSocketId: { type: String, default: "" },
      startedAt: { type: Date },
      endedAt: { type: Date },
    },
    participantPermissions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        socketId: String,
        name: String,
        role: {
          type: String,
          enum: ["LEADER", "EDITOR", "VIEWER"],
          default: "VIEWER",
        },
        canEdit: {
          type: Boolean,
          default: true,
        },
      },
    ],
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: {
          type: String,
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true }
);

export const RoomSession = mongoose.model("RoomSession", roomSessionSchema);
