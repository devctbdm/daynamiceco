import express from "express";
import { getMetaStatus } from "../controllers/metaController.js";
import { protect, superAdminOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/status", protect, superAdminOnly, getMetaStatus);

export default router;
