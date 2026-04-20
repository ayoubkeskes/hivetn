import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import Navbar from "./Navbar";
import "./DonationPage.css";

import DonationFAQ from "./components/Donation/DonationFAQ";
import DonationSummaryCard from "./components/Donation/DonationSummaryCard";
import PaymentForm from "./components/Donation/PaymentForm";
import RewardOptionCard from "./components/Donation/RewardOptionCard";

import { createCheckoutSession, getContributionContext } from "./modules/payments/services/contributionApi.js";
import { formatTndValue, parseTndInput } from "./shared/utils/currency.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1528157777178-0062a444aeb8?w=1200&q=80";
const DEFAULT_FREE_AMOUNT = "25";

const DEFAULT_FAQ = [
  {
    question: "Est-ce un vrai paiement ?",
    answer:
      "Non. Cette integration utilise Stripe Checkout en mode test uniquement. Aucun encaissement réel n'est active tant que vous gardez des cles Stripe de test.",
  },
  {
    question: "Mes donnees de carte transitent-elles par Hive.tn ?",
    answer:
      "Non. La saisie de carte se fait sur la page Stripe hebergee. Hive.tn enregistre seulement les informations de support necessaires a la base de donnees.",
  },
  {
    question: "Quand la campagne est-elle mise a jour ?",
    answer:
      "Apres le paiement de test reussi, Stripe envoie un webhook au backend. Le paiement passe alors a paid dans PostgreSQL et le montant collecte de la campagne est incremente.",
  },
  {
    question: "Puis-je soutenir sans recompense ?",
    answer:
      "Oui. Vous pouvez garder un soutien libre ou choisir une recompense existante avant de passer sur Stripe Checkout.",
  },
];

