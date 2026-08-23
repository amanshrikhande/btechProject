import { CodeVersion } from "../models/CodeVersion.js";
import { ProjectFile } from "../models/ProjectFile.js";

// @desc    Get version history for a file
// @route   GET /api/files/:fileId/versions
export const getFileVersions = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const versions = await CodeVersion.find({ fileId })
      .sort({ versionNumber: -1 })
      .populate("author", "name email avatar");

    res.json({ success: true, count: versions.length, data: versions });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a manual code snapshot/version
// @route   POST /api/files/:fileId/versions
export const createSnapshot = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { changeSummary = "Manual snapshot", content } = req.body;

    const file = await ProjectFile.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const versionContent = content !== undefined ? content : file.content;

    // Determine next version number
    const lastVersion = await CodeVersion.findOne({ fileId }).sort({ versionNumber: -1 });
    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const snapshot = await CodeVersion.create({
      projectId: file.projectId,
      fileId: file._id,
      fileName: file.name,
      versionNumber: nextVersionNumber,
      content: versionContent,
      author: req.user ? req.user._id : null,
      authorName: req.user ? req.user.name : "Anonymous",
      changeSummary,
      triggerType: "manual",
    });

    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore file content to a specific historical version
// @route   POST /api/files/:fileId/versions/:versionId/restore
export const restoreVersion = async (req, res, next) => {
  try {
    const { fileId, versionId } = req.params;

    const version = await CodeVersion.findById(versionId);
    if (!version || version.fileId.toString() !== fileId) {
      return res.status(404).json({ error: "Version snapshot not found" });
    }

    const file = await ProjectFile.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Update active file content to this version
    file.content = version.content;
    if (req.user) file.lastModifiedBy = req.user._id;
    await file.save();

    // Create a new version snapshot indicating the restore action
    const lastVersion = await CodeVersion.findOne({ fileId }).sort({ versionNumber: -1 });
    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    const newSnapshot = await CodeVersion.create({
      projectId: file.projectId,
      fileId: file._id,
      fileName: file.name,
      versionNumber: nextVersionNumber,
      content: version.content,
      author: req.user ? req.user._id : null,
      authorName: req.user ? req.user.name : "Anonymous",
      changeSummary: `Restored to version ${version.versionNumber}`,
      triggerType: "manual",
    });

    res.json({
      success: true,
      message: `Restored file to version ${version.versionNumber}`,
      data: file,
      newVersion: newSnapshot,
    });
  } catch (error) {
    next(error);
  }
};
