import * as NotificationModel from "./notification.model.js";

export const sendWelcomeNotification = async (user) => {
  if (!user?.id) return null;
  return NotificationModel.createNotification({
    userId: user.id,
    type: "WELCOME",
    title: "Bienvenue sur Hive.tn",
    message: "Votre compte est prêt. Découvrez des campagnes, soutenez des créateurs et lancez vos propres projets.",
    link: "/discover",
  });
};

export const sendCampaignApprovedNotification = async (campaign) => {
  if (!campaign?.porteur_id) return null;
  return NotificationModel.createNotification({
    userId: campaign.porteur_id,
    type: "CAMPAIGN_APPROVED",
    title: "Campagne acceptée",
    message: `Votre campagne "${campaign.title}" a été acceptée par l'administration et est maintenant active.`,
    link: `/project/${campaign.id}`,
  });
};

export const sendCampaignRejectedNotification = async (campaign) => {
  if (!campaign?.porteur_id) return null;
  return NotificationModel.createNotification({
    userId: campaign.porteur_id,
    type: "CAMPAIGN_REJECTED",
    title: "Campagne refusée",
    message: `Votre campagne "${campaign.title}" a été refusée par l'administration. Vous pouvez la revoir depuis l'éditeur.`,
    link: `/editor/${campaign.id}`,
  });
};

export const sendNewSupportNotification = async ({ campaign, donor, amount }) => {
  if (!campaign?.porteur_id || !donor?.id) return null;
  if (campaign.porteur_id === donor.id) return null;

  const amountTnd = `${(Number(amount || 0) / 1000).toLocaleString("fr-FR")} DT`;

  return NotificationModel.createNotification({
    userId: campaign.porteur_id,
    type: "NEW_SUPPORT",
    title: "Nouveau soutien reçu",
    message: `${donor.name || "Un utilisateur"} a soutenu votre campagne "${campaign.title}" pour ${amountTnd}.`,
    link: `/project/${campaign.id}`,
  });
};

export const sendNewCommentNotification = async ({ campaign, author, content }) => {
  if (!campaign?.porteur_id || !author?.id) return null;
  if (campaign.porteur_id === author.id) return null;

  const excerpt = String(content || "").trim().slice(0, 120);
  const suffix = excerpt.length === 120 ? "..." : "";

  return NotificationModel.createNotification({
    userId: campaign.porteur_id,
    type: "NEW_COMMENT",
    title: "Nouveau commentaire reçu",
    message: `${author.name || "Un utilisateur"} a commenté votre campagne "${campaign.title}" : "${excerpt}${suffix}"`,
    link: `/project/${campaign.id}`,
  });
};

const supportStatusLabels = {
  OPEN: "ouvert",
  IN_PROGRESS: "en cours",
  WAITING_USER: "en attente de votre retour",
  RESOLVED: "résolu",
  CLOSED: "fermé",
};

export const sendSupportTicketCreatedNotification = async (ticket) => {
  if (!ticket?.user_id || !ticket?.id) return null;
  return NotificationModel.createNotification({
    userId: ticket.user_id,
    type: "SUPPORT_TICKET_CREATED",
    title: `Ticket ${ticket.code || ""} créé`.trim(),
    message: `Votre demande "${ticket.title}" a bien été enregistrée. Notre équipe vous répondra ici.`,
    link: `/support/${ticket.id}`,
  });
};

export const sendSupportReplyNotification = async ({ ticket, authorName }) => {
  if (!ticket?.user_id || !ticket?.id) return null;
  return NotificationModel.createNotification({
    userId: ticket.user_id,
    type: "SUPPORT_TICKET_REPLY",
    title: `Nouvelle réponse sur ${ticket.code || "votre ticket"}`.trim(),
    message: `${authorName || "L'équipe support"} a répondu à votre ticket "${ticket.title}".`,
    link: `/support/${ticket.id}`,
  });
};

export const sendSupportStatusNotification = async ({ ticket, status }) => {
  if (!ticket?.user_id || !ticket?.id || !status) return null;
  return NotificationModel.createNotification({
    userId: ticket.user_id,
    type: "SUPPORT_TICKET_STATUS",
    title: `Statut mis à jour pour ${ticket.code || "votre ticket"}`.trim(),
    message: `Le statut de votre ticket "${ticket.title}" est maintenant ${supportStatusLabels[status] || status}.`,
    link: `/support/${ticket.id}`,
  });
};
