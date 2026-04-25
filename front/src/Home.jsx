import React, { useEffect, useState } from 'react';
import './Home.css';
import Navbar from './Navbar';
import ProjectCard from './components/ProjectCard';
import FeaturedCampaignCard from './components/FeaturedCampaignCard';
import TrustSocialProofSection from './components/TrustSocialProofSection';
import { buildApiUrl } from './shared/services/api.js';
import { formatMillimesToTnd } from './shared/utils/currency.js';
import { getCampaignDaysLeft } from './shared/utils/campaignDates.js';
import { DEFAULT_CAMPAIGN_IMAGE, resolveMediaUrl } from './shared/utils/media.js';

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M14.9 9.1 13 13l-3.9 1.9L11 11z" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20.5s-7-4.35-7-10.08C5 7.65 6.99 6 9.18 6c1.46 0 2.86.76 3.82 2.02C13.96 6.76 15.36 6 16.82 6 19.01 6 21 7.65 21 10.42 21 16.15 14 20.5 14 20.5H12Z" />
  </svg>
);

const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 19h16" />
    <path d="M7 16V9" />
    <path d="M12 16V5" />
    <path d="M17 16v-4" />
  </svg>
);

const TRUST_PROOF_FALLBACK_STATS = [
  { id: 'projects', value: '+120', label: 'projets soumis' },
  { id: 'users', value: '+800', label: 'utilisateurs inscrits' },
  { id: 'moderated', value: '100%', label: 'campagnes modérées' },
];

const TRUST_PROOF_FALLBACK_TESTIMONIALS = [
  { id: 'validation', quote: 'Validation manuelle des campagnes' },
  { id: 'evolution', quote: 'Plateforme en constante évolution' },
];

const compareFeaturedProjects = (left, right) => {
  const amountGap = Number(right?.amountRaised || 0) - Number(left?.amountRaised || 0);
  if (amountGap !== 0) return amountGap;

  const fundedGap = Number(right?.funded || 0) - Number(left?.funded || 0);
  if (fundedGap !== 0) return fundedGap;

  const backerGap = Number(right?.backerCount || 0) - Number(left?.backerCount || 0);
  if (backerGap !== 0) return backerGap;

  return String(left?.title || '').localeCompare(String(right?.title || ''), 'fr', { sensitivity: 'base' });
};

const Home = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const handleCreateProject = () => {
    if (isAuthenticated) {
      onNavigate('startProject');
    } else {
      onNavigate('signIn', 'Vous devez être connecté pour créer un projet.');
    }
  };

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/campaigns'));
        const data = await res.json();
        if (data.success) {
          const rankedProjects = data.campaigns
            .map((campaign) => ({
              id: campaign.id,
              title: campaign.title,
              creator: `Par ${campaign.creator_name || 'Créateur inconnu'}`,
              creatorId: campaign.porteur_id,
              desc: campaign.description || '',
              image: resolveMediaUrl(campaign.image_url),
              funded: Number(campaign.funded_percent || 0),
              collected: formatMillimesToTnd(campaign.amount_raised || 0),
              amountRaised: Number(campaign.amount_raised || 0),
              backerCount: Number(campaign.backer_count || 0),
              daysLeft: getCampaignDaysLeft(campaign),
              category: campaign.category || 'Projet',
            }))
            .sort(compareFeaturedProjects);

          setProjects(rankedProjects);
        }
      } catch (err) {
        console.error('Failed to fetch homepage campaigns:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchCampaigns();
  }, []);

  const featuredProject = projects[0] || {
    id: 'featured-placeholder',
    title: 'Atelier solaire pour artisans tunisiens',
    image: DEFAULT_CAMPAIGN_IMAGE,
    funded: 68,
    collected: '18 400 DT',
    amountRaised: 18400000,
    backerCount: 126,
    category: 'Impact local',
  };

  const trustProofStats = TRUST_PROOF_FALLBACK_STATS;
  const trustProofTestimonials = TRUST_PROOF_FALLBACK_TESTIMONIALS;
  const featuredProjects = projects.slice(0, 4);

  return (
    <div className="home-container">
      <div className="home-content-wrapper">
        <Navbar
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          activeTab="home"
        />

        <section className="hero-section" id="a-propos">
          <div className="hero-shell">
            <div className="hero-copy">
              <div className="hero-eyebrow">Plateforme de financement participatif en Tunisie</div>
              <h1 className="hero-title">
                Financez des projets qui comptent.
                <br />
                <span>Construisez l&apos;avenir, aujourd&apos;hui.</span>
              </h1>
              <p className="hero-subtitle">
                Découvrez des projets innovants, soutenez des créateurs locaux et suivez l&apos;impact réel.
              </p>
              <div className="hero-actions">
                <button className="hero-btn-primary" onClick={() => onNavigate('discover')}>Soutenir un projet</button>
                <button className="hero-btn-secondary" onClick={handleCreateProject}>Lancer mon projet</button>
              </div>
              <div className="hero-trust-row" aria-label="Signaux de confiance">
                <div className="hero-trust-item"><span className="hero-trust-icon" aria-hidden="true" />Projets vérifiés</div>
                <div className="hero-trust-item"><span className="hero-trust-icon" aria-hidden="true" />Plateforme locale</div>
                <div className="hero-trust-item"><span className="hero-trust-icon" aria-hidden="true" />Sécurisé (bientôt)</div>
              </div>
            </div>

            <div className="hero-featured">
              <FeaturedCampaignCard
                project={featuredProject}
                loading={loadingProjects}
                onClick={() => featuredProject.id !== 'featured-placeholder' && onNavigate('projectDetails', featuredProject.id)}
              />
            </div>
          </div>
        </section>

        <section className="projects-section" id="projets-recents">
          <div className="projects-header">
            <h2 className="section-title">4 campagnes vedettes</h2>
          </div>

          {loadingProjects ? (
            <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '40px 0' }}>Chargement des campagnes...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '40px 0' }}>Aucune campagne active à afficher pour le moment.</div>
          ) : (
            <div className="projects-grid">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </section>

        <TrustSocialProofSection
          title="Une plateforme fiable pour soutenir l'innovation locale"
          stats={trustProofStats}
          testimonials={trustProofTestimonials}
        />

        <section className="how-it-works-section" id="comment-ca-marche">
          <div className="hiw-container">
            <h2 className="section-title text-center">Comment ça marche ?</h2>
            <div className="hiw-grid">
              <div className="hiw-step">
                <div className="hiw-icon"><CompassIcon /></div>
                <h3>Découvrez</h3>
                <p>Explorez des projets vérifiés en Tunisie</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-icon"><HeartIcon /></div>
                <h3>Soutenez</h3>
                <p>Choisissez un montant et soutenez facilement</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-icon"><BarChartIcon /></div>
                <h3>Suivez</h3>
                <p>Suivez l&apos;évolution du projet en temps réel</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;

