import { SETTINGS_DEFAULTS } from "./settings.model.js";

const settingKeys = Object.keys(SETTINGS_DEFAULTS);

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const ensureBoolean = (value, field) => {
  if (typeof value !== "boolean") {
    throw new Error(`${field} doit etre un booleen.`);
  }
  return value;
};

const ensurePositiveNumber = (value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const number = toFiniteNumber(value);
  if (number === null || number < min || number > max) {
    throw new Error(`${field} doit etre un nombre valide.`);
  }
  return number;
};

const ensureStringArray = (value, field) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${field} doit etre une liste de textes.`);
  }

  return value.map((item) => item.trim().toUpperCase());
};

export const isValidSettingKey = (key) => settingKeys.includes(key);

export const validateSettingPayload = (key, payload, currentValue = {}) => {
  if (!isValidSettingKey(key)) {
    throw new Error("Parametre inconnu.");
  }

  const nextValue = {
    ...SETTINGS_DEFAULTS[key],
    ...currentValue,
  };

  Object.entries(payload || {}).forEach(([field, value]) => {
    if (!(field in SETTINGS_DEFAULTS[key])) {
      throw new Error(`Champ non autorise: ${field}.`);
    }

    if (key === "platform") {
      if (field === "commission_rate") nextValue[field] = ensurePositiveNumber(value, field, { min: 0, max: 30 });
      if (field === "min_campaign_amount") nextValue[field] = ensurePositiveNumber(value, field, { min: 1, max: 1000000 });
      if (field === "default_duration") nextValue[field] = ensurePositiveNumber(value, field, { min: 1, max: 365 });
      return;
    }

    if (key === "moderation") {
      nextValue[field] = ensureBoolean(value, field);
      return;
    }

    if (key === "notifications") {
      nextValue[field] = ensureBoolean(value, field);
      return;
    }

    if (key === "support") {
      if (field === "sla_hours") nextValue[field] = ensurePositiveNumber(value, field, { min: 1, max: 720 });
      if (field === "ticket_categories") nextValue[field] = ensureStringArray(value, field);
      return;
    }

    if (key === "security") {
      if (field === "max_admins") nextValue[field] = ensurePositiveNumber(value, field, { min: 1, max: 100 });
      if (field === "session_timeout") nextValue[field] = ensurePositiveNumber(value, field, { min: 5, max: 1440 });
    }
  });

  return nextValue;
};
