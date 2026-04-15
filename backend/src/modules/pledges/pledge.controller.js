import pool from "../../config/db.js";
import * as CampaignModel from "../campaigns/campaign.model.js";
import * as AuthModel from "../auth/auth.model.js";
import { sendNewSupportNotification } from "../notifications/notification.service.js";
import { parseTndToMillimes } from "../../shared/utils/money.js";
import * as DonationModel from "../payments/donation.model.js";

const resolveAmountMillimes = (body = {}) => {
  if (body.amount_millimes !== undefined || body.amountMillimes !== undefined) {
    const rawAmount = body.amount_millimes ?? body.amountMillimes;
    const parsedAmount = Number.parseInt(String(rawAmount), 10);

    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Le montant doit etre superieur a 0.");
    }

    return parsedAmount;
  }

  return parseTndToMillimes(body.amount_tnd ?? body.amountTnd ?? body.amount);
};

const getStringValue = (value) => String(value ?? "").trim();

const validatePaymentDetails = (body = {}) => {
  const holderName = getStringValue(body.holder_name ?? body.holderName);
  const cardNumber = getStringValue(body.card_number ?? body.cardNumber).replace(/\s+/g, "");
  const expiry = getStringValue(body.expiry);
  const cvc = getStringValue(body.cvc);
  const country = getStringValue(body.country) || "Tunisie";

  if (!holderName) {
    throw new Error("Le nom du titulaire est requis.");
  }

  if (!/^\d{13,19}$/.test(cardNumber)) {
    throw new Error("Le numero de carte est invalide.");
  }

  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    throw new Error("La date d'expiration est invalide.");
  }

  const [rawMonth, rawYear] = expiry.split("/").map(Number);
  const month = Number.isFinite(rawMonth) ? rawMonth : 0;
  const year = Number.isFinite(rawYear) ? 2000 + rawYear : 0;
  const now = new Date();

  if (
    month < 1 ||
    month > 12 ||
    year < now.getFullYear() ||
    (year === now.getFullYear() && month < now.getMonth() + 1)
  ) {
    throw new Error("La date d'expiration est invalide ou deja passee.");
  }

  if (!/^\d{3,4}$/.test(cvc)) {
    throw new Error("Le code CVC est invalide.");
  }

  return {
    holderName,
    country,
    maskedCardNumber: `**** **** **** ${cardNumber.slice(-4)}`,
    expiry,
  };
};

export const createPledge = async (req, res) => {
  const targetCampaignId = req.body?.campaign_id ?? req.body?.campaignId ?? null;

  if (!targetCampaignId) {
    return res.status(400).json({
      success: false,
      message: "La campagne a soutenir est obligatoire.",
    });
  }

  let amountMillimes;
  try {
    amountMillimes = resolveAmountMillimes(req.body);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Le montant de soutien est invalide.",
    });
  }

  let paymentDetails;
  try {
    paymentDetails = validatePaymentDetails(req.body);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Les informations de paiement sont invalides.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const campaignQuery = await client.query(
      `SELECT id, porteur_id, title, status
       FROM campaigns
       WHERE id = $1
       FOR UPDATE`,
      [targetCampaignId]
    );

    const lockedCampaign = campaignQuery.rows[0];

    if (!lockedCampaign) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (lockedCampaign.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Seules les campagnes actives peuvent recevoir des soutiens.",
      });
    }

    if (lockedCampaign.porteur_id === req.user.id) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas soutenir votre propre campagne.",
      });
    }

    const donation = await DonationModel.createPendingDonation(client, {
      campaignId: lockedCampaign.id,
      userId: req.user.id,
      amountMillimes,
      provider: "manual",
      description: `Contribution manuelle validee pour ${lockedCampaign.title}`,
    });

    const paidDonation = await DonationModel.updateDonation(client, donation.id, {
      status: "PAID",
      provider_status: "validated_manually",
      provider_payload_details: {
        holderName: paymentDetails.holderName,
        country: paymentDetails.country,
        maskedCardNumber: paymentDetails.maskedCardNumber,
        expiry: paymentDetails.expiry,
      },
      paid_at: new Date(),
    });

    await client.query(
      `UPDATE campaigns
       SET current_amount = current_amount + $1
       WHERE id = $2`,
      [amountMillimes, lockedCampaign.id]
    );

    await client.query("COMMIT");

    const [campaign, donor] = await Promise.all([
      CampaignModel.findById(lockedCampaign.id),
      AuthModel.findById(req.user.id),
    ]);

    if (campaign && donor) {
      await sendNewSupportNotification({
        campaign,
        donor,
        amount: amountMillimes,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Paiement confirme. Votre contribution a bien ete enregistree.",
      pledge: paidDonation
        ? {
            id: paidDonation.id,
            campaign_id: paidDonation.campaign_id,
            donor_id: paidDonation.user_id,
            amount: paidDonation.amount_millimes,
            status: paidDonation.status,
            created_at: paidDonation.paid_at || paidDonation.created_at,
          }
        : null,
      donation: paidDonation,
      campaign,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create pledge error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  } finally {
    client.release();
  }
};

export const getMySupportedCampaigns = async (req, res) => {
  try {
    const campaigns = await PledgeModel.findSupportedCampaignsByDonor(req.user.id);

    return res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get supported campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};
