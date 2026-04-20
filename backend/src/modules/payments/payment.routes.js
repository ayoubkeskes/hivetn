import { Router } from "express";

import authenticate from "../../middlewares/auth.middleware.js";
import {
  createCheckoutSession,
  getCheckoutSessionStatus,
  handleStripeWebhook,
} from "./payment.controller.js";

const router = Router();

router.post("/create-checkout-session", authenticate, createCheckoutSession);
router.get("/session/:id", authenticate, getCheckoutSessionStatus);
router.post("/webhook", handleStripeWebhook);

export default router;
