import mongoose from "mongoose";

const participantTaskSessionSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    participantName: {
      type: String,
      default: "Anonymous",
    },
    experimentId: {
      type: String,
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    condition: {
      type: String,
      enum: ["NORMAL", "CONTROLLED", "GENERIC_AI", "RAG_AI", "STANDALONE"],
      default: "STANDALONE",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    completionStatus: {
      type: String,
      enum: ["IN_PROGRESS", "SUBMITTED", "TIME_EXPIRED", "ABANDONED"],
      default: "IN_PROGRESS",
      index: true,
    },
    testsTotal: {
      type: Number,
      default: 0,
    },
    testsPassed: {
      type: Number,
      default: 0,
    },
    testsFailed: {
      type: Number,
      default: 0,
    },
    testSuccessRate: {
      type: Number,
      default: 0,
    },
    completionTimeSeconds: {
      type: Number,
      default: 0,
    },
    submissionCode: {
      type: String,
      default: "",
    },
    executionOutput: {
      type: String,
      default: "",
    },
    testDetails: [
      {
        name: String,
        status: String,
        error: String,
      },
    ],
  },
  { timestamps: true }
);

export const ParticipantTaskSession = mongoose.model(
  "ParticipantTaskSession",
  participantTaskSessionSchema
);
