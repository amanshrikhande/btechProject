import express from "express";
import { runCode, getExecutionHistory } from "../controllers/execution.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/run", optionalAuth, runCode);
router.get("/:projectId/history", optionalAuth, getExecutionHistory);

export default router;
