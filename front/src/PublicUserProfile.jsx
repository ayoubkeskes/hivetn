import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import "./Home.css";
import "./Profile.css";
import "./Settings.css";
import "./PublicUserProfile.css";
import Navbar from "./Navbar";
import ProjectCard from "./components/ProjectCard";
import { buildApiUrl } from "./shared/services/api.js";
import { formatMillimesToTnd } from "./shared/utils/currency.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1528157777178-0062a444aeb8?w=800&q=80";

const getStatusBadge = (status) => {
  if (status === "ACTIVE") return { bg: "#05ce78", text: "Active" };
  if (status === "CLOSED") return { bg: "#374151", text: "Fermee" };
  return { bg: "rgba(0,0,0,0.6)", text: status || "Visible" };
};

const formatMemberSince = (value) => {
  if (!value) return "Date non disponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date non disponible";

  return parsed.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });
};



const toCreatedCardProject = (campaign, creatorName) => ({
  id: campaign.id,
  title: campaign.title || "Projet sans titre",
  creator: `Par ${creatorName}`,
  desc: campaign.description || "",
  image: campaign.image_url ? buildApiUrl(campaign.image_url) : FALLBACK_IMAGE,
  funded: Number(campaign.funded_percent || 0),
  collected: formatMillimesToTnd(campaign.amount_raised || 0),
  daysLeft: "--",
  category: campaign.category || "Non categorise",
  dbStatus: campaign.status,
  paidDonationCount: Number(campaign.paid_donation_count || 0),
});

const toBackedCardProject = (campaign) => ({
  id: campaign.id,
  title: campaign.title || "Projet soutenu",
  creator: campaign.creator_name ? `Par ${campaign.creator_name}` : "Createur inconnu",
  desc: campaign.description || "",
  image: campaign.image_url ? buildApiUrl(campaign.image_url) : FALLBACK_IMAGE,
  funded: Number(campaign.funded_percent || 0),
  collected: formatMillimesToTnd(campaign.total_contributed || 0),
  daysLeft: "--",
  category: campaign.category || "Non categorise",
  dbStatus: campaign.status,
  pledgeCount: campaign.pledge_count || 0,
  lastSupportedAt: campaign.last_supported_at || "",
});

