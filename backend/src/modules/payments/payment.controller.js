import pool from "../../config/db.js";
import { env } from "../../config/env.js";
import * as AuthModel from "../auth/auth.model.js";
import * as CampaignModel from "../campaigns/campaign.model.js";
import { sendNewSupportNotification } from "../notifications/notification.service.js";
import * as PaymentModel from "./payment.model.js";
import {
  constructStripeWebhookEvent,
  createStripeCheckoutSession,
  mapStripeSessionSnapshot,
  retrieveStripeCheckoutSession,
} from "./payment.service.js";

const parseRewards = (rewards) => {
  if (!rewards) return [];
  if (Array.isArray(rewards)) return rewards;

  if (typeof rewards === "string") {
    try {
      const parsed = JSON.parse(rewards);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeReward = (reward, index) => ({
  id: String(reward?.id ?? `reward-${index}`),
  title: reward?.title || `Recompense ${index + 1}`,
  minimumAmount:
    Number(reward?.amount ?? reward?.price ?? reward?.minimum_amount ?? reward?.min_amount ?? 0) || 0,
});

const resolveRewardSelection = (campaign, rewardId = null) => {
  const rewards = parseRewards(campaign?.rewards).map(normalizeReward);
  const selectedReward = rewardId ? rewards.find((reward) => reward.id === String(rewardId)) || null : null;
  const minimumAmount = selectedReward?.minimumAmount > 0 ? selectedReward.minimumAmount : 1;

  return {
    rewards,
    selectedReward,
    minimumAmount,
  };
};

const parseAmount = (rawAmount) => {
  const normalized = String(rawAmount ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Le montant doit etre un nombre positif avec jusqu'a 2 decimales.");
  }

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Le montant doit etre superieur a 0.");
  }

  return amount;
};

const sanitizeNote = (value) => {
  const note = typeof value === "string" ? value.trim() : "";

  if (!note) {
    return null;
  }

  if (note.length > 500) {
    throw new Error("Le message au createur ne doit pas depasser 500 caracteres.");
  }

  return note;
};

const buildPaymentResponse = (payment) => ({
  id: payment.id,
  stripeSessionId: payment.stripe_session_id,
  stripePaymentIntentId: payment.stripe_payment_intent_id,
  amount: Number(payment.amount || 0),
  currency: String(payment.currency || env.STRIPE_CURRENCY).toUpperCase(),
  status: payment.status,
  provider: payment.provider,
  paymentMode: payment.payment_mode,
  rewardId: payment.reward_id || null,
  contributorNote: payment.contributor_note || null,
  createdAt: payment.created_at,
  paidAt: payment.paid_at,
});

const buildCampaignSummary = (campaign) => ({
  id: campaign.id,
  title: campaign.title,
  status: campaign.status,
  targetAmount: Number(campaign.target_amount || 0),
  currentAmount: Number(campaign.current_amount || 0),
  collectedAmount: Number(campaign.collected_amount || 0),
  contributionCount: Number(campaign.contribution_count || 0),
});

const finalizeSuccessfulPayment = async ({ session, eventId = null, eventType = "checkout.session.completed" }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const payment =
      (session?.id ? await PaymentModel.findByStripeSessionId(session.id, client) : null) ||
      (session?.metadata?.paymentId ? await PaymentModel.findById(session.metadata.paymentId, client) : null);

    if (!payment) {
      throw new Error(`Paiement introuvable pour la session Stripe ${session?.id || "inconnue"}.`);
    }

    if (eventId) {
      const registered = await PaymentModel.registerWebhookEvent(client, {
        stripeEventId: eventId,
        eventType,
        stripeSessionId: session.id,
      });

      if (!registered) {
        await client.query("ROLLBACK");
        return { duplicate: true };
      }
    }

    const lockedPayment = await PaymentModel.lockPaymentById(client, payment.id);

    if (!lockedPayment) {
      throw new Error(`Impossible de verrouiller le paiement ${payment.id}.`);
    }

    if (lockedPayment.status === "paid") {
      await client.query("COMMIT");
      return { duplicate: true, paymentId: payment.id };
    }

    const paidAt = new Date();
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;

    await PaymentModel.updatePayment(client, lockedPayment.id, {
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: "paid",
      paid_at: paidAt,
    });

    await client.query(
      `UPDATE campaigns
       SET current_amount = current_amount + ROUND($1::numeric * 1000)::int,
           collected_amount = collected_amount + $1::numeric,
           contribution_count = contribution_count + 1
       WHERE id = $2`,
      [lockedPayment.amount, lockedPayment.campaign_id]
    );

    await client.query("COMMIT");

    const [campaign, donor] = await Promise.all([
      CampaignModel.findById(lockedPayment.campaign_id),
      AuthModel.findById(lockedPayment.user_id),
    ]);

    if (campaign && donor) {
      await sendNewSupportNotification({
        campaign,
        donor,
        amount: Math.round(Number(lockedPayment.amount || 0) * 1000),
      });
    }

    return { processed: true, paymentId: lockedPayment.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const markExpiredPayment = async ({ session, eventId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const payment =
      (session?.id ? await PaymentModel.findByStripeSessionId(session.id, client) : null) ||
      (session?.metadata?.paymentId ? await PaymentModel.findById(session.metadata.paymentId, client) : null);

    if (!payment) {
      throw new Error(`Paiement introuvable pour la session Stripe ${session?.id || "inconnue"}.`);
    }

    const registered = await PaymentModel.registerWebhookEvent(client, {
      stripeEventId: eventId,
      eventType: "checkout.session.expired",
      stripeSessionId: session.id,
    });

    if (!registered) {
      await client.query("ROLLBACK");
      return { duplicate: true };
    }

    const lockedPayment = await PaymentModel.lockPaymentById(client, payment.id);

    if (!lockedPayment) {
      throw new Error(`Impossible de verrouiller le paiement ${payment.id}.`);
    }

    if (lockedPayment.status === "pending") {
      await PaymentModel.updatePayment(client, lockedPayment.id, {
        status: "cancelled",
      });
    }

    await client.query("COMMIT");
    return { processed: true, paymentId: lockedPayment.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const createCheckoutSession = async (req, res) => {
  const {
    campaignId,
    amount,
    rewardId = null,
    contributorNote = null,
  } = req.body || {};

  if (!campaignId) {
    return res.status(400).json({
      success: false,
      message: "Le campaignId est obligatoire.",
    });
  }

  if (!UUID_REGEX.test(String(campaignId))) {
    return res.status(400).json({
      success: false,
      message: "Le campaignId fourni est invalide.",
    });
  }

  let parsedAmount;
  let normalizedNote;

  try {
    parsedAmount = parseAmount(amount);
    normalizedNote = sanitizeNote(contributorNote);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Les donnees de paiement sont invalides.",
    });
  }

  try {
    const [campaign, user] = await Promise.all([
      CampaignModel.findById(campaignId),
      AuthModel.findById(req.user.id),
    ]);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable. Reconnectez-vous puis reessayez.",
      });
    }

    if (campaign.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Cette campagne n'accepte pas de soutiens pour le moment.",
      });
    }

    if (campaign.porteur_id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas soutenir votre propre campagne.",
      });
    }

    const { selectedReward, minimumAmount } = resolveRewardSelection(campaign, rewardId);

    if (rewardId && !selectedReward) {
      return res.status(400).json({
        success: false,
        message: "La recompense selectionnee est invalide pour cette campagne.",
      });
    }

    if (parsedAmount < minimumAmount) {
      return res.status(400).json({
        success: false,
        message: `Le montant minimum pour cette contribution est de ${minimumAmount} DT.`,
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const payment = await PaymentModel.createPayment(client, {
        userId: user.id,
        campaignId: campaign.id,
        amount: parsedAmount.toFixed(2),
        currency: env.STRIPE_CURRENCY,
        status: "pending",
        provider: "stripe",
        paymentMode: "test",
        rewardId: selectedReward?.id || null,
        contributorNote: normalizedNote,
      });

      const session = await createStripeCheckoutSession({
        campaign,
        user,
        payment,
        amount: parsedAmount.toFixed(2),
        reward: selectedReward,
      });

      const updatedPayment = await PaymentModel.updatePayment(client, payment.id, {
        stripe_session_id: session.id,
      });

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
        payment: buildPaymentResponse(updatedPayment),
        campaign: buildCampaignSummary(campaign),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create Stripe checkout session error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Impossible de lancer le paiement Stripe de test.",
    });
  }
};

