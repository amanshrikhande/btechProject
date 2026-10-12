import mongoose from "mongoose";

const researchTaskSchema = new mongoose.Schema(
  {
    experimentId: {
      type: String,
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      default: "MEDIUM",
    },
    timeLimitMinutes: {
      type: Number,
      required: true,
      default: 30,
    },
    testSuite: {
      language: {
        type: String,
        default: "javascript",
      },
      testCode: {
        type: String,
        required: true,
      },
      expectedTotal: {
        type: Number,
        default: 10,
      },
    },
    starterCode: {
      type: String,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const ResearchTask = mongoose.model("ResearchTask", researchTaskSchema);
