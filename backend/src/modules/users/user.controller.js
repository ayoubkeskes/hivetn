import * as UserModel from "./user.model.js";

const sanitizePublicUser = (user) => ({
  id: user.id,
  name: user.name || "Utilisateur Hive",
  role: user.role || "USER",
  bio: user.bio || "",
  avatar: user.avatar || "",
  created_at: user.created_at || null,
});

export const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format to prevent database crashes
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide.",
      });
    }

    const user = await UserModel.findPublicById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    const [createdCampaigns, supportedCampaigns] = await Promise.all([
      UserModel.findPublicCreatedCampaignsByUserId(id),
      UserModel.findPublicSupportedCampaignsByUserId(id),
    ]);

    return res.status(200).json({
      success: true,
      user: sanitizePublicUser(user),
      created_campaigns: createdCampaigns,
      backed_campaigns: supportedCampaigns,
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

export const getMySupportedCampaigns = async (req, res) => {
  try {
    const campaigns = await UserModel.findPublicSupportedCampaignsByUserId(req.user.id);

    return res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get my supported campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};
