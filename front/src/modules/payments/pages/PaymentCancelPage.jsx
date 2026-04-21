import React from "react";
import { Link, useSearchParams } from "react-router-dom";

import Navbar from "@/Navbar";

import "./PaymentStatusPage.css";

const formatAmount = (amount) => {
  if (!amount) return "Montant non précisé";

  return `${Number(amount).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TND`;
};

export default function PaymentCancelPage({ isAuthenticated, onNavigate, onLogout }) {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign_id");
  const amount = searchParams.get("amount");

  return (
    <div className="payment-status-page">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="discover" />

      <div className="payment-status-shell">
        <section className="payment-status-card">
          <div className="payment-status-main">
            <div className="payment-status-badge is-cancelled">Stripe Test Mode</div>
            <h1 className="payment-status-title">Paiement de test annulé</h1>
            <p className="payment-status-copy">
              Aucun paiement réussi n'a été confirmé pour cette tentative. Tant que la confirmation Stripe n'est pas reçue, la campagne n'est pas incrémentée.
            </p>

            <div className="payment-status-grid">
              <div className="payment-status-metric">
                <span>Montant visé</span>
                <strong>{formatAmount(amount)}</strong>
              </div>
              <div className="payment-status-metric">
                <span>Statut</span>
                <strong>annulé</strong>
              </div>
              <div className="payment-status-metric">
                <span>Mode</span>
                <strong>test Stripe</strong>
              </div>
            </div>
          </div>

          <aside className="payment-status-side">
            <h2>Que faire ensuite ?</h2>
            <p>
              Vous pouvez relancer la tentative de paiement de test depuis la campagne, ou revenir plus tard sans perdre l'accès au projet.
            </p>

            <div className="payment-status-actions">
              <Link className="payment-status-btn" to={campaignId ? `/campaigns/${campaignId}/contribute` : "/discover"}>
                Réessayer
              </Link>
              <Link className="payment-status-btn--ghost" to={campaignId ? `/project/${campaignId}` : "/discover"}>
                Retour à la campagne
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
