import mongoose from "mongoose";

const executionLogSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectFile",
    },
    fileName: {
      type: String,
      default: "main",
    },
    language: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      default: "*",
    },
    codeSnapshot: {
      type: String,
      required: true,
    },
    stdout: {
      type: String,
      default: "",
    },
    stderr: {
      type: String,
      default: "",
    },
    exitCode: {
      type: Number,
      default: 0,
    },
    executionTimeMs: {
      type: Number,
      default: 0,
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    executedByName: {
      type: String,
      default: "Anonymous",
    },
    status: {
      type: String,
      enum: ["success", "error", "timeout"],
      default: "success",
    },
  },
  { timestamps: true }
);

export const ExecutionLog = mongoose.model("ExecutionLog", executionLogSchema);