export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send("Missing Stripe signature.");
  }

  let event;

  try {
    event = constructStripeWebhookEvent(req.body, signature);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  console.log(`[stripe webhook] ${event.type} received (${event.id})`);

  try {
    if (event.type === "checkout.session.completed") {
      await finalizeSuccessfulPayment({
        session: event.data.object,
        eventId: event.id,
      });
    } else if (event.type === "checkout.session.expired") {
      await markExpiredPayment({
        session: event.data.object,
        eventId: event.id,
      });
    } else {
      console.log(`[stripe webhook] ignored event ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return res.status(500).json({
      received: false,
      message: "Erreur lors du traitement du webhook Stripe.",
    });
  }
};

export const getCheckoutSessionStatus = async (req, res) => {
  const sessionId = String(req.params.id || "").trim();

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "Identifiant de session Stripe manquant.",
    });
  }

  try {
    const payment = await PaymentModel.findByStripeSessionId(sessionId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Paiement introuvable pour cette session Stripe.",
      });
    }

    if (payment.user_id !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Acces refuse a cette session de paiement.",
      });
    }

    const stripeSession = await retrieveStripeCheckoutSession(sessionId);

    if (payment.status !== "paid" && stripeSession?.payment_status === "paid") {
      await finalizeSuccessfulPayment({
        session: stripeSession,
        eventType: "checkout.session.completed.sync",
      });
    }

    const refreshedPayment = await PaymentModel.findById(payment.id);

    return res.status(200).json({
      success: true,
      payment: buildPaymentResponse(refreshedPayment || payment),
      campaign: refreshedPayment
        ? {
            id: refreshedPayment.campaign_id,
            title: refreshedPayment.campaign_title,
            status: refreshedPayment.campaign_status,
          }
        : {
            id: payment.campaign_id,
            title: payment.campaign_title,
            status: payment.campaign_status,
          },
      stripeSession: mapStripeSessionSnapshot(stripeSession),
    });
  } catch (error) {
    console.error("Get Stripe checkout session status error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Impossible de recuperer cette session Stripe.",
    });
  }
};
