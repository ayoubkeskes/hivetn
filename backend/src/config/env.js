import "dotenv/config";

const normalizeNumber = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeString = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const stripTrailingSlash = (value, fallback) => normalizeString(value, fallback).replace(/\/+$/, "");

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: normalizeNumber(process.env.PORT, 5000),
  FRONTEND_URL: stripTrailingSlash(process.env.FRONTEND_URL, "http://localhost:5173"),
  BACKEND_URL: stripTrailingSlash(process.env.BACKEND_URL, "http://localhost:5000"),
  STRIPE_SECRET_KEY: normalizeString(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: normalizeString(process.env.STRIPE_WEBHOOK_SECRET),
  STRIPE_CURRENCY: normalizeString(process.env.STRIPE_CURRENCY, "tnd").toLowerCase(),
};

export const isProduction = env.NODE_ENV === "production";
