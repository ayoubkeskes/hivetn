import React from "react";

const PaymentForm = ({
  errors,
  amountValue,
  minAmount,
  selection,
  contributorNote,
  isRewardLocked = false,
  onAmountChange,
  onNoteChange,
}) => (
  <div className="dp-payment-panel">
    <div className="dp-payment-panel__section">
      <p className="dp-payment-panel__eyebrow">Confirmation</p>
      <h2>Confirmez votre contribution</h2>
      <p className="dp-payment-panel__intro">
        Le paiement sécurisé sera intégré prochainement. Cette action enregistre
        actuellement un soutien confirmé dans le système Hive.tn.
      </p>
    </div>

    <div className="dp-selection-recap">
      <div>
        <p className="dp-selection-recap__label">Option sélectionnée</p>
        <h3>{selection?.type === "reward" ? selection.reward?.title : "Soutien libre"}</h3>
      </div>
      <p className="dp-selection-recap__meta">
        {selection?.type === "reward"
          ? "Vous soutenez la campagne avec une récompense réelle issue de la base. Le montant peut être augmenté au-dessus du minimum."
          : "Vous choisissez librement le montant qui vous semble juste pour soutenir cette campagne."}
      </p>
    </div>

    <div className="dp-payment-panel__section">
      <label className="dp-field">
        <span>Montant de contribution (DT)</span>
        <input
          type="number"
          min={minAmount}
          step="0.01"
          value={amountValue}
          onChange={(e) => onAmountChange(e.target.value)}
          className={errors.amount ? "has-error" : ""}
          disabled={false}
        />
        {isRewardLocked ? (
          <small>Cette récompense impose un minimum de {minAmount} DT.</small>
        ) : (
          <small>Minimum requis : {minAmount} DT</small>
        )}
        {errors.amount && <em>{errors.amount}</em>}
      </label>

      <label className="dp-field">
        <span>Message au créateur (optionnel)</span>
        <textarea
          value={contributorNote}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Un petit mot d encouragement, un contexte sur votre soutien, ou rien du tout."
        />
        <small>{contributorNote.length}/500 caracteres</small>
        {errors.contributorNote && <em>{errors.contributorNote}</em>}
      </label>
    </div>

    <div className="dp-payment-panel__section">
      <div className="dp-payment-panel__header">
        <h3>Methode de paiement</h3>
        <p>MVP manuel, sans stockage de donnees bancaires sensibles.</p>
      </div>

      <div className="dp-mvp-payment-note">
        <strong>MVP_MANUAL</strong>
        <p>
          Aucun numéro de carte, CVV ou autre donnée de paiement n'est collecté
          ici. Le système enregistre seulement une contribution confirmée, afin
          de preparer l integration future d une vraie passerelle.
        </p>
      </div>
    </div>
  </div>
);

export default PaymentForm;
