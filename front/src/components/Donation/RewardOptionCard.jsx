import React from 'react';

const formatMoney = (amount) =>
  `${Number(amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DT`;

const RewardOptionCard = ({ reward, selected, onSelect }) => {
  const quantityText =
    reward.quantity !== null
      ? `${reward.remaining} sur ${reward.quantity} restantes`
      : 'Disponibilite non limitee';

  return (
    <article className={`dp-reward-card ${selected ? 'is-selected' : ''} ${reward.disabled ? 'is-disabled' : ''}`}>
      <div className="dp-reward-card__top">
        <div>
          <p className="dp-reward-card__eyebrow">A partir de</p>
          <h3 className="dp-reward-card__price">{formatMoney(reward.minimumTnd)}</h3>
        </div>
        <div className="dp-reward-card__status">
          <span className={`dp-reward-card__chip ${reward.disabled ? 'is-muted' : 'is-available'}`}>
            {reward.disabled ? 'Indisponible' : 'Disponible'}
          </span>
        </div>
      </div>

      {reward.image && (
        <div className="dp-reward-card__image-wrap">
          <img src={reward.image} alt={reward.title} className="dp-reward-card__image" />
        </div>
      )}

      <div className="dp-reward-card__body">
        <h4 className="dp-reward-card__title">{reward.title}</h4>
        <p className="dp-reward-card__description">
          {reward.description || 'Une récompense pensée pour remercier les contributeurs de cette campagne.'}
        </p>

        <dl className="dp-reward-card__meta">
          <div>
            <dt>Livraison estimee</dt>
            <dd>{reward.estimatedDelivery || 'À confirmer par le créateur'}</dd>
          </div>
          <div>
            <dt>Disponibilite</dt>
            <dd>{quantityText}</dd>
          </div>
          <div>
            <dt>Contributeurs</dt>
            <dd>{reward.backerCount}</dd>
          </div>
        </dl>
      </div>

      <div className="dp-reward-card__footer">
        <button
          type="button"
          className="dp-primary-btn dp-primary-btn--full"
          disabled={reward.disabled}
          onClick={onSelect}
        >
          {selected ? 'Sélectionnée' : 'Choisir cette récompense'}
        </button>
      </div>
    </article>
  );
};

export default RewardOptionCard;
