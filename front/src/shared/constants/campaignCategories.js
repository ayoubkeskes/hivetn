export const ALL_CATEGORIES_LABEL = "Toutes les catégories";

export const CAMPAIGN_CATEGORIES = [
  "Arts & BD",
  "Artisanat",
  "Cinéma & Vidéo",
  "Projets Solidaires",
  "Tech & App",
];

export const getCampaignCategoryOptions = (existingCategories = []) => {
  const normalizedExisting = existingCategories
    .map((category) => (category || "").trim())
    .filter(Boolean);

  return [...new Set([...CAMPAIGN_CATEGORIES, ...normalizedExisting])];
};
