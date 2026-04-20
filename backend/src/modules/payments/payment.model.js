import pool from "../../config/db.js";

const paymentSelect = `
  p.id,
  p.user_id,
  p.campaign_id,
  p.stripe_session_id,
  p.stripe_payment_intent_id,
  p.amount,
  p.currency,
  p.status,
  p.provider,
  p.payment_mode,
  p.reward_id,
  p.contributor_note,
  p.created_at,
  p.updated_at,
  p.paid_at,
  c.title AS campaign_title,
  c.status AS campaign_status,
  c.porteur_id AS campaign_owner_id,
  c.target_amount AS campaign_target_amount,
  c.current_amount AS campaign_current_amount,
  u.name AS supporter_name,
  u.email AS supporter_email
`;

const resolveClient = (client) => client || pool;

export const createPayment = async (
  client,
  {
    userId,
    campaignId,
    stripeSessionId = null,
    stripePaymentIntentId = null,
    amount,
    currency = "tnd",
    status = "pending",
    provider = "stripe",
    paymentMode = "test",
    rewardId = null,
    contributorNote = null,
    paidAt = null,
  }
) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `INSERT INTO payments (
       user_id,
       campaign_id,
       stripe_session_id,
       stripe_payment_intent_id,
       amount,
       currency,
       status,
       provider,
       payment_mode,
       reward_id,
       contributor_note,
       paid_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      userId,
      campaignId,
      stripeSessionId,
      stripePaymentIntentId,
      amount,
      currency,
      status,
      provider,
      paymentMode,
      rewardId,
      contributorNote,
      paidAt,
    ]
  );

  return rows[0] ? findById(rows[0].id, client) : null;
};

export const updatePayment = async (client, paymentId, fields) => {
  const db = resolveClient(client);
  const allowed = [
    "stripe_session_id",
    "stripe_payment_intent_id",
    "amount",
    "currency",
    "status",
    "provider",
    "payment_mode",
    "reward_id",
    "contributor_note",
    "paid_at",
  ];

  const clauses = [];
  const values = [];
  let index = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      clauses.push(`${key} = $${index}`);
      values.push(fields[key]);
      index += 1;
    }
  }

  if (clauses.length === 0) {
    return findById(paymentId, client);
  }

  values.push(paymentId);

  const { rows } = await db.query(
    `UPDATE payments
     SET ${clauses.join(", ")}
     WHERE id = $${index}
     RETURNING id`,
    values
  );

  return rows[0] ? findById(rows[0].id, client) : null;
};

export const findById = async (id, client = null) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `SELECT ${paymentSelect}
     FROM payments p
     JOIN campaigns c ON c.id = p.campaign_id
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [id]
  );

  return rows[0] || null;
};

export const findByStripeSessionId = async (stripeSessionId, client = null) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `SELECT ${paymentSelect}
     FROM payments p
     JOIN campaigns c ON c.id = p.campaign_id
     JOIN users u ON u.id = p.user_id
     WHERE p.stripe_session_id = $1`,
    [stripeSessionId]
  );

  return rows[0] || null;
};

export const lockPaymentById = async (client, paymentId) => {
  const { rows } = await client.query(
    `SELECT *
     FROM payments
     WHERE id = $1
     FOR UPDATE`,
    [paymentId]
  );

  return rows[0] || null;
};

export const lockPaymentByStripeSessionId = async (client, stripeSessionId) => {
  const { rows } = await client.query(
    `SELECT *
     FROM payments
     WHERE stripe_session_id = $1
     FOR UPDATE`,
    [stripeSessionId]
  );

  return rows[0] || null;
};

export const registerWebhookEvent = async (
  client,
  {
    stripeEventId,
    eventType,
    stripeSessionId = null,
  }
) => {
  const { rows } = await client.query(
    `INSERT INTO payment_webhook_events (
       stripe_event_id,
       event_type,
       stripe_session_id
     )
     VALUES ($1, $2, $3)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING stripe_event_id`,
    [stripeEventId, eventType, stripeSessionId]
  );

  return Boolean(rows[0]);
};
