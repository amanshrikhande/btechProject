import express from "express";
import {
  createOrUpdateTask,
  getTaskById,
  startTaskSession,
  submitTaskSession,
  getParticipantTaskSession,
} from "../controllers/task.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createOrUpdateTask);
router.get("/:taskId", protect, getTaskById);
router.post("/:taskId/start", protect, startTaskSession);
router.post("/:taskId/submit", protect, submitTaskSession);
router.get("/:taskId/session", protect, getParticipantTaskSession);

export default router;
