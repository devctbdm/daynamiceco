import express from "express";
import { getVisitorOverviewController } from "../controllers/visitorController.js";
import { protect, superAdminOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/overview", protect, superAdminOnly, getVisitorOverviewController);

export default router;
