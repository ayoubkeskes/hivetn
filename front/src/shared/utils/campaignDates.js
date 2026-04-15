const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const getCampaignEndDate = (campaign) => {
  const startValue = campaign?.launched_at || campaign?.created_at || campaign?.createdAt;
  const durationDays = Number(campaign?.duration_days || campaign?.durationDays || 30);
  const startDate = new Date(startValue);

  if (!startValue || Number.isNaN(startDate.getTime())) return null;

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  return endDate;
};

export const getCampaignDaysLeft = (campaign) => {
  const endDate = getCampaignEndDate(campaign);
  if (!endDate) return "--";

  const remainingDays = Math.ceil((endDate.getTime() - Date.now()) / DAY_IN_MS);
  return String(Math.max(0, remainingDays));
};
