import express from "express";
import {
  getRoomAnalytics,
  getRoomEvents,
  logSessionEvent,
  exportResearchData,
} from "../controllers/analytics.controller.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/export", protect, exportResearchData);
router.get("/room/:roomId", optionalAuth, getRoomAnalytics);
router.get("/room/:roomId/events", optionalAuth, getRoomEvents);
router.post("/event", optionalAuth, logSessionEvent);

export default router;
