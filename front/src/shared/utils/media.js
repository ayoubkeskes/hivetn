import { buildApiUrl } from "../services/api.js";

export const DEFAULT_CAMPAIGN_IMAGE = "/creator_hero_2.jpg";

const ABSOLUTE_URL_PATTERN = /^(?:https?:|data:|blob:)/i;

export const resolveMediaUrl = (url, fallback = DEFAULT_CAMPAIGN_IMAGE) => {
  const rawUrl = String(url || "").trim();

  if (!rawUrl) {
    return fallback;
  }

  if (ABSOLUTE_URL_PATTERN.test(rawUrl)) {
    return rawUrl;
  }

  const normalizedUrl = rawUrl
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^.*?(\/uploads\/.*)$/i, "$1");

  const publicPath = normalizedUrl.startsWith("/") ? normalizedUrl : `/${normalizedUrl}`;

  return buildApiUrl(publicPath);
};
