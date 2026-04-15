import { requestJson } from "../../../shared/services/httpClient.js";

const buildRewardQuery = (rewardId) => {
  if (!rewardId) return "";
  const params = new URLSearchParams({ rewardId: String(rewardId) });
  return `?${params.toString()}`;
};

export const getContributionContext = async ({ campaignId, rewardId }) =>
  requestJson(`/api/campaigns/${campaignId}/contribution-context${buildRewardQuery(rewardId)}`);

export const createContribution = async ({ campaignId, amount, rewardId, contributorNote }) =>
  requestJson(`/api/campaigns/${campaignId}/contributions`, {
    method: "POST",
    body: {
      amount,
      rewardId,
      paymentMethod: "MVP_MANUAL",
      contributorNote,
    },
  });
