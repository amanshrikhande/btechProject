import { ProjectFile } from "../models/ProjectFile.js";
import { Project } from "../models/Project.js";
import { CodeVersion } from "../models/CodeVersion.js";

// Helper to determine language by file extension
const getLanguageFromFilename = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "cpp":
    case "cc":
    case "c":
      return "cpp";
    case "java":
      return "java";
    case "html":
      return "html";
    case "css":
      return "css";
    case "json":
      return "json";
    case "md":
      return "markdown";
    default:
      return "javascript";
  }
};

// @desc    Get all files for a project
// @route   GET /api/projects/:projectId/files
export const getProjectFiles = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const files = await ProjectFile.find({ projectId }).sort({ createdAt: 1 });
    res.json({ success: true, count: files.length, data: files });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new file in a project
// @route   POST /api/projects/:projectId/files
export const createFile = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    let { name, path, content = "", language } = req.body;

    if (!name) {
      return res.status(400).json({ error: "File name is required" });
    }

    if (!path) {
      path = name.startsWith("/") ? name : `/${name}`;
    }

    if (!language) {
      language = getLanguageFromFilename(name);
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if file already exists in project
    const existingFile = await ProjectFile.findOne({ projectId, path });
    if (existingFile) {
      return res.status(400).json({ error: `File '${path}' already exists in this project` });
    }

    const file = await ProjectFile.create({
      projectId,
      name,
      path,
      language,
      content,
      lastModifiedBy: req.user ? req.user._id : null,
    });

    // Create version snapshot 1
    await CodeVersion.create({
      projectId,
      fileId: file._id,
      fileName: file.name,
      versionNumber: 1,
      content,
      author: req.user ? req.user._id : project.owner,
      authorName: req.user ? req.user.name : "System",
      changeSummary: `Created ${file.name}`,
      triggerType: "manual",
    });

    res.status(201).json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single file by ID
// @route   GET /api/files/:id
export const getFileById = async (req, res, next) => {
  try {
    const file = await ProjectFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

// @desc    Update file content
// @route   PUT /api/files/:id
export const updateFile = async (req, res, next) => {
  try {
    const { content, language } = req.body;
    const file = await ProjectFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (content !== undefined) file.content = content;
    if (language) file.language = language;
    if (req.user) file.lastModifiedBy = req.user._id;

    await file.save();

    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

// @desc    Rename or move file
// @route   PUT /api/files/:id/rename
export const renameFile = async (req, res, next) => {
  try {
    const { name, path } = req.body;
    const file = await ProjectFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (name) {
      file.name = name;
      file.language = getLanguageFromFilename(name);
    }
    if (path) file.path = path;
    if (req.user) file.lastModifiedBy = req.user._id;

    await file.save();

    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a file
// @route   DELETE /api/files/:id
export const deleteFile = async (req, res, next) => {
  try {
    const file = await ProjectFile.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Do not allow deleting entry file if it's the only one
    const fileCount = await ProjectFile.countDocuments({ projectId: file.projectId });
    if (fileCount <= 1) {
      return res.status(400).json({ error: "Cannot delete the only file in the project" });
    }

    await CodeVersion.deleteMany({ fileId: file._id });
    await ProjectFile.findByIdAndDelete(file._id);

    res.json({ success: true, message: "File successfully deleted" });
  } catch (error) {
    next(error);
  }
};
