import { SessionEvent } from "../models/SessionEvent.js";
import { RoomSession } from "../models/RoomSession.js";
import { Project } from "../models/Project.js";

// @desc    Get complete session analytics and research metrics
// @route   GET /api/analytics/room/:roomId
export const getRoomAnalytics = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Find active or most recent session for this room
    const session = await RoomSession.findOne({ roomId }).sort({ createdAt: -1 });

    const filter = { roomId };
    if (session?._id) {
      filter.$or = [{ sessionId: session._id }, { roomId }];
    }

    const events = await SessionEvent.find(filter).sort({ timestamp: 1 });

    // Compute Session Duration
    const startTime = session?.startedAt ? new Date(session.startedAt) : events[0]?.timestamp ? new Date(events[0].timestamp) : new Date();
    const endTime = session?.endedAt ? new Date(session.endedAt) : new Date();
    const durationMs = Math.max(0, endTime.getTime() - startTime.getTime());
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    // Metrics counters
    let codeChanges = 0;
    let executions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let aiRequests = 0;
    let aiResponses = 0;
    let permissionChanges = 0;
    let focusEvents = 0;
    let leaderModeChanges = 0;

    const userEdits = {}; // userId or userName -> count
    const uniqueParticipants = new Set();

    if (session?.participants) {
      session.participants.forEach((p) => uniqueParticipants.add(p.name));
    }

    events.forEach((ev) => {
      if (ev.userName) uniqueParticipants.add(ev.userName);

      switch (ev.eventType) {
        case "CODE_EDIT":
          codeChanges++;
          const uKey = ev.userName || "Unknown";
          userEdits[uKey] = (userEdits[uKey] || 0) + 1;
          break;
        case "CODE_EXECUTED":
          executions++;
          break;
        case "CODE_EXECUTION_SUCCESS":
          successfulExecutions++;
          break;
        case "CODE_EXECUTION_FAILURE":
          failedExecutions++;
          break;
        case "AI_REQUEST":
          aiRequests++;
          break;
        case "AI_RESPONSE":
          aiResponses++;
          break;
        case "EDIT_PERMISSION_GRANTED":
        case "EDIT_PERMISSION_REVOKED":
          permissionChanges++;
          break;
        case "TAB_HIDDEN":
        case "WINDOW_BLURRED":
        case "FULLSCREEN_EXITED":
          focusEvents++;
          break;
        case "LEADER_MODE_ENABLED":
        case "LEADER_MODE_DISABLED":
          leaderModeChanges++;
          break;
      }
    });

    // If executions were logged via CODE_EXECUTED without separate success/failure
    if (executions > 0 && successfulExecutions === 0 && failedExecutions === 0) {
      successfulExecutions = executions;
    }

    // Collaboration Research Metrics
    const editParticipation = [];
    if (codeChanges > 0) {
      for (const [name, count] of Object.entries(userEdits)) {
        editParticipation.push({
          userName: name,
          edits: count,
          percentage: Number(((count / codeChanges) * 100).toFixed(1)),
        });
      }
    }

    // AI Assistance Rate (Requests per hour of session)
    const durationHours = Math.max(0.1, durationMinutes / 60);
    const aiAssistanceRate = Number((aiRequests / durationHours).toFixed(2));

    // Task Efficiency (Successful executions per hour)
    const taskEfficiency = Number((successfulExecutions / durationHours).toFixed(2));

    // Conflict rate: In single-buffer/real-time OT architectures where server mediates, conflict rate is 0.0%
    const conflictRate = "0.0% (Single-buffer synchronized)";

    res.json({
      success: true,
      data: {
        roomId,
        sessionId: session?._id || null,
        collaborationMode: session?.collaborationMode || "NORMAL",
        aiMode: session?.aiMode || "RAG",
        interviewActive: !!session?.interview?.active,
        candidateName: session?.interview?.candidateName || null,
        sessionDuration: durationMinutes,
        durationFormatted: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
        participantsCount: uniqueParticipants.size || 1,
        participantsList: Array.from(uniqueParticipants),
        codeChanges,
        executions,
        successfulExecutions,
        failedExecutions,
        aiRequests,
        aiResponses,
        permissionChanges,
        focusEvents,
        leaderModeChanges,
        editParticipation,
        aiAssistanceRate,
        taskEfficiency,
        conflictRate,
        totalEventsRecorded: events.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live event stream/list for a room (e.g. for Interview Activity)
// @route   GET /api/analytics/room/:roomId/events
export const getRoomEvents = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, type } = req.query;

    const query = { roomId };
    if (type) {
      query.eventType = type;
    }

    const events = await SessionEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: events.length,
      data: events.reverse(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log an explicit session event from HTTP routes (e.g. AI or API)
// @route   POST /api/analytics/event
export const logSessionEvent = async (req, res, next) => {
  try {
    const { roomId, projectId, eventType, metadata = {} } = req.body;

    if (!roomId || !eventType) {
      return res.status(400).json({ error: "roomId and eventType are required" });
    }

    const event = await SessionEvent.create({
      roomId,
      projectId: projectId || null,
      userId: req.user?._id || null,
      userName: req.user?.name || "Anonymous",
      eventType,
      metadata,
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

// Helper to convert array of objects to standard CSV string
const convertToCSV = (rows) => {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      let val = row[h];
      if (val === null || val === undefined) return '""';
      if (typeof val === "object") val = JSON.stringify(val);
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    csvLines.push(values.join(","));
  }
  return csvLines.join("\n");
};

// @desc    Bulk research data export for academic analysis
// @route   GET /api/analytics/export
export const exportResearchData = async (req, res, next) => {
  try {
    // Researcher / Admin access control
    if (req.user?.role !== "researcher" && req.user?.role !== "admin") {
      return res.status(403).json({
        error: "Access denied. Only authorized researchers or administrators can export research data.",
      });
    }

    const { experimentId, format = "csv", dataset = "all" } = req.query;

    const sessionFilter = {};
    if (experimentId) sessionFilter.roomId = new RegExp(experimentId, "i");

    // 1. Gather all room sessions
    const sessions = await RoomSession.find(sessionFilter).sort({ createdAt: -1 });

    // 2. Gather task sessions
    const { ParticipantTaskSession } = await import("../models/ParticipantTaskSession.js");
    const taskSessions = await ParticipantTaskSession.find(
      experimentId ? { experimentId } : {}
    ).sort({ createdAt: -1 });

    // 3. Gather questionnaire responses
    const { QuestionnaireResponse } = await import("../models/QuestionnaireResponse.js");
    const questionnaires = await QuestionnaireResponse.find(
      experimentId ? { experimentId } : {}
    ).sort({ createdAt: -1 });

    // 4. Gather events
    const events = await SessionEvent.find(
      experimentId ? { roomId: new RegExp(experimentId, "i") } : {}
    ).sort({ timestamp: 1 });

    // Handle dedicated AI Research Telemetry export
    if (dataset === "ai") {
      const aiEvents = events.filter((e) => e.eventType === "AI_RESPONSE");
      const aiExportRows = aiEvents.map((ev) => {
        const meta = ev.metadata || {};
        return {
          query_id: meta.queryId || ev._id.toString(),
          session_id: ev.sessionId ? ev.sessionId.toString() : ev.roomId,
          project_id: ev.projectId ? ev.projectId.toString() : "none",
          participant_id: ev.userId ? ev.userId.toString() : "ANONYMIZED_PARTICIPANT",
          timestamp: ev.timestamp ? ev.timestamp.toISOString() : "",
          model: meta.model || "qwen2.5-coder:1.5b",
          condition: meta.condition || "RAG",
          query: meta.query || "",
          response: meta.response || meta.intent || "",
          retrieved_context_ids: Array.isArray(meta.retrieved_context_ids) ? meta.retrieved_context_ids.join(";") : "",
          retrieval_scores: Array.isArray(meta.retrieval_scores) ? meta.retrieval_scores.join(";") : "",
          response_time: meta.latencyMs || meta.llmLatencyMs || 0,
          validator_result: meta.validator_result || meta.status || "UNKNOWN",
          unsupported_claim_count: meta.unsupported_claim_count || 0,
          evidence_metadata: meta.evidence_metadata ? JSON.stringify(meta.evidence_metadata) : (meta.retrievedFiles ? meta.retrievedFiles.join(";") : ""),
        };
      });

      if (format === "csv") {
        const csvData = convertToCSV(aiExportRows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=devshare_ai_telemetry_export_${Date.now()}.csv`
        );
        return res.status(200).send(csvData);
      }

      return res.json({
        success: true,
        totalAIQueries: aiExportRows.length,
        data: aiExportRows,
      });
    }

    // Assemble comprehensive research export rows
    const exportRows = [];

    // Map sessions to export records
    for (const sess of sessions) {
      const sessEvents = events.filter(
        (e) => e.roomId === sess.roomId || String(e.sessionId) === String(sess._id)
      );

      let codeChanges = 0;
      let executions = 0;
      let successfulExecutions = 0;
      let failedExecutions = 0;
      let aiRequests = 0;
      let permissionChanges = 0;
      let focusEvents = 0;

      sessEvents.forEach((ev) => {
        switch (ev.eventType) {
          case "CODE_EDIT": codeChanges++; break;
          case "CODE_EXECUTED": executions++; break;
          case "CODE_EXECUTION_SUCCESS": successfulExecutions++; break;
          case "CODE_EXECUTION_FAILURE": failedExecutions++; break;
          case "AI_REQUEST": aiRequests++; break;
          case "EDIT_PERMISSION_GRANTED":
          case "EDIT_PERMISSION_REVOKED":
          case "LEADER_MODE_ENABLED":
          case "LEADER_MODE_DISABLED":
            permissionChanges++;
            break;
          case "TAB_HIDDEN":
          case "WINDOW_BLURRED":
          case "FULLSCREEN_EXITED":
            focusEvents++;
            break;
        }
      });

      // Find matching task for this session
      const matchingTask = taskSessions.find(
        (t) => t.sessionId === sess.roomId || String(t.sessionId) === String(sess._id)
      );

      // Find matching questionnaires
      const matchingQuest = questionnaires.filter(
        (q) => q.sessionId === sess.roomId || String(q.sessionId) === String(sess._id)
      );

      const questResponsesSummary = matchingQuest
        .map((q) => `${q.questionnaireId}:${q.responses?.map((r) => r.score).join("|")}`)
        .join("; ");

      const nasaTlxSummary = matchingQuest
        .filter((q) => q.rawNasaTlx)
        .map(
          (q) =>
            `M:${q.rawNasaTlx.mentalDemand},P:${q.rawNasaTlx.physicalDemand},T:${q.rawNasaTlx.temporalDemand},Perf:${q.rawNasaTlx.performance},Eff:${q.rawNasaTlx.effort},Frust:${q.rawNasaTlx.frustration}`
        )
        .join("; ");

      const participantsList = sess.participants?.map((p) => p.name).join("; ") || "Unknown";

      exportRows.push({
        participant_id: sess.participants?.[0]?.user?.toString() || "ANONYMIZED_PARTICIPANT",
        session_id: sess._id.toString(),
        room_id: sess.roomId,
        experiment_id: experimentId || "DEVSHARE_EXP",
        task_id: matchingTask?.taskId || "N/A",
        condition: sess.collaborationMode || "NORMAL",
        ai_condition: sess.aiMode || "RAG",
        start_time: sess.startedAt ? sess.startedAt.toISOString() : "",
        end_time: sess.endedAt ? sess.endedAt.toISOString() : "",
        completion_time: matchingTask?.completionTimeSeconds || 0,
        tests_total: matchingTask?.testsTotal || 0,
        tests_passed: matchingTask?.testsPassed || 0,
        tests_failed: matchingTask?.testsFailed || 0,
        code_changes: codeChanges,
        code_executions: executions,
        successful_executions: successfulExecutions,
        failed_executions: failedExecutions,
        ai_requests: aiRequests,
        permission_changes: permissionChanges,
        focus_events: focusEvents,
        questionnaire_responses: questResponsesSummary || "NONE",
        NASA_TLX_responses: nasaTlxSummary || "NONE",
      });
    }

    if (format === "csv") {
      const csvData = convertToCSV(exportRows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=devshare_research_export_${Date.now()}.csv`
      );
      return res.status(200).send(csvData);
    }

    res.json({
      success: true,
      totalSessions: exportRows.length,
      data: exportRows,
    });
  } catch (error) {
    next(error);
  }
};
