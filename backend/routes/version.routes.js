import express from "express";
import {
  getFileVersions,
  createSnapshot,
  restoreVersion,
} from "../controllers/version.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router({ mergeParams: true });

router.route("/:fileId/versions").get(optionalAuth, getFileVersions).post(optionalAuth, createSnapshot);
router.route("/:fileId/versions/:versionId/restore").post(optionalAuth, restoreVersion);

export default router;
