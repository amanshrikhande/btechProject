import { Project } from "../models/Project.js";
import { ProjectFile } from "../models/ProjectFile.js";
import { CodeVersion } from "../models/CodeVersion.js";
import crypto from "crypto";

// Default starter templates per language
const STARTER_CODE = {
  javascript: `// DevShare JavaScript Project\n\nfunction greet(name) {\n  return \`Hello, \${name}! Welcome to DevShare.\`;\n}\n\nconsole.log(greet("Developer"));\n`,
  python: `# DevShare Python Project\n\ndef greet(name: str) -> str:\n    return f"Hello, {name}! Welcome to DevShare."\n\nif __name__ == "__main__":\n    print(greet("Developer"))\n`,
  cpp: `// DevShare C++ Project\n#include <iostream>\n#include <string>\n\nint main() {\n    std::string name = "Developer";\n    std::cout << "Hello, " << name << "! Welcome to DevShare." << std::endl;\n    return 0;\n}\n`,
  java: `// DevShare Java Project\npublic class Main {\n    public static void main(String[] args) {\n        String name = "Developer";\n        System.out.println("Hello, " + name + "! Welcome to DevShare.");\n    }\n}\n`,
  typescript: `// DevShare TypeScript Project\n\ninterface User {\n  name: string;\n  role: string;\n}\n\nconst user: User = { name: "Developer", role: "Collaborator" };\nconsole.log(\`Hello \${user.name} (\${user.role})! Welcome to DevShare.\`);\n`,
};

const FILE_EXTENSIONS = {
  javascript: "index.js",
  python: "main.py",
  cpp: "main.cpp",
  java: "Main.java",
  typescript: "index.ts",
};

// @desc    Get all projects for current user (owned or member)
// @route   GET /api/projects
export const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new project with initial entry file
// @route   POST /api/projects
export const createProject = async (req, res, next) => {
  try {
    const { name, description, defaultLanguage = "javascript", isPublic = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    // Generate unique active room ID
    const activeRoomId = `room_${crypto.randomBytes(4).toString("hex")}`;

    const project = await Project.create({
      name,
      description: description || "",
      owner: req.user._id,
      activeRoomId,
      defaultLanguage,
      isPublic,
      members: [{ user: req.user._id, role: "owner" }],
    });

    // Create default entry file
    const initialFileName = FILE_EXTENSIONS[defaultLanguage] || "index.js";
    const initialContent = STARTER_CODE[defaultLanguage] || "// Start coding here\n";

    const entryFile = await ProjectFile.create({
      projectId: project._id,
      name: initialFileName,
      path: `/${initialFileName}`,
      language: defaultLanguage,
      content: initialContent,
      isEntry: true,
      lastModifiedBy: req.user._id,
    });

    // Create initial version snapshot
    await CodeVersion.create({
      projectId: project._id,
      fileId: entryFile._id,
      fileName: entryFile.name,
      versionNumber: 1,
      content: initialContent,
      author: req.user._id,
      authorName: req.user.name,
      changeSummary: "Initial project creation",
      triggerType: "manual",
    });

    res.status(201).json({
      success: true,
      data: project,
      entryFile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID or Room ID
// @route   GET /api/projects/:id
export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let project;
    // Check if searching by MongoDB ObjectId or activeRoomId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(id)
        .populate("owner", "name email avatar")
        .populate("members.user", "name email avatar");
    } else {
      project = await Project.findOne({ activeRoomId: id })
        .populate("owner", "name email avatar")
        .populate("members.user", "name email avatar");
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user is a member, if not and project is public, add as collaborator
    if (req.user) {
      const isMember = project.members.some(
        (m) => m.user._id.toString() === req.user._id.toString()
      );
      if (!isMember) {
        project.members.push({ user: req.user._id, role: "editor" });
        await project.save();
      }
    }

    const files = await ProjectFile.find({ projectId: project._id }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: project,
      files,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project metadata
// @route   PUT /api/projects/:id
export const updateProject = async (req, res, next) => {
  try {
    const { name, description, defaultLanguage, isPublic } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only owner or members can update
    const isOwnerOrEditor =
      project.owner.toString() === req.user._id.toString() ||
      project.members.some(
        (m) => m.user.toString() === req.user._id.toString() && ["owner", "editor"].includes(m.role)
      );

    if (!isOwnerOrEditor) {
      return res.status(403).json({ error: "Unauthorized to update this project" });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (defaultLanguage) project.defaultLanguage = defaultLanguage;
    if (isPublic !== undefined) project.isPublic = isPublic;

    await project.save();

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project and all associated files/versions
// @route   DELETE /api/projects/:id
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the project owner can delete it" });
    }

    await ProjectFile.deleteMany({ projectId: project._id });
    await CodeVersion.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);

    res.json({ success: true, message: "Project and files successfully deleted" });
  } catch (error) {
    next(error);
  }
};
