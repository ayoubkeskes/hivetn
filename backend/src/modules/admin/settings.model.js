import pool from "../../config/db.js";

export const SETTINGS_DEFAULTS = {
  platform: {
    commission_rate: 5,
    min_campaign_amount: 500,
    default_duration: 30,
  },
  moderation: {
    auto_approval: false,
    require_review: true,
  },
  notifications: {
    email_admin: true,
    alerts_enabled: true,
  },
  support: {
    sla_hours: 24,
    ticket_categories: ["GENERAL", "PAYMENT", "CAMPAIGN", "TECHNICAL", "ACCOUNT"],
  },
  security: {
    max_admins: 5,
    session_timeout: 120,
  },
};

export const getAllSettings = async () => {
  const { rows } = await pool.query(`
    SELECT key, value, updated_at
    FROM settings
    ORDER BY key ASC
  `);

  return rows.reduce((acc, row) => {
    acc[row.key] = {
      ...row.value,
      updated_at: row.updated_at,
    };
    return acc;
  }, {});
};

export const getSettingByKey = async (key) => {
  const { rows } = await pool.query(
    `SELECT key, value, updated_at FROM settings WHERE key = $1`,
    [key]
  );

  return rows[0] || null;
};

export const updateSetting = async (key, value) => {
  const { rows } = await pool.query(
    `
      UPDATE settings
      SET value = $2::jsonb,
          updated_at = NOW()
      WHERE key = $1
      RETURNING key, value, updated_at
    `,
    [key, JSON.stringify(value)]
  );

  return rows[0] || null;
};
