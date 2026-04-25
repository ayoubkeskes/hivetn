import React, { useEffect, useRef, useState } from 'react';
import './CreateProject.css';
import { CAMPAIGN_CATEGORIES } from './shared/constants/campaignCategories.js';

const CreateProjectStep1 = ({ onNavigate, onSaveDraft, draftProject }) => {
  const [category, setCategory] = useState(draftProject?.category || '');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef(null);
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = storedUser.name || 'Utilisateur';
  const userAvatar = storedUser.avatar || '';
  const userInitials = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isFormComplete = category !== '';

  useEffect(() => {
    if (!categoryMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!categoryMenuRef.current?.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [categoryMenuOpen]);

  const handleCategorySelect = (nextCategory) => {
    setCategory(nextCategory);
    setCategoryMenuOpen(false);
  };

  const handleNext = () => {
    if (isFormComplete) {
      if(onSaveDraft) onSaveDraft({ category });
      onNavigate('createProjectStep2');
    }
  };

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

      {/* Progress Bar */}
      <div className="cp-progress-container">
        <div className="cp-progress-segment active"></div>
        <div className="cp-progress-segment"></div>
        <div className="cp-progress-segment"></div>
      </div>

      {/* Main Content Areas */}
      <main className="cp-main">
        <div className="cp-content-box">
          <h1 className="cp-title">Pour commencer, configurons votre projet.</h1>
          
          <h2 className="cp-subtitle">Sélectionnez une catégorie principale pour votre nouveau projet.</h2>
          <p className="cp-description">
            Cela aidera les contributeurs à trouver votre projet. Vous pourrez la modifier plus tard si nécessaire.
          </p>

          <div className="cp-form-row">
            <div
              className={`cp-category-menu${categoryMenuOpen ? ' is-open' : ''}`}
              ref={categoryMenuRef}
            >
              <button
                type="button"
                className={`cp-category-menu__trigger${category ? ' has-value' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={categoryMenuOpen}
                onClick={() => setCategoryMenuOpen((isOpen) => !isOpen)}
              >
                <span>{category || 'Sélectionnez une catégorie'}</span>
                <span className="cp-category-menu__chevron" aria-hidden="true">▾</span>
              </button>

              {categoryMenuOpen && (
                <div className="cp-category-menu__panel" role="listbox" aria-label="Catégorie du projet">
                  {CAMPAIGN_CATEGORIES.map((cat) => {
                    const isSelected = category === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`cp-category-menu__option${isSelected ? ' is-selected' : ''}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleCategorySelect(cat)}
                      >
                        <span>{cat}</span>
                        {isSelected && <span className="cp-category-menu__check" aria-hidden="true">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="cp-footer">
        <div className="cp-footer-text">
          Un nouveau projet : bienvenu !
        </div>
        <button 
          className="cp-btn-next" 
          disabled={!isFormComplete}
          onClick={handleNext}
        >
          Suivant : Détails du projet
        </button>
      </footer>

    </div>
  );
};

export default CreateProjectStep1;
