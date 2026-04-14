import React, { useState } from 'react';
import './CreateProject.css';

const CreateProjectStep2 = ({ onNavigate }) => {
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = storedUser.name || 'Utilisateur';
  const userAvatar = storedUser.avatar || '';
  const userInitials = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="cp-wrapper">
      
      {/* Minimal Header */}
      <header className="cp-header">
        <div className="cp-logo" onClick={() => onNavigate('home')}>Hive.tn</div>
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName}
            className="cp-user-avatar"
            onClick={() => onNavigate('profile')}
          />
        ) : (
          <div
            className="cp-user-avatar cp-user-avatar--fallback"
            onClick={() => onNavigate('profile')}
            aria-label={userName}
            title={userName}
          >
            {userInitials}
          </div>
        )}
      </header>

      {/* Progress Bar (Étape 2) */}
      <div className="cp-progress-container">
        <div className="cp-progress-segment active"></div>
        <div className="cp-progress-segment active"></div>
        <div className="cp-progress-segment"></div>
      </div>

      {/* Main Content Area */}
      <main className="cp-main">
        <div className="cp-content-box" style={{ maxWidth: '600px' }}>
          
          <div className="cp-rules-heart">💚</div>
          <h1 className="cp-title" style={{ marginBottom: '10px' }}>Prenez un instant pour consulter nos règles.</h1>
          <p className="cp-description" style={{ marginBottom: '40px' }}>
            Voici cinq règles que chaque projet sur Hive.tn doit respecter.
          </p>

          <div className="cp-rules-container">
            <div className="cp-rule-item">
              <div className="cp-rule-number">1</div>
              <div className="cp-rule-text">
                Les projets doivent <strong>créer quelque chose à partager</strong> avec les autres.
              </div>
            </div>
            
            <div className="cp-rule-item">
              <div className="cp-rule-number">2</div>
              <div className="cp-rule-text">
                Les projets doivent être <strong>honnêtes et clairement présentés.</strong>
              </div>
            </div>

            <div className="cp-rule-item">
              <div className="cp-rule-number">3</div>
              <div className="cp-rule-text">
                Les projets ne peuvent pas collecter de fonds pour des œuvres de charité ou de bienfaisance indépendantes.
              </div>
            </div>

            <div className="cp-rule-item">
              <div className="cp-rule-number">4</div>
              <div className="cp-rule-text">
                Les projets ne peuvent pas offrir de participation financière (actions ou "equity").
              </div>
            </div>

            <div className="cp-rule-item">
              <div className="cp-rule-number">5</div>
              <div className="cp-rule-text">
                Les projets ne peuvent pas impliquer d'articles interdits, illégaux ou dangereux.
              </div>
            </div>
          </div>

          <label className="cp-checkbox-container">
            <input 
              type="checkbox" 
              className="cp-checkbox-input"
              checked={hasAcceptedRules}
              onChange={(e) => setHasAcceptedRules(e.target.checked)}
            />
            <span className="cp-checkbox-label">
              J'ai lu et je m'engage à respecter les règles de Hive.tn
            </span>
          </label>
          
          <div className="cp-rules-read-more">
            En savoir plus sur nos règles détaillées.
          </div>

        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="cp-footer">
        <div className="cp-footer-text">
          Prenez le temps de bien lire nos conditions
        </div>
        <button 
          className="cp-btn-next" 
          disabled={!hasAcceptedRules}
          onClick={() => onNavigate('createProjectStep3')}
        >
          Compris, continuez
        </button>
      </footer>

    </div>
  );
};

export default CreateProjectStep2;
