import pool from "../../config/db.js";

const resolveClient = (client) => client || pool;

export const createContribution = async (
  {
    campaignId,
    userId,
    rewardId = null,
    amount,
    status = "CONFIRMED",
    paymentMethod = "MVP_MANUAL",
    contributorNote = null,
  },
  client = null
) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `INSERT INTO contributions (
       campaign_id,
       user_id,
       reward_id,
       amount,
       status,
       payment_method,
       contributor_note
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [campaignId, userId, rewardId, amount, status, paymentMethod, contributorNote]
  );

  return rows[0] || null;
};

export const listCampaignContributions = async (campaignId, limit = 20) => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const { rows } = await pool.query(
    `SELECT c.*, u.name AS contributor_name, u.email AS contributor_email
     FROM contributions c
     JOIN users u ON u.id = c.user_id
     WHERE c.campaign_id = $1
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [campaignId, safeLimit]
  );

  return rows;
};
