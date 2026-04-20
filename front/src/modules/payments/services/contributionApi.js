import { requestJson } from "../../../shared/services/httpClient.js";

const buildRewardQuery = (rewardId) => {
  if (!rewardId) return "";
  const params = new URLSearchParams({ rewardId: String(rewardId) });
  return `?${params.toString()}`;
};

export const getContributionContext = async ({ campaignId, rewardId }) =>
  requestJson(`/api/campaigns/${campaignId}/contribution-context${buildRewardQuery(rewardId)}`);

export const createCheckoutSession = async ({ campaignId, amount, rewardId, contributorNote }) =>
  requestJson("/api/payments/create-checkout-session", {
    method: "POST",
    body: {
      campaignId,
      amount,
      rewardId,
      contributorNote,
    },
  });

export const getPaymentSession = async (sessionId) =>
  requestJson(`/api/payments/session/${encodeURIComponent(sessionId)}`);
