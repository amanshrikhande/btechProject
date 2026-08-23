import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "editor", "viewer"],
          default: "editor",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activeRoomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    defaultLanguage: {
      type: String,
      enum: ["javascript", "python", "cpp", "java", "typescript", "go", "rust"],
      default: "javascript",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Project = mongoose.model("Project", projectSchema);
