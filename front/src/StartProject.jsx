import React from 'react';
import './Home.css';
import './StartProject.css';
import Navbar from './Navbar';

const StartProject = ({ onNavigate, isAuthenticated, onLogout }) => {

  const handleStartProject = () => {
    if (!isAuthenticated) {
      onNavigate('signIn', 'Connectez-vous pour lancer votre projet.');
      return;
    }
    onNavigate('createProjectStep1');
  };

  return (
    <div className="start-page-wrapper">
      
      {/* Navbar Principale (Hive Standard) */}
      <Navbar 
        onNavigate={onNavigate} 
        isAuthenticated={isAuthenticated} 
        onLogout={onLogout} 
        activeTab="startProject" 
      />

      <div className="start-main">
        {/* 1. Hero Section */}
        <section className="sp-hero" id="start-hero">
          <div className="sp-hero-text-col">
            <h1 className="sp-hero-title">Donnez vie à vos idées avec la force de la communauté.</h1>
            <p className="sp-hero-subtitle">
              Hive.tn est la plateforme N°1 en Tunisie pour financer vos rêves créatifs, entrepreneuriaux et solidaires, sans la complexité des banques traditionnelles.
            </p>
            <button className="sp-hero-cta" onClick={handleStartProject}>Lancer mon projet</button>
          </div>
          <div className="sp-hero-img-col">
            <img src="/creator_hero_3.jpg" alt="Créer un projet sur Hive" className="sp-hero-img" loading="lazy" />
          </div>
        </section>

        {/* 2. Benefits (Pourquoi choisir Hive.tn) */}
        <section className="sp-section">
          <h2 className="sp-section-title">Pourquoi choisir Hive.tn ?</h2>
          <div className="sp-benefits-grid">
            <div className="sp-benefit-card">
              <span className="sp-benefit-icon">🇹🇳</span>
              <h3 className="sp-benefit-title">100% Tunisien</h3>
              <p className="sp-benefit-text">Pensée pour les réalités économiques et juridiques de la Tunisie, avec un support local dédié.</p>
            </div>
            <div className="sp-benefit-card">
              <span className="sp-benefit-icon">🔒</span>
              <h3 className="sp-benefit-title">Paiements Sécurisés</h3>
              <p className="sp-benefit-text">Intégration fluide avec les cartes bancaires tunisiennes et internationales, sans complications.</p>
            </div>
            <div className="sp-benefit-card">
              <span className="sp-benefit-icon">🛠️</span>
              <h3 className="sp-benefit-title">Création Simplifiée</h3>
              <p className="sp-benefit-text">Un outil de création de campagne intuitif étape par étape pour mettre en valeur votre projet.</p>
            </div>
            <div className="sp-benefit-card">
              <span className="sp-benefit-icon">🤝</span>
              <h3 className="sp-benefit-title">Communauté Active</h3>
              <p className="sp-benefit-text">Accédez à des milliers de passionnés prêts à soutenir l'innovation et la culture émergentes.</p>
            </div>
          </div>
        </section>

        {/* 3. Comment ça marche ? (Timeline) */}
        <section className="sp-section" id="guide-createur">
          <h2 className="sp-section-title">Comment ça marche ?</h2>
          <div className="sp-timeline">
            <div className="sp-step">
              <div className="sp-step-num">1</div>
              <div className="sp-step-content">
                <h3 className="sp-step-title">Créez votre campagne</h3>
                <p className="sp-step-text">Racontez votre histoire, fixez un objectif financier réaliste et proposez des contreparties (récompenses) uniques pour vos contributeurs.</p>
              </div>
            </div>
            <div className="sp-step">
              <div className="sp-step-num">2</div>
              <div className="sp-step-content">
                <h3 className="sp-step-title">Partagez avec votre réseau</h3>
                <p className="sp-step-text">Mobilisez votre entourage, utilisez nos outils de partage social, et faites monter l'enngouement autour de votre idée.</p>
              </div>
            </div>
            <div className="sp-step">
              <div className="sp-step-num">3</div>
              <div className="sp-step-content">
                <h3 className="sp-step-title">Collectez les fonds</h3>
                <p className="sp-step-text">Recevez le soutien de la communauté. Grâce à notre système de jalons, vous débloquez les financements de manière sécurisée.</p>
              </div>
            </div>
            <div className="sp-step">
              <div className="sp-step-num">4</div>
              <div className="sp-step-content">
                <h3 className="sp-step-title">Réalisez votre rêve</h3>
                <p className="sp-step-text">Délivrez vos contreparties, tenez vos contributeurs informés, et construisez votre projet avec succès !</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Social Proof / Success Stories */}
        <section className="sp-section" id="securite-confiance">
          <h2 className="sp-section-title">Ils l'ont fait avec nous</h2>
          <div className="sp-testimonials">
            <div className="sp-quote-card">
              <div className="sp-quote-mark">"</div>
              <p className="sp-quote-text">Grâce à Hive.tn, j'ai pu rassembler les fonds nécessaires pour ouvrir mon atelier de céramique en plein cœur de la Médina. Les banques refusaient mon dossier, mais la communauté y a cru !</p>
              <div className="sp-quote-author">
                <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&q=80" alt="Sélim Trabelsi" className="sp-quote-avatar" loading="lazy" />
                <div>
                  <span className="sp-quote-name">Sélim Trabelsi</span>
                  <span className="sp-quote-role">Fondateur, Reconnué</span>
                </div>
              </div>
            </div>
            <div className="sp-quote-card">
              <div className="sp-quote-mark">"</div>
              <p className="sp-quote-text">L'accompagnement de l'équipe et la simplicité de la plateforme ont fait toute la différence. Notre festival a battu des records de préventes grâce à notre campagne de financement.</p>
              <div className="sp-quote-author">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="Amina L." className="sp-quote-avatar" loading="lazy" />
                <div>
                  <span className="sp-quote-name">Amina L.</span>
                  <span className="sp-quote-role">Directrice, Sicca Jazz</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Trust & Security Banner */}
        <section className="sp-section">
          <div className="sp-trust-banner">
            <h2>Fiabilité & Transparence</h2>
            <p style={{color: '#a1a1aa', marginTop: '10px'}}>Nous collaborons avec des partenaires de confiance pour garantir un cadre légal et sécurisé.</p>
            <div className="sp-trust-grid">
              <div className="sp-trust-item">
                <span className="sp-trust-icon">🛡️</span>
                <span className="sp-trust-label">Conformité Loi Crowdfunding</span>
              </div>
              <div className="sp-trust-item">
                <span className="sp-trust-icon">💳</span>
                <span className="sp-trust-label">Passerelle Bancaire Certifiée</span>
              </div>
              <div className="sp-trust-item">
                <span className="sp-trust-icon">📞</span>
                <span className="sp-trust-label">Support Créateur Dédié</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ & Final CTA */}
        <section className="sp-section" id="faq-createur" style={{ borderTop: 'none', paddingTop: '0' }}>
          <div className="sp-faq">
            <h2 className="sp-section-title" style={{marginBottom: '40px'}}>Questions Fréquentes</h2>
            
            <div className="sp-faq-item">
              <div className="sp-faq-q">La création d'une campagne est-elle gratuite ?</div>
              <div className="sp-faq-a">Oui, créer et soumettre un projet sur Hive.tn est entièrement gratuit. Aucun frais n'est appliqué pour le moment durant la phase actuelle de la plateforme.</div>
            </div>
            
            <div className="sp-faq-item">
              <div className="sp-faq-q">Que se passe-t-il si mon projet n'est pas accepté ?</div>
              <div className="sp-faq-a">Chaque campagne est examinée par notre équipe avant publication. Si votre projet ne respecte pas nos critères, il peut être refusé ou renvoyé en modification.</div>
            </div>

            <div className="sp-faq-item">
              <div className="sp-faq-q">Puis-je modifier ma campagne après l'avoir soumise ?</div>
              <div className="sp-faq-a">Oui, tant que votre campagne est en brouillon ou refusée, vous pouvez la modifier et la resoumettre. Une fois approuvée et publiée, certaines modifications peuvent être limitées.</div>
            </div>

            <div className="sp-faq-item">
              <div className="sp-faq-q">Comment les projets sont-ils sélectionnés ?</div>
              <div className="sp-faq-a">Toutes les campagnes passent par une phase de validation afin de garantir leur qualité et leur crédibilité avant leur publication sur la plateforme.</div>
            </div>

            <div className="sp-faq-item">
              <div className="sp-faq-q">Puis-je recevoir des contributions financières ?</div>
              <div className="sp-faq-a">La plateforme Hive.tn est en cours d'évolution. Les fonctionnalités de contribution financière seront ajoutées prochainement.</div>
            </div>
          </div>

          <div className="sp-final-cta">
            <h2 className="sp-final-text">Votre succès commence par un premier pas.</h2>
            <button className="sp-hero-cta" onClick={handleStartProject}>Commencer maintenant</button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default StartProject;
