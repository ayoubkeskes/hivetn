import React, { useEffect, useState } from "react";

import "./Home.css";
import "./Discover.css";
import Navbar from "./Navbar";
import { buildApiUrl } from "./shared/services/api.js";
import { ALL_CATEGORIES_LABEL, getCampaignCategoryOptions } from "./shared/constants/campaignCategories.js";
import { formatMillimesToTnd } from "./shared/utils/currency.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80";

const resolveMediaUrl = (url) => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return buildApiUrl(url);
};

const Discover = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [filterCategory, setFilterCategory] = useState(ALL_CATEGORIES_LABEL);
  const [filterSort, setFilterSort] = useState("Nouveautes");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCampaignIds, setSavedCampaignIds] = useState(() => new Set());
  const [savingCampaignIds, setSavingCampaignIds] = useState(() => new Set());

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/campaigns"));
        const data = await response.json();
        if (data.success) {
          setCampaigns(data.campaigns);
        }
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !isAuthenticated || campaigns.length === 0) {
      setSavedCampaignIds(new Set());
      return;
    }

    let isMounted = true;

    const fetchSavedStatuses = async () => {
      try {
        const responses = await Promise.all(
          campaigns.map((campaign) =>
            fetch(buildApiUrl(`/api/saved/check/${campaign.id}`), {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((response) => response.json())
              .then((data) => ({ id: campaign.id, saved: Boolean(data?.success && data?.saved) }))
              .catch(() => ({ id: campaign.id, saved: false }))
          )
        );

        if (!isMounted) return;

        setSavedCampaignIds(new Set(responses.filter((item) => item.saved).map((item) => item.id)));
      } catch (error) {
        console.error("Failed to fetch saved statuses:", error);
      }
    };

    fetchSavedStatuses();

    return () => {
      isMounted = false;
    };
  }, [campaigns, isAuthenticated]);

  const handleToggleSaved = async (campaignId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      onNavigate("signIn", "Vous devez etre connecte pour enregistrer une campagne.");
      return;
    }

    if (savingCampaignIds.has(campaignId)) return;

    const isSaved = savedCampaignIds.has(campaignId);

    setSavingCampaignIds((prev) => new Set(prev).add(campaignId));

    try {
      const response = await fetch(buildApiUrl(`/api/saved/${campaignId}`), {
        method: isSaved ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        return;
      }

      setSavedCampaignIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(campaignId);
        else next.add(campaignId);
        return next;
      });
    } catch (error) {
      console.error("Failed to toggle saved campaign:", error);
    } finally {
      setSavingCampaignIds((prev) => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    }
  };

  const displayProjects = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    creatorName: campaign.creator_name || "Createur inconnu",
    creatorId: campaign.porteur_id,
    creatorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
    image: resolveMediaUrl(campaign.image_url),
    fundedPercent: Number(campaign.funded_percent || 0),
    statusMessage: `${campaign.category || "Projet"} • ${formatMillimesToTnd(campaign.amount_raised || 0)} sur ${formatMillimesToTnd(campaign.target_amount)}`,
    category: campaign.category || "Projet",
  }));

  const categoryOptions = getCampaignCategoryOptions(displayProjects.map((project) => project.category));

  const filteredProjects = filterCategory === ALL_CATEGORIES_LABEL
    ? displayProjects
    : displayProjects.filter((project) => project.category === filterCategory);

  const projectsToShow = [...filteredProjects].sort((a, b) => {
    if (filterSort === "Popularite") return a.title.localeCompare(b.title);
    if (filterSort === "Fin de campagne") return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="discover-page-wrapper">
      <Navbar
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        activeTab="discover"
      />

      <div className="discover-main">
        <div className="discover-filter-section" id="discover-filters">
          <div className="discover-filter-text">
            <span>Afficher</span>

            <div className="custom-dropdown-container">
              <button className="inline-dropdown-btn" onClick={() => setShowCategoryMenu(!showCategoryMenu)}>
                {filterCategory} <span className="dropdown-caret">{showCategoryMenu ? "▲" : "▼"}</span>
              </button>
              {showCategoryMenu && (
                <div className="custom-dropdown-menu">
                  <div className="custom-dropdown-item" onClick={() => { setFilterCategory(ALL_CATEGORIES_LABEL); setShowCategoryMenu(false); }}>{ALL_CATEGORIES_LABEL}</div>
                  {categoryOptions.map((category) => (
                    <div key={category} className="custom-dropdown-item" onClick={() => { setFilterCategory(category); setShowCategoryMenu(false); }}>
                      {category}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span>triés par</span>
            <div className="custom-dropdown-container">
              <button className="inline-dropdown-btn" onClick={() => setShowSortMenu(!showSortMenu)}>
                {filterSort} <span className="dropdown-caret">{showSortMenu ? "▲" : "▼"}</span>
              </button>
              {showSortMenu && (
                <div className="custom-dropdown-menu">
                  {["Nouveautes", "Popularite", "Fin de campagne"].map((sortOption) => (
                    <div 
                      key={sortOption} 
                      className="custom-dropdown-item" 
                      onClick={() => { setFilterSort(sortOption); setShowSortMenu(false); }}
                    >
                      {sortOption}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="explore-results-container" id="discover-results">
          <div className="explore-results-title">
            Explorer <span>{loading ? "..." : `${projectsToShow.length} projets`}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#a1a1aa" }}>
              Chargement des projets...
            </div>
          ) : projectsToShow.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#a1a1aa" }}>
              Aucune campagne active disponible pour le moment.
            </div>
          ) : (
            <div className="ks-grid">
              {projectsToShow.map((project) => (
                <div key={project.id} className="ks-card" onClick={() => onNavigate("projectDetails", project.id)}>
                  <div className="ks-card-image-box">
                    <img src={project.image} alt={project.title} className="ks-card-image" loading="lazy" />
                    <button
                      className={`ks-bookmark-btn ks-bookmark-floating ${savedCampaignIds.has(project.id) ? "is-saved" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleSaved(project.id);
                      }}
                      aria-label={savedCampaignIds.has(project.id) ? "Retirer des enregistrements" : "Enregistrer la campagne"}
                      aria-pressed={savedCampaignIds.has(project.id)}
                      disabled={savingCampaignIds.has(project.id)}
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"></path></svg>
                    </button>
                    <div className="ks-progress-line" style={{ width: `${Math.min(project.fundedPercent, 100)}%` }}></div>
                  </div>

                  <div className="ks-card-content">
                    <div className="ks-card-top-row">
                      <img src={project.creatorAvatar} alt={project.creatorName} className="ks-creator-avatar" loading="lazy" />
                      <div className="ks-card-title-col">
                        <h3 className="ks-card-title">{project.title}</h3>
                      </div>
                    </div>

                    <div 
                      className="ks-creator-name"
                      style={project.creatorId ? { cursor: 'pointer', textDecoration: 'underline' } : {}}
                      onClick={(e) => {
                        if (project.creatorId) {
                          e.stopPropagation();
                          onNavigate("publicProfile", project.creatorId);
                        }
                      }}
                    >
                      Par {project.creatorName}
                    </div>

                    <div className="ks-card-stats">
                      <svg className="ks-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>{project.statusMessage}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Discover;
