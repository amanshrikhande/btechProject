import mongoose from "mongoose";

const codeVersionSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: {
      type: String,
      default: "Collaborator",
    },
    changeSummary: {
      type: String,
      default: "Snapshot created",
    },
    triggerType: {
      type: String,
      enum: ["manual", "autosave", "pre_execution", "session_end"],
      default: "manual",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

codeVersionSchema.index({ fileId: 1, versionNumber: -1 });

export const CodeVersion = mongoose.model("CodeVersion", codeVersionSchema);
