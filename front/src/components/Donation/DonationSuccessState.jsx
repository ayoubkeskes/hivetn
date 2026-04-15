import React from 'react';

const formatMoney = (amount) =>
  `${Number(amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DT`;

const DonationSuccessState = ({
  campaign,
  creator,
  selection,
  amountTnd,
  pledgeId,
  confirmationMessage,
  updatedTotals,
  onBackToCampaign,
  onDiscover,
}) => (
  <section className="dp-success-state">
    <div className="dp-success-state__badge">Contribution enregistrée</div>
    <h1>Merci pour votre soutien</h1>
    <p className="dp-success-state__intro">
      {confirmationMessage || "Votre contribution a bien été enregistrée sur Hive.tn."}
    </p>

    <div className="dp-success-state__grid">
      <div className="dp-success-state__card">
        <p className="dp-success-state__label">Campagne</p>
        <strong>{campaign.title}</strong>
      </div>
      <div className="dp-success-state__card">
        <p className="dp-success-state__label">Option</p>
        <strong>{selection?.type === 'reward' ? selection.reward?.title : 'Sans récompense'}</strong>
      </div>
      <div className="dp-success-state__card">
        <p className="dp-success-state__label">Créateur</p>
        <strong>{creator?.name || campaign.creator_name || "Hive.tn"}</strong>
      </div>
      <div className="dp-success-state__card">
        <p className="dp-success-state__label">Montant</p>
        <strong>{formatMoney(amountTnd)}</strong>
      </div>
      <div className="dp-success-state__card">
        <p className="dp-success-state__label">Référence</p>
        <strong>{pledgeId || 'MVP-HIVE'}</strong>
      </div>
      <div className="dp-success-state__card">
        <p className="dp-success-state__label">Collecte actuelle</p>
        <strong>{formatMoney(updatedTotals?.collectedAmount || 0)}</strong>
      </div>
      <div className="dp-success-state__card">
        <p className="dp-success-state__label">Contributions</p>
        <strong>{Number(updatedTotals?.contributionCount || 0)}</strong>
      </div>
    </div>

    <div className="dp-success-state__actions">
      <button type="button" className="dp-primary-btn" onClick={onBackToCampaign}>
        Retour à la campagne
      </button>
      <button type="button" className="dp-secondary-btn" onClick={onDiscover}>
        Découvrir d'autres projets
      </button>
    </div>
  </section>
);

export default DonationSuccessState;
