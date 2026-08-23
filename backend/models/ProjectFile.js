import mongoose from "mongoose";

const projectFileSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    path: {
      type: String,
      required: [true, "File path is required"],
      trim: true,
    },
    language: {
      type: String,
      default: "javascript",
    },
    content: {
      type: String,
      default: "",
    },
    isEntry: {
      type: Boolean,
      default: false,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound index for unique path per project
projectFileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export const ProjectFile = mongoose.model("ProjectFile", projectFileSchema);
