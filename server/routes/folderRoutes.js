import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from "../controllers/folderController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getFolders);
router.post("/", createFolder);
router.put("/:id", updateFolder);
router.delete("/:id", deleteFolder);

export default router;