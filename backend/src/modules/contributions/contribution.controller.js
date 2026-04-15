import pool from "../../config/db.js";
import * as AuthModel from "../auth/auth.model.js";
import * as CampaignModel from "../campaigns/campaign.model.js";
import { sendNewSupportNotification } from "../notifications/notification.service.js";
import * as ContributionModel from "./contribution.model.js";

const parseRewards = (rewards) => {
  if (!rewards) return [];
  if (Array.isArray(rewards)) return rewards;
  if (typeof rewards === "string") {
    try {
      const parsed = JSON.parse(rewards);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeReward = (reward, index) => ({
  id: String(reward?.id ?? `reward-${index}`),
  title: reward?.title || `Recompense ${index + 1}`,
  description: reward?.description || reward?.desc || "",
  minimumAmount: Number(reward?.amount ?? reward?.price ?? reward?.minimum_amount ?? reward?.min_amount ?? 0) || 0,
  imageUrl: reward?.image_url || reward?.image || "",
  quantity: reward?.quantity != null ? Number(reward.quantity) : null,
  remaining: reward?.remaining != null ? Number(reward.remaining) : null,
});

const parseAmount = (rawAmount) => {
  const normalized = String(rawAmount ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Le montant doit etre un nombre positif avec jusqu'a 2 decimales.");
  }

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Le montant doit etre superieur a 0.");
  }

  return amount;
};

const resolveContributionContext = (campaign, rewardId = null) => {
  const rewards = parseRewards(campaign?.rewards).map(normalizeReward);
  const selectedReward = rewardId ? rewards.find((reward) => reward.id === String(rewardId)) || null : null;
  const minimumAmount = selectedReward?.minimumAmount > 0 ? selectedReward.minimumAmount : 1;

  return {
    rewards,
    selectedReward,
    minimumAmount,
  };
};

export const getContributionContext = async (req, res) => {
  try {
    const { id } = req.params;
    const rewardId = req.query?.rewardId ?? null;
    const campaign = await CampaignModel.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    const { rewards, selectedReward, minimumAmount } = resolveContributionContext(campaign, rewardId);

    if (rewardId && !selectedReward) {
      return res.status(400).json({
        success: false,
        message: "La recompense selectionnee est introuvable pour cette campagne.",
      });
    }

    return res.status(200).json({
      success: true,
      campaign: {
        ...campaign,
        rewards,
      },
      creator: {
        id: campaign.porteur_id,
        name: campaign.creator_name,
        email: campaign.creator_email,
      },
      selectedReward,
      minimumAmount,
      collectedAmount: Number(campaign.collected_amount || 0),
      contributionCount: Number(campaign.contribution_count || 0),
    });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(404).json({ success: false, message: "Campagne introuvable." });
    }

    console.error("Get contribution context error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

export const createContribution = async (req, res) => {
  const { id } = req.params;
  const { amount, rewardId = null, paymentMethod = "MVP_MANUAL", contributorNote = null } = req.body || {};

  let parsedAmount;
  try {
    parsedAmount = parseAmount(amount);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Le montant est invalide.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const campaignQuery = await client.query(
      `SELECT c.*, u.name AS creator_name, u.email AS creator_email
       FROM campaigns c
       JOIN users u ON u.id = c.porteur_id
       WHERE c.id = $1
       FOR UPDATE`,
      [id]
    );

    const campaign = campaignQuery.rows[0];

    if (!campaign) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (campaign.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Cette campagne n'accepte pas de contributions pour le moment.",
      });
    }

    if (campaign.porteur_id === req.user.id) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas contribuer a votre propre campagne.",
      });
    }

    const { selectedReward, minimumAmount } = resolveContributionContext(campaign, rewardId);

    if (rewardId && !selectedReward) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "La recompense selectionnee est invalide.",
      });
    }

    if (parsedAmount < minimumAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Le montant minimum pour cette contribution est de ${minimumAmount} DT.`,
      });
    }

    const contribution = await ContributionModel.createContribution(
      {
        campaignId: campaign.id,
        userId: req.user.id,
        rewardId: selectedReward?.id || null,
        amount: parsedAmount.toFixed(2),
        status: "CONFIRMED",
        paymentMethod: String(paymentMethod || "MVP_MANUAL").trim() || "MVP_MANUAL",
        contributorNote: contributorNote ? String(contributorNote).trim() : null,
      },
      client
    );

    await client.query(
      `UPDATE campaigns
       SET collected_amount = collected_amount + $1::numeric,
           contribution_count = contribution_count + 1,
           current_amount = current_amount + ROUND($1::numeric * 1000)::int
       WHERE id = $2`,
      [parsedAmount.toFixed(2), campaign.id]
    );

    await client.query("COMMIT");

    const [updatedCampaign, donor] = await Promise.all([
      CampaignModel.findById(campaign.id),
      AuthModel.findById(req.user.id),
    ]);

    if (updatedCampaign && donor) {
      await sendNewSupportNotification({
        campaign: updatedCampaign,
        donor,
        amount: Math.round(parsedAmount * 1000),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Contribution confirmee. Votre soutien a bien ete enregistre.",
      contribution,
      updatedCampaignTotals: {
        collectedAmount: Number(updatedCampaign?.collected_amount || 0),
        contributionCount: Number(updatedCampaign?.contribution_count || 0),
        currentAmount: Number(updatedCampaign?.current_amount || 0),
      },
      campaign: updatedCampaign,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create contribution error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  } finally {
    client.release();
  }
};
