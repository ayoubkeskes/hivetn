import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import { getMySupportedCampaigns, getPublicProfile } from "./user.controller.js";

const router = Router();

router.get("/me/supports", authenticate, getMySupportedCampaigns);
router.get("/:id/profile", getPublicProfile);

export default router;
