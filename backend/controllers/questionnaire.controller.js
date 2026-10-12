import { Questionnaire } from "../models/Questionnaire.js";
import { QuestionnaireResponse } from "../models/QuestionnaireResponse.js";
import { SessionEvent } from "../models/SessionEvent.js";

// Standard Questionnaires Definitions as specified
export const DEFAULT_QUESTIONNAIRES = {
  POST_COLLABORATION: {
    questionnaireId: "POST_COLLABORATION",
    title: "Post-Task Collaboration Experience Questionnaire",
    type: "LIKERT",
    description: "Please evaluate your collaboration experience on a 1 (Strongly Disagree) to 5 (Strongly Agree) scale.",
    scaleMin: 1,
    scaleMax: 5,
    questions: [
      { id: "collab_q1", text: "I was able to coordinate effectively with my partner." },
      { id: "collab_q2", text: "I understood what my partner was doing during the task." },
      { id: "collab_q3", text: "The collaboration mechanism helped us complete the task." },
      { id: "collab_q4", text: "The editing permissions were easy to understand." },
      { id: "collab_q5", text: "The editing restrictions interfered with my work." },
      { id: "collab_q6", text: "Communication between participants was effective." },
      { id: "collab_q7", text: "I would use this collaboration mechanism for remote programming." },
      { id: "collab_q8", text: "I was satisfied with the overall collaboration experience." },
    ],
  },
  POST_AI: {
    questionnaireId: "POST_AI",
    title: "Post-Task AI Assistant Evaluation Questionnaire",
    type: "LIKERT",
    description: "Please evaluate your AI assistant experience on a 1 (Strongly Disagree) to 5 (Strongly Agree) scale.",
    scaleMin: 1,
    scaleMax: 5,
    questions: [
      { id: "ai_q1", text: "The AI understood the project context." },
      { id: "ai_q2", text: "The AI responses were relevant to the task." },
      { id: "ai_q3", text: "The AI responses were technically correct." },
      { id: "ai_q4", text: "The AI reduced the time required to solve the problem." },
      { id: "ai_q5", text: "I trusted the AI suggestions." },
      { id: "ai_q6", text: "I had to manually verify the AI responses." },
      { id: "ai_q7", text: "The AI reduced my debugging effort." },
      { id: "ai_q8", text: "I would use this AI assistant for a similar project." },
    ],
  },
  NASA_TLX: {
    questionnaireId: "NASA_TLX",
    title: "NASA Task Load Index (NASA-TLX) Workload Assessment",
    type: "NASA_TLX",
    description: "Assess the subjective workload across the six NASA-TLX dimensions (0 to 100).",
    scaleMin: 0,
    scaleMax: 100,
    questions: [
      { id: "mentalDemand", text: "Mental Demand: How mentally demanding was the task?" },
      { id: "physicalDemand", text: "Physical Demand: How physically demanding was the task?" },
      { id: "temporalDemand", text: "Temporal Demand: How hurried or rushed was the pace of the task?" },
      { id: "performance", text: "Performance: How successful were you in accomplishing what you were asked to do?" },
      { id: "effort", text: "Effort: How hard did you have to work to accomplish your level of performance?" },
      { id: "frustration", text: "Frustration: How insecure, discouraged, irritated, stressed, and annoyed were you?" },
    ],
  },
};

// @desc    Get questionnaire definition
// @route   GET /api/questionnaires/:id
export const getQuestionnaire = async (req, res, next) => {
  try {
    const { id } = req.params;
    const defaultDef = DEFAULT_QUESTIONNAIRES[id];
    if (!defaultDef) {
      return res.status(404).json({ error: `Questionnaire '${id}' not found` });
    }
    res.json({ success: true, data: defaultDef });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit questionnaire response (strictly immutable once submitted)
// @route   POST /api/questionnaires/response
export const submitQuestionnaireResponse = async (req, res, next) => {
  try {
    const {
      experimentId,
      sessionId,
      condition,
      taskId,
      questionnaireId,
      responses = [],
      rawNasaTlx,
    } = req.body;

    const participantId = req.user?._id;
    const participantName = req.user?.name || "Anonymous";

    if (!experimentId || !sessionId || !questionnaireId || !condition) {
      return res.status(400).json({
        error: "experimentId, sessionId, condition, and questionnaireId are required",
      });
    }

    // IMMUTABILITY CHECK: Do not allow participants to modify already submitted responses
    const existing = await QuestionnaireResponse.findOne({
      participantId,
      sessionId,
      questionnaireId,
    });

    if (existing) {
      return res.status(409).json({
        error: "Questionnaire response already submitted and locked. Modifications are prohibited.",
        submittedAt: existing.submittedAt,
      });
    }

    const newResponse = await QuestionnaireResponse.create({
      experimentId,
      sessionId,
      participantId,
      participantName,
      condition,
      taskId: taskId || null,
      questionnaireId,
      responses,
      rawNasaTlx: rawNasaTlx || null,
      submittedAt: new Date(),
    });

    // Log telemetry event
    SessionEvent.create({
      sessionId: sessionId && sessionId.match(/^[0-9a-fA-F]{24}$/) ? sessionId : null,
      roomId: sessionId,
      userId: participantId,
      userName: participantName,
      eventType: "QUESTIONNAIRE_SUBMITTED",
      metadata: { questionnaireId, responsesCount: responses.length },
    }).catch((e) => console.error("[Questionnaire Event Error]:", e.message));

    res.status(201).json({
      success: true,
      message: "Questionnaire submitted successfully and stored as immutable research record.",
      data: newResponse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Duplicate submission: response already exists for this session.",
      });
    }
    next(error);
  }
};
