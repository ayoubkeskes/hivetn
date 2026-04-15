import pool from "../../config/db.js";

const fundingStatsSelect = `
  c.current_amount::int AS current_amount,
  c.current_amount::int AS amount_raised,
  c.collected_amount::numeric(12, 2) AS collected_amount,
  c.contribution_count::int AS contribution_count,
  COALESCE(fs.backer_count, 0)::int AS backer_count,
  COALESCE(fs.paid_donation_count, 0)::int AS paid_donation_count,
  CASE
    WHEN c.target_amount > 0 THEN ROUND((c.current_amount::numeric / c.target_amount::numeric) * 100)::int
    ELSE 0
  END AS funded_percent
`;

const fundingStatsJoin = `
  LEFT JOIN (
    SELECT
      combined.campaign_id,
      COUNT(*)::int AS backer_count,
      COUNT(*) FILTER (WHERE combined.source = 'DONATION')::int AS paid_donation_count
    FROM (
      SELECT campaign_id, 'PLEDGE'::text AS source
      FROM pledges
      WHERE status = 'SUCCESS'

      UNION ALL

      SELECT campaign_id, 'DONATION'::text AS source
      FROM donations
      WHERE status = 'PAID'

      UNION ALL

      SELECT campaign_id, 'CONTRIBUTION'::text AS source
      FROM contributions
      WHERE status = 'CONFIRMED'
    ) combined
    GROUP BY combined.campaign_id
  ) fs ON fs.campaign_id = c.id
`;

export const findPublicById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, name, role, bio, avatar, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return rows[0] || null;
};

export const findPublicCreatedCampaignsByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.porteur_id,
       c.title,
       c.description,
       c.category,
       c.target_amount,
       c.current_amount,
       c.status,
       c.rewards,
       c.story,
       c.image_url,
       c.video_url,
       c.created_at,
       c.updated_at,
       c.duration_days,
       c.launched_at,
       u.name AS creator_name,
       ${fundingStatsSelect}
     FROM campaigns c
     JOIN users u ON u.id = c.porteur_id
     ${fundingStatsJoin}
     WHERE c.porteur_id = $1
       AND c.status IN ('ACTIVE', 'CLOSED')
     ORDER BY c.created_at DESC`,
    [userId]
  );

  return rows;
};

export const findPublicSupportedCampaignsByUserId = async (userId) => {
  const { rows } = await pool.query(
    `WITH combined_supports AS (
       SELECT
         p.campaign_id,
         p.donateur_id AS user_id,
         p.amount,
         p.created_at
       FROM pledges p
       WHERE p.status = 'SUCCESS'

       UNION ALL

       SELECT
         d.campaign_id,
         d.user_id,
         d.amount_millimes AS amount,
         COALESCE(d.paid_at, d.created_at) AS created_at
       FROM donations d
       WHERE d.status = 'PAID'

       UNION ALL

       SELECT
         c.campaign_id,
         c.user_id,
         ROUND(c.amount * 1000)::int AS amount,
         c.created_at
       FROM contributions c
       WHERE c.status = 'CONFIRMED'
     ),
     combined_campaign_support_counts AS (
       SELECT
         campaign_id,
         COUNT(*)::int AS backer_count
       FROM combined_supports
       GROUP BY campaign_id
     )
     SELECT
       c.id,
       c.porteur_id,
       c.title,
       c.description,
       c.category,
       c.target_amount,
       c.current_amount,
       c.status,
       c.rewards,
       c.story,
       c.image_url,
       c.video_url,
       c.created_at,
       c.updated_at,
       c.duration_days,
       c.launched_at,
       u.name AS creator_name,
       COUNT(s.campaign_id)::int AS pledge_count,
       COALESCE(SUM(s.amount), 0)::int AS total_contributed,
       MAX(s.created_at) AS last_supported_at,
       c.current_amount::int AS amount_raised,
       COALESCE(cs.backer_count, 0)::int AS backer_count,
       CASE
         WHEN c.target_amount > 0 THEN ROUND((c.current_amount::numeric / c.target_amount::numeric) * 100)::int
         ELSE 0
       END AS funded_percent
     FROM combined_supports s
     JOIN campaigns c ON c.id = s.campaign_id
     JOIN users u ON u.id = c.porteur_id
     LEFT JOIN combined_campaign_support_counts cs ON cs.campaign_id = c.id
     WHERE s.user_id = $1
       AND c.status IN ('ACTIVE', 'CLOSED')
     GROUP BY c.id, u.name, cs.backer_count
     ORDER BY last_supported_at DESC`,
    [userId]
  );

  return rows;
};
