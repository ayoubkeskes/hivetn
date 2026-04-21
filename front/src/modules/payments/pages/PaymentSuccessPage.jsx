import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Navbar from "@/Navbar";
import { getPaymentSession } from "@/modules/payments/services/contributionApi.js";

import "./PaymentStatusPage.css";

const POLL_DELAY_MS = 2200;
const MAX_POLLS = 6;

const formatAmount = (amount, currency = "TND") =>
  `${Number(amount || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

export default function PaymentSuccessPage({ isAuthenticated, onNavigate, onLogout }) {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState({
    loading: Boolean(sessionId),
    attempts: 0,
    error: "",
    payment: null,
    campaign: null,
    stripeSession: null,
  });

  useEffect(() => {
    if (!sessionId) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Identifiant de session Stripe manquant dans l'URL de retour.",
      }));
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;

    const loadSession = async (attempt = 0) => {
      try {
        const data = await getPaymentSession(sessionId);

        if (cancelled) return;

        const paymentStatus = data.payment?.status || "";
        const stripeStatus = data.stripeSession?.paymentStatus || "";
        const shouldPoll =
          paymentStatus !== "paid" &&
          attempt < MAX_POLLS &&
          (stripeStatus === "paid" || stripeStatus === "unpaid" || stripeStatus === "no_payment_required");

        setState({
          loading: shouldPoll,
          attempts: attempt,
          error: "",
          payment: data.payment || null,
          campaign: data.campaign || null,
          stripeSession: data.stripeSession || null,
        });

        if (shouldPoll) {
          timeoutId = window.setTimeout(() => {
            loadSession(attempt + 1);
          }, POLL_DELAY_MS);
        }
      } catch (error) {
        if (cancelled) return;

        setState({
          loading: false,
          attempts: attempt,
          error: error.message || "Impossible de récupérer le statut de ce paiement.",
          payment: null,
          campaign: null,
          stripeSession: null,
        });
      }
    };

    loadSession();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [sessionId]);

  const payment = state.payment;
  const campaign = state.campaign;
  const currency = payment?.currency || state.stripeSession?.currency?.toUpperCase() || "TND";
  const awaitingWebhook = state.loading && payment?.status !== "paid";

  return (
    <div className="payment-status-page">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="discover" />

      <div className="payment-status-shell">
        <section className="payment-status-card">
          <div className="payment-status-main">
            <div className="payment-status-badge">Stripe Test Mode</div>
            <h1 className="payment-status-title">
              {payment?.status === "paid"
                ? "Paiement de test confirmé"
                : "Retour Stripe reçu"}
            </h1>

            <p className="payment-status-copy">
              {payment?.status === "paid"
                ? "Votre contribution de test est bien rattachée à votre compte et à la campagne. Hive.tn a mis à jour la base de données après confirmation Stripe."
                : "Stripe vous a redirigé vers Hive.tn. Le backend finalise maintenant la confirmation du paiement avant d'afficher l'état définitif."}
            </p>

            {payment?.status === "paid" && campaign?.id && (
              <div className="payment-status-alert payment-status-alert--success">
                Paiement confirmé. La campagne est prête à afficher le montant mis à jour.
              </div>
            )}

            {awaitingWebhook && (
              <div className="payment-status-alert">
                Finalisation en cours. La page revérifie automatiquement le statut pendant quelques secondes pour laisser la confirmation Stripe se terminer.
              </div>
            )}

            {state.error && <div className="payment-status-alert">{state.error}</div>}

            <div className="payment-status-grid">
              <div className="payment-status-metric">
                <span>Campagne</span>
                <strong>{campaign?.title || "Campagne Hive.tn"}</strong>
              </div>
              <div className="payment-status-metric">
                <span>Montant</span>
                <strong>{formatAmount(payment?.amount || 0, currency)}</strong>
              </div>
              <div className="payment-status-metric">
                <span>Statut local</span>
                <strong>{payment?.status || "en attente"}</strong>
              </div>
              <div className="payment-status-metric">
                <span>Session Stripe</span>
                <strong>{state.stripeSession?.paymentStatus || "inconnu"}</strong>
              </div>
            </div>
          </div>

          <aside className="payment-status-side">
            <h2>Résumé</h2>

            <div className="payment-status-list">
              <div>
                <span>Session Stripe</span>
                <strong>{sessionId || "Indisponible"}</strong>
              </div>
              <div>
                <span>Paiement</span>
                <strong>{payment?.id || "En attente de lecture"}</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>{payment?.paymentMode || "test"}</strong>
              </div>
              <div>
                <span>Webhook</span>
                <strong>{payment?.status === "paid" ? "Traité" : "En cours"}</strong>
              </div>
            </div>

            <p>
              Cette page reste volontairement en mode test. Utilisez uniquement des clés Stripe de test et des cartes de test Stripe en local.
            </p>

            <div className="payment-status-actions">
              <Link className="payment-status-btn" to={campaign?.id ? `/project/${campaign.id}` : "/discover"}>
                Retour à la campagne
              </Link>
              <Link className="payment-status-btn--ghost" to="/profile">
                Voir mon profil
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
