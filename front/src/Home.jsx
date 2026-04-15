import React, { useEffect, useState } from 'react';
import './Home.css';
import Navbar from './Navbar';
import ProjectCard from './components/ProjectCard';
import FeaturedCampaignCard from './components/FeaturedCampaignCard';
import TrustSocialProofSection from './components/TrustSocialProofSection';
import { buildApiUrl } from './shared/services/api.js';
import { formatMillimesToTnd } from './shared/utils/currency.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1528157777178-0062a444aeb8?w=800&q=80';

const resolveMediaUrl = (url) => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return buildApiUrl(url);
};

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

const CATEGORY_FILTERS = [
  { id: 'artisanat', label: 'Artisanat', matches: ['artisanat'] },
  { id: 'tech', label: 'Tech', matches: ['tech', 'tech & app', 'technologie', 'app'] },
  { id: 'social', label: 'Social', matches: ['social'] },
  { id: 'culture', label: 'Culture', matches: ['culture'] },
  { id: 'startup', label: 'Startup', matches: ['startup'] },
];

const normalizeCategory = (value) => (value || '').trim().toLowerCase();

const Home = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);

  const handleCreateProject = () => {
    if (isAuthenticated) {
      onNavigate('startProject');
    } else {
      onNavigate('signIn', 'Vous devez etre connecte pour creer un projet.');
    }
  };

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/campaigns'));
        const data = await res.json();
        if (data.success) {
          setProjects(data.campaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            creator: `Par ${campaign.creator_name || 'Createur inconnu'}`,
            creatorId: campaign.porteur_id,
            desc: campaign.description || '',
            image: resolveMediaUrl(campaign.image_url),
            funded: Number(campaign.funded_percent || 0),
            collected: formatMillimesToTnd(campaign.amount_raised || 0),
            amountRaised: Number(campaign.amount_raised || 0),
            backerCount: Number(campaign.backer_count || 0),
            daysLeft: '--',
            category: campaign.category || 'Projet',
          })));
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
    image: FALLBACK_IMAGE,
    funded: 68,
    collected: '18 400 DT',
    amountRaised: 18400000,
    backerCount: 126,
    category: 'Impact local',
  };

  const trustProofStats = TRUST_PROOF_FALLBACK_STATS;
  const trustProofTestimonials = TRUST_PROOF_FALLBACK_TESTIMONIALS;
  const filteredProjects = activeCategoryFilter
    ? projects.filter((project) => {
      const normalized = normalizeCategory(project.category);
      return activeCategoryFilter.matches.some((match) => normalized.includes(match));
    })
    : projects;

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
                Decouvrez des projets innovants, soutenez des createurs locaux et suivez l&apos;impact reel.
              </p>
              <div className="hero-actions">
                <button className="hero-btn-primary" onClick={() => onNavigate('discover')}>Soutenir un projet</button>
                <button className="hero-btn-secondary" onClick={handleCreateProject}>Lancer mon projet</button>
              </div>
              <div className="hero-trust-row" aria-label="Signaux de confiance">
                <div className="hero-trust-item"><span className="hero-trust-icon" aria-hidden="true" />Projets verifies</div>
                <div className="hero-trust-item"><span className="hero-trust-icon" aria-hidden="true" />Plateforme locale</div>
                <div className="hero-trust-item"><span className="hero-trust-icon" aria-hidden="true" />Securise (bientot)</div>
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
            <h2 className="section-title">Campagnes publiees</h2>
            <div className="category-filter-row" aria-label="Filtrer les campagnes par categorie">
              {CATEGORY_FILTERS.map((filter) => {
                const isActive = activeCategoryFilter?.id === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={`category-filter-chip${isActive ? ' is-active' : ''}`}
                    onClick={() => setActiveCategoryFilter(isActive ? null : filter)}
                    aria-pressed={isActive}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {loadingProjects ? (
            <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '40px 0' }}>Chargement des campagnes...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '40px 0' }}>Aucune campagne active a afficher pour le moment.</div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '40px 0' }}>Aucune campagne dans cette categorie pour le moment.</div>
          ) : (
            <div className="projects-grid">
              {filteredProjects.map((project) => (
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
            <h2 className="section-title text-center">Comment ca marche ?</h2>
            <div className="hiw-grid">
              <div className="hiw-step">
                <div className="hiw-icon"><CompassIcon /></div>
                <h3>Decouvrez</h3>
                <p>Explorez des projets verifies en Tunisie</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-icon"><HeartIcon /></div>
                <h3>Soutenez</h3>
                <p>Choisissez un montant et soutenez facilement</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-icon"><BarChartIcon /></div>
                <h3>Suivez</h3>
                <p>Suivez l&apos;evolution du projet en temps reel</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;

