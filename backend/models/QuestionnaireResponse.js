import mongoose from "mongoose";

const questionnaireResponseSchema = new mongoose.Schema(
  {
    experimentId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
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
    condition: {
      type: String,
      required: true,
      index: true,
    },
    taskId: {
      type: String,
      index: true,
    },
    questionnaireId: {
      type: String,
      required: true,
      enum: ["POST_COLLABORATION", "POST_AI", "NASA_TLX"],
      index: true,
    },
    responses: [
      {
        questionId: String,
        score: Number, // 1 to 5 Likert
      },
    ],
    rawNasaTlx: {
      mentalDemand: { type: Number, min: 0, max: 100 },
      physicalDemand: { type: Number, min: 0, max: 100 },
      temporalDemand: { type: Number, min: 0, max: 100 },
      performance: { type: Number, min: 0, max: 100 },
      effort: { type: Number, min: 0, max: 100 },
      frustration: { type: Number, min: 0, max: 100 },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isImmutable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate submissions by creating a compound unique index
questionnaireResponseSchema.index(
  { participantId: 1, sessionId: 1, questionnaireId: 1 },
  { unique: true }
);

export const QuestionnaireResponse = mongoose.model(
  "QuestionnaireResponse",
  questionnaireResponseSchema
);
