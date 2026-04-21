import Stripe from "stripe";

import { env } from "../../config/env.js";

let stripeClient = null;

const createConfigError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const looksLikePlaceholderKey = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    !normalized ||
    normalized.includes("replace") ||
    normalized.includes("example") ||
    normalized.includes("your_") ||
    normalized.endsWith("_me")
  );
};

const ensureTestKey = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw createConfigError("Stripe n'est pas configure. Ajoutez STRIPE_SECRET_KEY.", 500);
  }

  if (looksLikePlaceholderKey(env.STRIPE_SECRET_KEY)) {
    throw createConfigError(
      "STRIPE_SECRET_KEY contient encore une valeur d'exemple. Remplacez-la par une vraie cle Stripe de test depuis le dashboard Stripe.",
      500
    );
  }

  if (!env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    throw createConfigError("Cette integration accepte uniquement une cle Stripe de test (sk_test_...).", 500);
  }
};

export const getStripeClient = () => {
  ensureTestKey();

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const formatAmountLabel = (amount) =>
  `${Number(amount || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${env.STRIPE_CURRENCY.toUpperCase()}`;

const toMinorUnitAmount = (amount) => {
  const numericAmount = Number.parseFloat(String(amount));

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createConfigError("Le montant Stripe est invalide.", 400);
  }

  return Math.round(numericAmount * 100);
};

const buildCancelUrl = ({ campaignId, amount, rewardId }) => {
  const params = new URLSearchParams({
    campaign_id: String(campaignId),
    amount: Number(amount).toFixed(2),
  });

  if (rewardId) {
    params.set("reward_id", String(rewardId));
  }

  return `${env.FRONTEND_URL}/payment/cancel?${params.toString()}`;
};

export const createStripeCheckoutSession = async ({
  campaign,
  user,
  payment,
  amount,
  reward,
}) => {
  const stripe = getStripeClient();
  const formattedAmount = Number(amount).toFixed(2);
  const rewardTitle = reward?.title ? ` - ${reward.title}` : "";
  const metadata = {
    paymentId: payment.id,
    campaignId: campaign.id,
    userId: user.id,
    paymentType: "support",
    rewardId: reward?.id ? String(reward.id) : "",
  };

  return stripe.checkout.sessions.create({
    mode: "payment",
    submit_type: "donate",
    billing_address_collection: "auto",
    success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: buildCancelUrl({
      campaignId: campaign.id,
      amount: formattedAmount,
      rewardId: reward?.id || null,
    }),
    client_reference_id: payment.id,
    customer_email: user.email || undefined,
    metadata,
    payment_intent_data: {
      metadata,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: env.STRIPE_CURRENCY,
          unit_amount: toMinorUnitAmount(formattedAmount),
          product_data: {
            name: `Soutien Hive.tn - ${campaign.title}${rewardTitle}`,
            description: `Paiement de test Stripe pour soutenir cette campagne (${formatAmountLabel(formattedAmount)}).`,
          },
        },
      },
    ],
  });
};

export const constructStripeWebhookEvent = (payload, signature) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw createConfigError("Stripe n'est pas configure. Ajoutez STRIPE_WEBHOOK_SECRET.", 500);
  }

  return getStripeClient().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
};

export const retrieveStripeCheckoutSession = async (sessionId) =>
  getStripeClient().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

export const mapStripeSessionSnapshot = (session) => ({
  id: session?.id || null,
  status: session?.status || null,
  paymentStatus: session?.payment_status || null,
  currency: session?.currency || null,
  amountTotal: session?.amount_total ?? null,
  customerEmail: session?.customer_details?.email || session?.customer_email || null,
  paymentIntentId:
    typeof session?.payment_intent === "string"
      ? session.payment_intent
      : session?.payment_intent?.id || null,
  metadata: session?.metadata || {},
});
