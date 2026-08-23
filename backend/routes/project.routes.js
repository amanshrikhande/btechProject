import express from "express";
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.route("/").get(protect, getProjects).post(protect, createProject);
router
  .route("/:id")
  .get(optionalAuth, getProjectById)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

export default router;