const resolveMediaUrl = (url) => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${url.startsWith("/") ? url : `/${url}`}`;
};

const formatAmountInput = (amount) => {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_FREE_AMOUNT;
  return numeric % 1 === 0 ? String(numeric) : numeric.toFixed(2);
};

const StepIndicator = ({ currentStep }) => (
  <div className="dp-progress" role="navigation" aria-label="Etapes">
    {["Choix", "Contribution"].map((label, index) => (
      <span
        key={label}
        className={index + 1 <= currentStep ? "is-active" : ""}
        aria-current={index + 1 === currentStep ? "step" : undefined}
      >
        <span className="dp-step-number">{index + 1}</span>
        {label}
      </span>
    ))}
  </div>
);

const CampaignHeader = ({ campaign, creator, totals }) => {
  const creatorName = creator?.name || campaign?.creator_name || "Créateur inconnu";
  const initials = creatorName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="dp-hero">
      <div className="dp-hero__media">
        <img src={resolveMediaUrl(campaign?.image_url)} alt={campaign?.title || "Campagne"} loading="lazy" />
      </div>

      <div className="dp-hero__content">
        <div className="dp-hero__identity">
          <div className="dp-hero__avatar" aria-hidden="true">
            {initials || "?"}
          </div>
          <div>
            <p className="dp-hero__creator-label">Projet porte par</p>
            <strong>{creatorName}</strong>
          </div>
        </div>

        <h1 className="dp-hero__title">{campaign?.title || "Campagne Hive.tn"}</h1>

        {campaign?.description && <p className="dp-hero__description">{campaign.description}</p>}

        <div className="dp-hero__meta">
          {campaign?.category && <span>{campaign.category}</span>}
          <span>Collecte : {formatTndValue(totals.collectedAmount)}</span>
          <span>{totals.contributionCount} contributions</span>
          {campaign?.status && (
            <span className={campaign.status === "ACTIVE" ? "dp-hero__meta--active" : ""}>
              {campaign.status === "ACTIVE" ? "Campagne active" : campaign.status}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

const DonationSidebar = ({ campaign, creator, faqItems, faqOpenIndex, onFaqToggle }) => (
  <aside className="dp-sidebar">
    <div className="dp-sidebar-card dp-sidebar-card--accent">
      <p className="dp-sidebar-card__eyebrow">A savoir</p>
      <h3>Paiement Stripe en mode test</h3>
      <p>
        Votre session Stripe est creee cote backend, puis finalisee par webhook
        pour mettre a jour PostgreSQL et les totaux de la campagne de maniere fiable.
      </p>
      <ul className="dp-trust-list">
        <li>Stripe Checkout heberge la saisie de carte</li>
        <li>Le paiement reste strictement en test mode</li>
        <li>Les webhooks evitent les doubles increments</li>
      </ul>
    </div>

    <div className="dp-sidebar-card">
      <p className="dp-sidebar-card__eyebrow">Resume</p>
      <h3>{campaign?.title || "Campagne"}</h3>
      <div className="dp-compact-summary">
        <div>
          <span>Créateur</span>
          <strong>{creator?.name || campaign?.creator_name || "Non renseigne"}</strong>
        </div>
        <div>
          <span>Objectif</span>
          <strong>{formatTndValue(Number(campaign?.target_amount || 0) / 1000)}</strong>
        </div>
        <div>
          <span>Statut</span>
          <strong>{campaign?.status || "-"}</strong>
        </div>
      </div>
    </div>

    <DonationFAQ items={faqItems} openIndex={faqOpenIndex} onToggle={onFaqToggle} />
  </aside>
);

const FreeSupportCard = ({ amount, onChange, onProceed, error }) => (
  <div className="dp-free-card">
    <div className="dp-free-card__header">
      <div>
        <p className="dp-free-card__eyebrow">Option flexible</p>
        <h2>Soutien libre</h2>
      </div>
      <span className="dp-free-card__chip">Sans récompense</span>
    </div>

    <p className="dp-free-card__copy">
      Contribuez au montant de votre choix et passez directement à la
      confirmation de votre soutien.
    </p>

    <div className="dp-free-card__controls">
      <label className="dp-field">
        <span>Montant (DT)</span>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(event) => onChange(event.target.value)}
          className={error ? "has-error" : ""}
        />
        {error && <em>{error}</em>}
      </label>

      <button type="button" className="dp-primary-btn" onClick={onProceed}>
        Continuer
      </button>
    </div>
  </div>
);

const EmptyRewards = () => (
  <div className="dp-empty-state">
    <p className="dp-empty-state__icon" aria-hidden="true">
      *
    </p>
    <h3>Aucune récompense disponible</h3>
    <p>Cette campagne accepte toujours les soutiens libres.</p>
  </div>
);

const BlockedState = ({ onBack }) => (
  <div className="dp-blocked-state">
    <p className="dp-blocked-state__eyebrow">Campagne inactive</p>
    <h2>Les contributions sont fermees</h2>
    <p>Cette campagne n accepte pas de nouvelles contributions pour le moment.</p>
    <button type="button" className="dp-primary-btn" onClick={onBack}>
      Retour à la campagne
    </button>
  </div>
);

const LoadingState = () => (
  <div className="dp-loading-wrap">
    <div className="dp-skeleton dp-skeleton--hero" />
    <div className="dp-layout">
      <div className="dp-main-column">
        <div className="dp-skeleton dp-skeleton--panel" />
        <div className="dp-skeleton dp-skeleton--panel" />
      </div>
      <div className="dp-sidebar">
        <div className="dp-skeleton dp-skeleton--sidebar" />
        <div className="dp-skeleton dp-skeleton--sidebar" />
      </div>
    </div>
  </div>
);

const DonationPage = ({ onNavigate, isAuthenticated, onLogout }) => {
  const params = useParams();
  const campaignId = params.campaignId || params.id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rewardIdFromQuery = searchParams.get("rewardId");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [campaign, setCampaign] = useState(null);
  const [creator, setCreator] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [step, setStep] = useState(rewardIdFromQuery ? 2 : 1);
  const [amountValue, setAmountValue] = useState(DEFAULT_FREE_AMOUNT);
  const [contributorNote, setContributorNote] = useState("");
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadContext = useCallback(async () => {
    if (!campaignId) {
      setLoadError("Aucune campagne n'a été sélectionnée.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const data = await getContributionContext({ campaignId, rewardId: rewardIdFromQuery });
      setCampaign(data.campaign);
      setCreator(data.creator);
      setRewards(Array.isArray(data.campaign?.rewards) ? data.campaign.rewards : []);
      setSelectedReward(data.selectedReward || null);
      setAmountValue(
        formatAmountInput(data.selectedReward?.minimumAmount || data.minimumAmount || DEFAULT_FREE_AMOUNT)
      );
      setStep(data.selectedReward ? 2 : 1);
    } catch (error) {
      setLoadError(error.message || "Impossible de charger le contexte de contribution.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, rewardIdFromQuery]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const totals = useMemo(
    () => ({
      collectedAmount: Number(campaign?.collected_amount || 0),
      contributionCount: Number(campaign?.contribution_count || 0),
    }),
    [campaign]
  );

  const selection = useMemo(() => {
    if (selectedReward) {
      return { type: "reward", reward: selectedReward };
    }
    return { type: "free" };
  }, [selectedReward]);

  const minimumAmount = selectedReward?.minimumAmount > 0 ? selectedReward.minimumAmount : 1;
  const parsedAmount = parseTndInput(amountValue);
  const projectedCollectedAmount = totals.collectedAmount + (parsedAmount || 0);
  const isBlocked = campaign?.status && campaign.status !== "ACTIVE";

  const handleFaqToggle = useCallback((index) => {
    setFaqOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleRewardSelect = (reward) => {
    setSelectedReward(reward);
    setAmountValue(formatAmountInput(reward.minimumAmount || 1));
    setErrors({});
    setSubmitError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFreeSupport = () => {
    const amount = parseTndInput(amountValue);
    if (!amount || amount < 1) {
      setErrors({ amount: "Veuillez saisir un montant valide superieur a 0 DT." });
      return;
    }

    setSelectedReward(null);
    setErrors({});
    setSubmitError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!parsedAmount || parsedAmount <= 0) {
      nextErrors.amount = "Le montant doit être supérieur à 0 DT.";
    } else if (parsedAmount < minimumAmount) {
      nextErrors.amount = `Le montant minimum est de ${minimumAmount} DT.`;
    }

    if (contributorNote.length > 500) {
      nextErrors.contributorNote = "Le message ne doit pas depasser 500 caracteres.";
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isAuthenticated) {
      onNavigate("signIn", "Connectez-vous pour ouvrir le paiement Stripe de test.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const data = await createCheckoutSession({
        campaignId,
        amount: Number(parsedAmount).toFixed(2),
        rewardId: selectedReward?.id || null,
        contributorNote,
      });

      if (!data.checkoutUrl) {
        throw new Error("Stripe n'a pas retourne d'URL de checkout.");
      }

      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setSubmitError(error.message || "Impossible de lancer le paiement Stripe de test.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dp-page">
        <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="discover" />
        <div className="dp-shell">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (loadError || !campaign) {
    return (
      <div className="dp-page">
        <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="discover" />
        <div className="dp-shell">
          <div className="dp-loading-state dp-loading-state--error">
            <p className="dp-loading-state__eyebrow">Erreur</p>
            <h1>Contexte indisponible</h1>
            <p>{loadError || "Cette campagne n est pas accessible."}</p>
            <button type="button" className="dp-primary-btn" onClick={() => onNavigate("discover")}>
              Retour à la découverte
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dp-page">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="discover" />

      <div className="dp-shell">
        <CampaignHeader campaign={campaign} creator={creator} totals={totals} />
        <StepIndicator currentStep={step} />

        <div className="dp-layout">
          <div className="dp-main-column">
            {isBlocked ? (
              <BlockedState onBack={() => navigate(`/project/${campaignId}`)} />
            ) : step === 1 ? (
              <>
                <div className="dp-section-header">
                  <p className="dp-section-header__eyebrow">Etape 1</p>
                  <h2>Choisissez votre soutien</h2>
                  <p>
                    Sélectionnez une récompense issue de la base ou entrez un
                    soutien libre avant de confirmer votre contribution.
                  </p>
                </div>

                <FreeSupportCard
                  amount={amountValue}
                  onChange={(value) => {
                    setAmountValue(value);
                    setErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  onProceed={handleFreeSupport}
                  error={errors.amount}
                />

                {rewards.length > 0 ? (
                  <>
                    <div className="dp-section-header" style={{ marginTop: "36px" }}>
                      <h2>Récompenses disponibles</h2>
                      <p>Chaque récompense est chargée dynamiquement depuis la campagne.</p>
                    </div>

                    <div className="dp-reward-grid">
                      {rewards.map((reward) => (
                        <RewardOptionCard
                          key={reward.id}
                          reward={{
                            ...reward,
                            minimumTnd: reward.minimumAmount,
                            image: reward.imageUrl ? resolveMediaUrl(reward.imageUrl) : "",
                            backerCount: totals.contributionCount,
                            disabled:
                              reward.remaining != null && reward.remaining <= 0,
                          }}
                          selected={selectedReward?.id === reward.id}
                          onSelect={() => handleRewardSelect(reward)}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyRewards />
                )}
              </>
            ) : (
              <>
                <div className="dp-section-header">
                  <p className="dp-section-header__eyebrow">Etape 2</p>
                  <h2>Confirmez votre contribution</h2>
                  <p>
                    La session Stripe Checkout sera creee cote serveur avec vos
                    identifiants de campagne et d utilisateur. La campagne sera
                    mise a jour apres confirmation du webhook Stripe.
                  </p>
                </div>

                {submitError && (
                  <div className="dp-inline-error" role="alert">
                    {submitError}
                  </div>
                )}

                <PaymentForm
                  errors={errors}
                  amountValue={amountValue}
                  minAmount={minimumAmount}
                  selection={selection}
                  contributorNote={contributorNote}
                  isRewardLocked={selection.type === "reward"}
                  onAmountChange={(value) => {
                    setAmountValue(value);
                    setErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  onNoteChange={(value) => {
                    setContributorNote(value);
                    setErrors((prev) => ({ ...prev, contributorNote: "" }));
                  }}
                />
              </>
            )}
          </div>

          <div className="dp-sidebar">
            {step === 2 && !isBlocked ? (
              <DonationSummaryCard
                campaign={campaign}
                creator={creator}
                selection={selection}
                amountTnd={parsedAmount || 0}
                collectedAmount={totals.collectedAmount}
                contributionCount={totals.contributionCount}
                projectedCollectedAmount={projectedCollectedAmount}
                submitting={submitting}
                disabled={!parsedAmount || parsedAmount < minimumAmount}
                onSubmit={handleSubmit}
                onBack={() => setStep(1)}
              />
            ) : (
              <DonationSidebar
                campaign={campaign}
                creator={creator}
                faqItems={DEFAULT_FAQ}
                faqOpenIndex={faqOpenIndex}
                onFaqToggle={handleFaqToggle}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationPage;
