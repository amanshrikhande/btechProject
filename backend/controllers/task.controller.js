import { ResearchTask } from "../models/ResearchTask.js";
import { ParticipantTaskSession } from "../models/ParticipantTaskSession.js";
import { SessionEvent } from "../models/SessionEvent.js";
import { executePistonCode } from "../services/piston.service.js";

// @desc    Create or update a research task
// @route   POST /api/tasks
export const createOrUpdateTask = async (req, res, next) => {
  try {
    const {
      experimentId,
      taskId,
      title,
      description,
      difficulty,
      timeLimitMinutes,
      testSuite,
      starterCode,
    } = req.body;

    if (!taskId || !title || !testSuite?.testCode) {
      return res.status(400).json({ error: "taskId, title, and testSuite.testCode are required" });
    }

    const task = await ResearchTask.findOneAndUpdate(
      { taskId },
      {
        experimentId: experimentId || "EXP-DEFAULT",
        taskId,
        title,
        description: description || "",
        difficulty: difficulty || "MEDIUM",
        timeLimitMinutes: timeLimitMinutes || 30,
        testSuite: {
          language: testSuite.language || "javascript",
          testCode: testSuite.testCode,
          expectedTotal: testSuite.expectedTotal || 10,
        },
        starterCode: starterCode || "",
        active: true,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task details by taskId
// @route   GET /api/tasks/:taskId
export const getTaskById = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await ResearchTask.findOne({ taskId });
    if (!task) {
      return res.status(404).json({ error: "Research task not found" });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Start a participant task session (handles reconnects gracefully)
// @route   POST /api/tasks/:taskId/start
export const startTaskSession = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { experimentId, sessionId, condition = "STANDALONE" } = req.body;
    const participantId = req.user?._id;
    const participantName = req.user?.name || "Anonymous";

    const task = await ResearchTask.findOne({ taskId });
    if (!task) {
      return res.status(404).json({ error: "Research task not found" });
    }

    // Check for an existing in-progress session for this user and task
    let session = await ParticipantTaskSession.findOne({
      participantId,
      taskId,
      completionStatus: "IN_PROGRESS",
    });

    if (session) {
      // Reconnection: Check if already expired server-side
      const now = new Date();
      if (now > session.expiresAt) {
        session.completionStatus = "TIME_EXPIRED";
        session.endedAt = session.expiresAt;
        session.completionTimeSeconds = Math.round(
          (session.expiresAt.getTime() - session.startedAt.getTime()) / 1000
        );
        await session.save();
      } else {
        const remainingSeconds = Math.max(
          0,
          Math.round((session.expiresAt.getTime() - now.getTime()) / 1000)
        );
        return res.json({
          success: true,
          reconnected: true,
          data: session,
          remainingSeconds,
        });
      }
    }

    // Create brand new session
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + task.timeLimitMinutes * 60 * 1000);

    session = await ParticipantTaskSession.create({
      participantId,
      participantName,
      experimentId: experimentId || task.experimentId,
      taskId,
      sessionId: sessionId || "adhoc_session",
      condition,
      startedAt,
      expiresAt,
      completionStatus: "IN_PROGRESS",
    });

    // Log telemetry event
    if (sessionId) {
      SessionEvent.create({
        sessionId: sessionId.match(/^[0-9a-fA-F]{24}$/) ? sessionId : null,
        roomId: sessionId,
        userId: participantId,
        userName: participantName,
        eventType: "TASK_STARTED",
        metadata: { taskId, expiresAt },
      }).catch((e) => console.error("[Task Start Event Error]:", e.message));
    }

    res.status(201).json({
      success: true,
      data: session,
      remainingSeconds: task.timeLimitMinutes * 60,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit task solution or trigger server-side evaluation
// @route   POST /api/tasks/:taskId/submit
export const submitTaskSession = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { submissionCode = "" } = req.body;
    const participantId = req.user?._id;

    const task = await ResearchTask.findOne({ taskId });
    if (!task) {
      return res.status(404).json({ error: "Research task not found" });
    }

    // Find active in-progress task session
    const session = await ParticipantTaskSession.findOne({
      participantId,
      taskId,
      completionStatus: "IN_PROGRESS",
    });

    if (!session) {
      return res.status(400).json({
        error: "No active in-progress session found for this task.",
      });
    }

    const now = new Date();
    const isExpired = now > session.expiresAt;
    const endedAt = isExpired ? session.expiresAt : now;
    const completionStatus = isExpired ? "TIME_EXPIRED" : "SUBMITTED";

    // Combine participant submission with the predefined test suite
    const fullExecutionPayload = `
// --- PARTICIPANT SUBMISSION ---
${submissionCode}

// --- PREDEFINED AUTOMATED TEST SUITE ---
${task.testSuite.testCode}
`;

    // Execute via Piston execution runner
    const executionResult = await executePistonCode({
      code: fullExecutionPayload,
      language: task.testSuite.language || "javascript",
    });

    const stdout = executionResult.stdout || "";
    const stderr = executionResult.stderr || "";

    // Parse test results from stdout
    let parsedResults = null;
    try {
      // Find JSON block in stdout if present
      const jsonMatch = stdout.match(/\{[\s\S]*"total"[\s\S]*"passed"[\s\S]*\}/);
      if (jsonMatch) {
        parsedResults = JSON.parse(jsonMatch[0]);
      }
    } catch (pErr) {
      console.warn("[Test Parser Warning]: Could not parse JSON test suite output:", pErr.message);
    }

    let testsTotal = task.testSuite.expectedTotal || 10;
    let testsPassed = 0;
    let testsFailed = testsTotal;
    let testDetails = [];

    if (parsedResults && parsedResults.total !== undefined) {
      testsTotal = parsedResults.total;
      testsPassed = parsedResults.passed;
      testsFailed = parsedResults.failed;
      testDetails = parsedResults.details || [];
    } else {
      // Heuristic line parsing if structured JSON was omitted
      const passMatches = stdout.match(/\bPASS\b/g) || [];
      const failMatches = stdout.match(/\bFAIL\b/g) || [];
      if (passMatches.length > 0 || failMatches.length > 0) {
        testsPassed = passMatches.length;
        testsFailed = failMatches.length;
        testsTotal = testsPassed + testsFailed;
      }
    }

    const testSuccessRate = testsTotal > 0 ? Number((testsPassed / testsTotal).toFixed(4)) : 0;
    const completionTimeSeconds = Math.max(
      1,
      Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)
    );

    session.endedAt = endedAt;
    session.completionStatus = completionStatus;
    session.testsTotal = testsTotal;
    session.testsPassed = testsPassed;
    session.testsFailed = testsFailed;
    session.testSuccessRate = testSuccessRate;
    session.completionTimeSeconds = completionTimeSeconds;
    session.submissionCode = submissionCode;
    session.executionOutput = stdout || stderr || executionResult.output;
    session.testDetails = testDetails;

    await session.save();

    // Log completion telemetry event
    if (session.sessionId) {
      SessionEvent.create({
        sessionId: session.sessionId.match(/^[0-9a-fA-F]{24}$/) ? session.sessionId : null,
        roomId: session.sessionId,
        userId: participantId,
        userName: session.participantName,
        eventType: "TASK_SUBMITTED",
        metadata: {
          taskId,
          completionStatus,
          testsPassed,
          testsTotal,
          completionTimeSeconds,
        },
      }).catch((e) => console.error("[Task Submit Event Error]:", e.message));
    }

    res.json({
      success: true,
      data: session,
      isExpired,
      summary: {
        testsTotal,
        testsPassed,
        testsFailed,
        testSuccessRate,
        completionTimeSeconds,
        completionStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get participant task session status
// @route   GET /api/tasks/:taskId/session
export const getParticipantTaskSession = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const participantId = req.user?._id;

    const session = await ParticipantTaskSession.findOne({
      participantId,
      taskId,
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(404).json({ error: "No session found for this task" });
    }

    const now = new Date();
    const remainingSeconds =
      session.completionStatus === "IN_PROGRESS"
        ? Math.max(0, Math.round((session.expiresAt.getTime() - now.getTime()) / 1000))
        : 0;

    res.json({ success: true, data: session, remainingSeconds });
  } catch (error) {
    next(error);
  }
};
