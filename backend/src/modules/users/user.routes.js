import { Router } from "express";
import { getPublicProfile } from "./user.controller.js";

const router = Router();

router.get("/:id/profile", getPublicProfile);

export default router;
