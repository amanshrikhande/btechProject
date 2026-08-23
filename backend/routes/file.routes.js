import express from "express";
import {
  getProjectFiles,
  createFile,
  getFileById,
  updateFile,
  renameFile,
  deleteFile,
} from "../controllers/file.controller.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router({ mergeParams: true });

router.route("/").get(optionalAuth, getProjectFiles).post(optionalAuth, createFile);
router
  .route("/:id")
  .get(optionalAuth, getFileById)
  .put(optionalAuth, updateFile)
  .delete(protect, deleteFile);
router.route("/:id/rename").put(protect, renameFile);

export default router;
