import mongoose from "mongoose";

const questionnaireSchema = new mongoose.Schema(
  {
    questionnaireId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["LIKERT", "NASA_TLX"],
      default: "LIKERT",
    },
    description: String,
    scaleMin: {
      type: Number,
      default: 1,
    },
    scaleMax: {
      type: Number,
      default: 5,
    },
    questions: [
      {
        id: String,
        text: String,
      },
    ],
  },
  { timestamps: true }
);

export const Questionnaire = mongoose.model("Questionnaire", questionnaireSchema);
