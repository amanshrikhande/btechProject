import { ExecutionLog } from "../models/ExecutionLog.js";
import { ProjectFile } from "../models/ProjectFile.js";
import { CodeVersion } from "../models/CodeVersion.js";
import { executePistonCode } from "../services/piston.service.js";

// @desc    Execute code and save ExecutionLog
// @route   POST /api/execution/run
export const runCode = async (req, res, next) => {
  try {
    const { projectId, fileId, code, language, version = "*", stdin = "" } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "Code and language are required" });
    }

    let fileName = "main";
    if (fileId) {
      const file = await ProjectFile.findById(fileId);
      if (file) {
        fileName = file.name;

        // Auto-snapshot before execution if project/file exists
        if (projectId) {
          const lastVersion = await CodeVersion.findOne({ fileId }).sort({ versionNumber: -1 });
          const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
          await CodeVersion.create({
            projectId,
            fileId,
            fileName: file.name,
            versionNumber: nextVersionNumber,
            content: code,
            author: req.user ? req.user._id : null,
            authorName: req.user ? req.user.name : "Anonymous",
            changeSummary: `Pre-execution snapshot (${language})`,
            triggerType: "pre_execution",
          });
        }
      }
    }

    // Call execution service
    const executionResult = await executePistonCode({ code, language, version, stdin });

    // Save ExecutionLog if projectId is present
    let savedLog = null;
    if (projectId) {
      savedLog = await ExecutionLog.create({
        projectId,
        fileId: fileId || null,
        fileName,
        language,
        version: executionResult.version || version,
        codeSnapshot: code,
        stdout: executionResult.stdout,
        stderr: executionResult.stderr,
        exitCode: executionResult.exitCode,
        executionTimeMs: executionResult.executionTimeMs,
        executedBy: req.user ? req.user._id : null,
        executedByName: req.user ? req.user.name : "Anonymous",
        status: executionResult.stderr && executionResult.exitCode !== 0 ? "error" : "success",
      });
    }

    res.json({
      success: true,
      result: executionResult,
      logId: savedLog ? savedLog._id : null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get execution history for a project
// @route   GET /api/projects/:projectId/executions
export const getExecutionHistory = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const history = await ExecutionLog.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("executedBy", "name email avatar");

    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    next(error);
  }
};
