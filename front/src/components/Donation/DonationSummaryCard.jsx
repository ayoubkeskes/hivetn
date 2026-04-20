import React from "react";

const formatMoney = (amount) =>
  `${Number(amount || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} DT`;

const DonationSummaryCard = ({
  campaign,
  creator,
  selection,
  amountTnd,
  collectedAmount,
  contributionCount,
  projectedCollectedAmount,
  submitting,
  disabled,
  onSubmit,
  onBack,
}) => {
  const rewardLabel = selection?.type === "reward" ? selection.reward?.title : "Soutien libre";

  return (
    <aside className="dp-summary-card">
      <div className="dp-summary-card__header">
        <p className="dp-summary-card__eyebrow">Resume</p>
        <h3>Votre contribution</h3>
      </div>

      <div className="dp-summary-card__campaign">
        <p className="dp-summary-card__campaign-title">{campaign.title}</p>
        <p className="dp-summary-card__campaign-meta">{creator?.name || campaign.creator_name || "Créateur Hive.tn"}</p>
      </div>

      <div className="dp-summary-card__rows">
        <div className="dp-summary-card__row">
          <span>Option choisie</span>
          <strong>{rewardLabel}</strong>
        </div>
        <div className="dp-summary-card__row">
          <span>Contribution</span>
          <strong>{formatMoney(amountTnd)}</strong>
        </div>
        <div className="dp-summary-card__row">
          <span>Total collecte</span>
          <strong>{formatMoney(collectedAmount)}</strong>
        </div>
        <div className="dp-summary-card__row">
          <span>Apres votre soutien</span>
          <strong>{formatMoney(projectedCollectedAmount)}</strong>
        </div>
        <div className="dp-summary-card__row">
          <span>Contributions confirmees</span>
          <strong>{Number(contributionCount || 0)}</strong>
        </div>
      </div>

      <div className="dp-summary-card__total">
        <span>Total de votre action</span>
        <strong>{formatMoney(amountTnd)}</strong>
      </div>

      <button
        type="button"
        className="dp-primary-btn dp-primary-btn--full"
        onClick={onSubmit}
        disabled={submitting || disabled}
      >
        {submitting ? "Redirection vers Stripe..." : "Proceed to secure test payment"}
      </button>

      <button type="button" className="dp-secondary-btn dp-secondary-btn--full" onClick={onBack}>
        Retour au choix
      </button>

      <p className="dp-summary-card__legal">
        Le paiement s'ouvre sur Stripe Checkout en mode test. Une fois le
        webhook recu, PostgreSQL passe le paiement a paid et incremente la
        campagne sans double comptage.
      </p>
    </aside>
  );
};

export default DonationSummaryCard;
