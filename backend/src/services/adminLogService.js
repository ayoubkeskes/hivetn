import pool from "../config/db.js";

const ALLOWED_SORT_DIRECTIONS = new Set(["ASC", "DESC"]);

export const getRequestContext = (req) => ({
  ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || null,
  userAgent: req.headers["user-agent"] || null,
});

export const logAdminAction = async ({
  adminUserId,
  actionType,
  entityType,
  entityId = null,
  targetUserId = null,
  targetCampaignId = null,
  description,
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    if (!adminUserId || !actionType || !entityType || !description) {
      throw new Error("Missing required admin log fields.");
    }

    await pool.query(
      `
        INSERT INTO admin_logs (
          admin_user_id,
          action_type,
          entity_type,
          entity_id,
          target_user_id,
          target_campaign_id,
          description,
          metadata,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
      `,
      [
        adminUserId,
        actionType,
        entityType,
        entityId ? String(entityId) : null,
        targetUserId || null,
        targetCampaignId || null,
        description,
        JSON.stringify(metadata || {}),
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    console.error("Admin audit log insert failed:", error.message);
  }
};

const normalizePositiveInt = (value, fallback, { min = 1, max = 100 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const isUuid = (value) => (
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""))
);

const normalizeDateFilter = (value, { endOfDay = false } = {}) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 23:59:59`;
  return raw;
};

export const listAdminLogs = async ({
  page = 1,
  limit = 20,
  search = "",
  actionType = "",
  entityType = "",
  adminUserId = "",
  dateFrom = "",
  dateTo = "",
  sortDir = "DESC",
} = {}) => {
  const resolvedPage = normalizePositiveInt(page, 1, { min: 1, max: 100000 });
  const resolvedLimit = normalizePositiveInt(limit, 20, { min: 1, max: 100 });
  const resolvedSortDir = ALLOWED_SORT_DIRECTIONS.has(String(sortDir).toUpperCase())
    ? String(sortDir).toUpperCase()
    : "DESC";
  const offset = (resolvedPage - 1) * resolvedLimit;
  const where = [];
  const values = [];

  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (search) {
    const param = addValue(`%${search}%`);
    where.push(`(
      l.description ILIKE ${param}
      OR l.action_type ILIKE ${param}
      OR l.entity_type ILIKE ${param}
      OR admin_user.name ILIKE ${param}
      OR target_user.name ILIKE ${param}
      OR target_campaign.title ILIKE ${param}
    )`);
  }

  if (actionType) where.push(`l.action_type = ${addValue(actionType)}`);
  if (entityType) where.push(`l.entity_type = ${addValue(entityType)}`);
  if (adminUserId && isUuid(adminUserId)) where.push(`l.admin_user_id = ${addValue(adminUserId)}`);

  const normalizedDateFrom = normalizeDateFilter(dateFrom);
  const normalizedDateTo = normalizeDateFilter(dateTo, { endOfDay: true });
  if (normalizedDateFrom) where.push(`l.created_at >= ${addValue(normalizedDateFrom)}`);
  if (normalizedDateTo) where.push(`l.created_at <= ${addValue(normalizedDateTo)}`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const filterValues = [...values];
  const limitParam = `$${filterValues.length + 1}`;
  const offsetParam = `$${filterValues.length + 2}`;
  const dataValues = [...filterValues, resolvedLimit, offset];

  const dataQuery = `
    SELECT
      l.id,
      l.admin_user_id,
      l.action_type,
      l.entity_type,
      l.entity_id,
      l.target_user_id,
      l.target_campaign_id,
      l.description,
      l.metadata,
      l.ip_address,
      l.user_agent,
      l.created_at,
      admin_user.name AS admin_name,
      admin_user.email AS admin_email,
      target_user.name AS target_user_name,
      target_user.email AS target_user_email,
      target_campaign.title AS target_campaign_title
    FROM admin_logs l
    LEFT JOIN users admin_user ON admin_user.id = l.admin_user_id
    LEFT JOIN users target_user ON target_user.id = l.target_user_id
    LEFT JOIN campaigns target_campaign ON target_campaign.id = l.target_campaign_id
    ${whereSql}
    ORDER BY l.created_at ${resolvedSortDir}
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM admin_logs l
    LEFT JOIN users admin_user ON admin_user.id = l.admin_user_id
    LEFT JOIN users target_user ON target_user.id = l.target_user_id
    LEFT JOIN campaigns target_campaign ON target_campaign.id = l.target_campaign_id
    ${whereSql}
  `;

  const [dataResult, countResult, facetsResult] = await Promise.all([
    pool.query(dataQuery, dataValues),
    pool.query(countQuery, filterValues),
    pool.query(`
      SELECT
        ARRAY(SELECT DISTINCT action_type FROM admin_logs ORDER BY action_type) AS action_types,
        ARRAY(SELECT DISTINCT entity_type FROM admin_logs ORDER BY entity_type) AS entity_types
    `),
  ]);

  const total = countResult.rows[0]?.total || 0;

  return {
    logs: dataResult.rows,
    facets: facetsResult.rows[0] || { action_types: [], entity_types: [] },
    pagination: {
      page: resolvedPage,
      limit: resolvedLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / resolvedLimit)),
    },
  };
};

export const getAdminLogById = async (id) => {
  const { rows } = await pool.query(
    `
      SELECT
        l.*,
        admin_user.name AS admin_name,
        admin_user.email AS admin_email,
        target_user.name AS target_user_name,
        target_user.email AS target_user_email,
        target_campaign.title AS target_campaign_title
      FROM admin_logs l
      LEFT JOIN users admin_user ON admin_user.id = l.admin_user_id
      LEFT JOIN users target_user ON target_user.id = l.target_user_id
      LEFT JOIN campaigns target_campaign ON target_campaign.id = l.target_campaign_id
      WHERE l.id = $1
    `,
    [id]
  );

  return rows[0] || null;
};