const PublicUserProfile = ({ onNavigate, isAuthenticated, onLogout }) => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("about");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [createdProjects, setCreatedProjects] = useState([]);
  const [backedProjects, setBackedProjects] = useState([]);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(buildApiUrl(`/api/users/${id}/profile`));
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Impossible de charger ce profil.");
        }

        setProfile(data.user);
        setCreatedProjects((data.created_campaigns || []).map((campaign) => toCreatedCardProject(campaign, data.user.name || "Utilisateur Hive")));
        setBackedProjects((data.backed_campaigns || []).map(toBackedCardProject));
      } catch (fetchError) {
        setError(fetchError.message || "Impossible de charger ce profil.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [id]);

  const memberSince = useMemo(() => formatMemberSince(profile?.created_at), [profile?.created_at]);
  const activeCampaignsCount = createdProjects.filter((project) => project.dbStatus === "ACTIVE").length;

  const isAdmin = profile?.role === "ADMIN";
  const isCreator = createdProjects.length > 0;
  const trustLabel = isAdmin ? "Admin Hive" : isCreator ? "Créateur actif" : "Membre Hive";

  const userInitials = (profile?.name || "Utilisateur")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const userLocation = "🇹🇳 Tunisie";
  const bioExcerpt = profile?.bio
    ? profile.bio.length > 120
      ? profile.bio.slice(0, 117).trim() + "…"
      : profile.bio
    : null;

  if (loading) {
    return (
      <div className="profile-page-wrapper">
        <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} />
        <div className="profile-main">
          {/* Skeleton Header */}
          <header className="pub-header pub-header--loading">
            <div className="pub-header__avatar-wrapper">
              <div className="pub-skeleton pub-skeleton--avatar" aria-hidden="true" />
            </div>
            <div className="pub-skeleton pub-skeleton--title" aria-hidden="true" />
            <div className="pub-skeleton pub-skeleton--text" aria-hidden="true" />
            <div className="pub-skeleton pub-skeleton--badges" aria-hidden="true" />
          </header>

          {/* Skeleton Tabs */}
          <nav className="pub-tabs" aria-hidden="true">
            <div className="pub-tabs__track" style={{ gap: "16px" }}>
               <div className="pub-skeleton pub-skeleton--tab" />
               <div className="pub-skeleton pub-skeleton--tab" />
               <div className="pub-skeleton pub-skeleton--tab" />
            </div>
          </nav>
          
          <div className="pub-loading-section" aria-hidden="true">
             <div className="pub-skeleton pub-skeleton--card" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-page-wrapper">
        <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} />
        <div className="profile-main">
          <div className="pub-error-state">
            <span className="pub-error-state__icon" aria-hidden="true">⚠️</span>
            <h2 className="pub-error-state__title">Profil indisponible</h2>
            <p className="pub-error-state__desc">{error || "Ce profil utilisateur n'est pas accessible, n'existe pas ou le chargement a échoué."}</p>
            <button className="pub-header__btn-secondary" onClick={() => onNavigate("discover")}>
              Découvrir d'autres projets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} />

      <div className="profile-main">
        {/* ── Premium Public Profile Header ── */}
        <header className="pub-header" id="public-profile-header">
          {/* Avatar */}
          <div className="pub-header__avatar-wrapper">
            <div className="pub-header__avatar-ring" aria-hidden="true" />
            <div className="pub-header__avatar">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name || "Avatar"} />
              ) : (
                <span className="pub-header__avatar-initials">{userInitials}</span>
              )}
            </div>
            <div className="pub-header__avatar-status" title="Membre actif" />
          </div>

          {/* Name */}
          <h1 className="pub-header__name">{profile.name || "Utilisateur Hive"}</h1>

          {/* Bio tagline */}
          {bioExcerpt && (
            <p className="pub-header__tagline">{bioExcerpt}</p>
          )}

          {/* Badges */}
          <div className="pub-header__badges">
            {isAdmin ? (
              <span className="pub-header__badge pub-header__badge--admin">Admin Hive</span>
            ) : (
              <span className="pub-header__badge pub-header__badge--role">{trustLabel}</span>
            )}
            {profile.is_verified && (
              <span className="pub-header__badge pub-header__badge--verified">Vérifié</span>
            )}
          </div>

          {/* Info pills */}
          <div className="pub-header__info">
            <div className="pub-header__info-item">
              <span className="pub-header__info-icon">🤝</span>
              <span>
                <span className="pub-header__info-value">{backedProjects.length}</span>{" "}
                projet{backedProjects.length > 1 ? "s" : ""} soutenu{backedProjects.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="pub-header__info-divider" aria-hidden="true" />

            {userLocation && (
              <>
                <div className="pub-header__info-item">
                  <span className="pub-header__info-icon">📍</span>
                  <span>{userLocation}</span>
                </div>
                <div className="pub-header__info-divider" aria-hidden="true" />
              </>
            )}

            <div className="pub-header__info-item">
              <span className="pub-header__info-icon">📅</span>
              <span>Membre depuis {memberSince}</span>
            </div>

            {createdProjects.length > 0 && (
              <>
                <div className="pub-header__info-divider" aria-hidden="true" />
                <div className="pub-header__info-item">
                  <span className="pub-header__info-icon">🚀</span>
                  <span>
                    <span className="pub-header__info-value">{createdProjects.length}</span>{" "}
                    campagne{createdProjects.length > 1 ? "s" : ""} créée{createdProjects.length > 1 ? "s" : ""}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="pub-header__actions">
            {isCreator && activeCampaignsCount > 0 && (
              <button
                className="pub-header__btn-primary"
                onClick={() => {
                  const activeProject = createdProjects.find((p) => p.dbStatus === "ACTIVE");
                  if (activeProject) onNavigate("projectDetails", activeProject.id);
                }}
              >
                🔥 Voir la campagne active
              </button>
            )}
            <button
              className="pub-header__btn-secondary"
              onClick={() => onNavigate("discover")}
            >
              Découvrir d'autres projets
            </button>
          </div>
        </header>

        {/* ── Tab Navigation ── */}
        <nav className="pub-tabs" id="public-profile-tabs">
          <div className="pub-tabs__track" role="tablist" aria-label="Navigation du profil public">
            <button
              className={`pub-tabs__tab ${activeTab === "about" ? "pub-tabs__tab--active" : ""}`}
              onClick={() => setActiveTab("about")}
              role="tab"
              id="tab-about"
              aria-selected={activeTab === "about"}
              aria-controls="panel-about"
              tabIndex={activeTab === "about" ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setActiveTab("backed");
                if (e.key === "ArrowLeft") setActiveTab("created");
              }}
            >
              <span className="pub-tabs__label">À propos</span>
            </button>

            <button
              className={`pub-tabs__tab ${activeTab === "backed" ? "pub-tabs__tab--active" : ""}`}
              onClick={() => setActiveTab("backed")}
              role="tab"
              id="tab-backed"
              aria-selected={activeTab === "backed"}
              aria-controls="panel-backed"
              tabIndex={activeTab === "backed" ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setActiveTab("created");
                if (e.key === "ArrowLeft") setActiveTab("about");
              }}
            >
              <span className="pub-tabs__label">Soutenus</span>
              {backedProjects.length > 0 && (
                <span className="pub-tabs__count">{backedProjects.length}</span>
              )}
            </button>

            <button
              className={`pub-tabs__tab ${activeTab === "created" ? "pub-tabs__tab--active" : ""}`}
              onClick={() => setActiveTab("created")}
              role="tab"
              id="tab-created"
              aria-selected={activeTab === "created"}
              aria-controls="panel-created"
              tabIndex={activeTab === "created" ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setActiveTab("about");
                if (e.key === "ArrowLeft") setActiveTab("backed");
              }}
            >
              <span className="pub-tabs__label">Créés</span>
              {createdProjects.length > 0 && (
                <span className="pub-tabs__count">{createdProjects.length}</span>
              )}
            </button>
          </div>
        </nav>

        {activeTab === "about" && (
          <section className="pub-about" id="panel-about" role="tabpanel" aria-labelledby="tab-about">

            {/* ── Biographie ── */}
            <div className="pub-about__card">
              <h3 className="pub-about__card-title">Biographie</h3>
              {profile.bio ? (
                <p className="pub-about__bio">{profile.bio}</p>
              ) : (
                <div className="pub-about__empty">
                  <span className="pub-about__empty-icon" aria-hidden="true">📝</span>
                  <p>Aucune biographie disponible pour le moment.</p>
                </div>
              )}
              <p className="pub-about__note">
                Ce profil public présente l'activité visible de ce membre sur Hive.tn.
              </p>
            </div>

            {/* ── Informations ── */}
            <div className="pub-about__card pub-about__card--info">
              <div className="pub-about__trust">
                <span className="pub-about__trust-dot" aria-hidden="true" />
                {trustLabel}
              </div>
              <h3 className="pub-about__card-title">Informations</h3>
              <div className="pub-about__info-list">
                <div className="pub-about__info-row">
                  <div className="pub-about__info-left">
                    <span className="pub-about__info-icon" aria-hidden="true">📍</span>
                    <span className="pub-about__info-label">Localisation</span>
                  </div>
                  <strong className="pub-about__info-value">
                    {userLocation || "Non renseignée"}
                  </strong>
                </div>
                <div className="pub-about__info-row">
                  <div className="pub-about__info-left">
                    <span className="pub-about__info-icon" aria-hidden="true">📅</span>
                    <span className="pub-about__info-label">Membre depuis</span>
                  </div>
                  <strong className="pub-about__info-value">{memberSince}</strong>
                </div>
                <div className="pub-about__info-row">
                  <div className="pub-about__info-left">
                    <span className="pub-about__info-icon" aria-hidden="true">
                      {isAdmin ? "🛡️" : isCreator ? "🚀" : "👤"}
                    </span>
                    <span className="pub-about__info-label">Statut</span>
                  </div>
                  <strong className="pub-about__info-value">
                    {isAdmin ? "Administrateur" : isCreator ? "Créateur actif" : "Membre"}
                  </strong>
                </div>
              </div>
            </div>

            {/* ── Résumé d'activité ── */}
            <div className="pub-about__card pub-about__card--stats">
              <h3 className="pub-about__card-title">Résumé d'activité</h3>
              <div className="pub-about__stats-grid">
                <div className="pub-about__stat">
                  <span className="pub-about__stat-value">{createdProjects.length}</span>
                  <span className="pub-about__stat-label">
                    Projet{createdProjects.length > 1 ? "s" : ""} créé{createdProjects.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="pub-about__stat">
                  <span className="pub-about__stat-value">{backedProjects.length}</span>
                  <span className="pub-about__stat-label">
                    Projet{backedProjects.length > 1 ? "s" : ""} soutenu{backedProjects.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="pub-about__stat">
                  <span className="pub-about__stat-value">{activeCampaignsCount}</span>
                  <span className="pub-about__stat-label">
                    Campagne{activeCampaignsCount > 1 ? "s" : ""} active{activeCampaignsCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

          </section>
        )}

        {activeTab === "backed" && (
          <section className="pub-backed" id="panel-backed" role="tabpanel" aria-labelledby="tab-backed">
            {backedProjects.length === 0 ? (
              <div className="pub-backed__empty">
                <span className="pub-backed__empty-icon" aria-hidden="true">🤝</span>
                <h3 className="pub-backed__empty-title">Aucun projet soutenu</h3>
                <p className="pub-backed__empty-text">
                  Cet utilisateur n'a soutenu aucun projet pour le moment.
                </p>
              </div>
            ) : (
              <>
                <p className="pub-backed__count-line">
                  {backedProjects.length} projet{backedProjects.length > 1 ? "s" : ""} soutenu{backedProjects.length > 1 ? "s" : ""}
                </p>
                <div className="pub-backed__grid">
                  {backedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onNavigate={onNavigate}
                      overlay={
                        <div className="pub-backed__overlay-tags">
                          <span className="pub-backed__tag pub-backed__tag--supported">
                            ✓ Soutenu
                          </span>
                          <span className="pub-backed__tag pub-backed__tag--amount">
                            {project.collected}
                          </span>
                        </div>
                      }
                      actions={
                        <button
                          className="pub-backed__action-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            onNavigate("projectDetails", project.id);
                          }}
                        >
                          Voir la campagne
                        </button>
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "created" && (
          <section className="pub-created" id="panel-created" role="tabpanel" aria-labelledby="tab-created">
            {createdProjects.length === 0 ? (
              <div className="pub-created__empty">
                <span className="pub-created__empty-icon" aria-hidden="true">🚀</span>
                <h3 className="pub-created__empty-title">Aucune campagne lancée</h3>
                <p className="pub-created__empty-text">
                  Cet utilisateur n'a pas encore lancé de campagne sur Hive.tn.
                </p>
              </div>
            ) : (
              <>
                <p className="pub-created__count-line">
                  {createdProjects.length} campagne{createdProjects.length > 1 ? "s" : ""} créée{createdProjects.length > 1 ? "s" : ""}
                </p>
                <div className="pub-created__grid">
                  {createdProjects.map((project) => {
                    const statusBadge = getStatusBadge(project.dbStatus);
                    const statusClass = project.dbStatus === "ACTIVE"
                      ? "pub-created__tag--active"
                      : project.dbStatus === "CLOSED"
                        ? "pub-created__tag--closed"
                        : "pub-created__tag--default";

                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onNavigate={onNavigate}
                        overlay={
                          <div className="pub-created__overlay-tags">
                            <span className={`pub-created__tag ${statusClass}`}>
                              {statusBadge.text}
                            </span>
                            <span className="pub-created__tag pub-created__tag--donations">
                              {project.paidDonationCount} don{project.paidDonationCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        }
                        actions={
                          <button
                            className="pub-created__action-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              onNavigate("projectDetails", project.id);
                            }}
                          >
                            Voir la campagne
                          </button>
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default PublicUserProfile;
