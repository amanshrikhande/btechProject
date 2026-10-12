import express from "express";
import {
  getQuestionnaire,
  submitQuestionnaireResponse,
} from "../controllers/questionnaire.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:id", protect, getQuestionnaire);
router.post("/response", protect, submitQuestionnaireResponse);

export default router;
