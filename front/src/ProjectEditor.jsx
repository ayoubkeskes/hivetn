import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectEditor.css';
import './CreateProject.css';
import BasicsTab from './components/ProjectEditor/BasicsTab';
import PeopleTab from './components/ProjectEditor/PeopleTab';
import RewardsTab from './components/ProjectEditor/RewardsTab';
import StoryTab from './components/ProjectEditor/StoryTab';

const API_URL = 'http://localhost:5000';

const normalizeRewards = (rewards) => {
  if (!rewards) return [];

  if (Array.isArray(rewards)) {
    return rewards;
  }

  if (typeof rewards === 'string') {
    try {
      const parsed = JSON.parse(rewards);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeStory = (story) => {
  if (!story) {
    return { blocks: [], risks: '', faqs: [] };
  }

  if (typeof story === 'string') {
    try {
      const parsed = JSON.parse(story);
      return normalizeStory(parsed);
    } catch {
      return { blocks: [], risks: '', faqs: [] };
    }
  }

  return {
    blocks: Array.isArray(story.blocks) ? story.blocks : [],
    risks: typeof story.risks === 'string' ? story.risks : '',
    faqs: Array.isArray(story.faqs) ? story.faqs : [],
  };
};

const normalizeCampaignToDraft = (campaign) => ({
  campaignId: campaign?.id || null,
  title: campaign?.title || '',
  subtitle: campaign?.description || '',
  category: campaign?.category || '',
  goal: campaign?.target_amount ? String(campaign.target_amount / 1000) : '',
  image_url: campaign?.image_url || '',
  video_url: campaign?.video_url || '',
  rewards: normalizeRewards(campaign?.rewards),
  story: normalizeStory(campaign?.story),
});

const hasPrimaryMedia = (project) => Boolean(project?.image_url || project?.video_url);
const TABS = ['Bases', 'Recompenses', 'Histoire', 'Personnes'];

const ProjectEditor = ({ onNavigate, draftProject, onSaveDraft }) => {
  const { id } = useParams();
  const reactNavigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Bases');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMissingMediaModal, setShowMissingMediaModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = storedUser.name || 'Utilisateur';
  const userInitials = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Load existing campaign if ID is passed
  useEffect(() => {
    if (!id) {
      return;
    }

    const fetchCampaign = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/api/campaigns/${id}`, { headers });
        const data = await res.json();

        if (data.success && data.campaign) {
          onSaveDraft(normalizeCampaignToDraft(data.campaign));
        }
      } catch (e) {
        console.error('Erreur de chargement', e);
      }
    };

    fetchCampaign();
  }, [id]);

  const openFeedbackModal = ({
    tone = 'success',
    title,
    message,
    details = '',
    onClose,
  }) => {
    setFeedbackModal({ tone, title, message, details, onClose });
  };
  const closeFeedbackModal = () => {
    const modal = feedbackModal;
    setFeedbackModal(null);
    if (modal?.onClose) {
      modal.onClose();
    }
  };

  const handleSaveToDatabase = async ({ showSuccessAlert = true } = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      openFeedbackModal({
        tone: 'warning',
        title: 'Connexion requise',
        message: 'Connectez-vous pour enregistrer votre campagne en toute securite.',
        details: 'Votre brouillon pourra ensuite etre sauvegarde et retrouve a tout moment.',
      });
      return false;
    }

    const goalValue = Number(draftProject?.goal);
    setIsSaving(true);
    const payload = {
        title: draftProject?.title || '',
        description: draftProject?.subtitle || '',
        category: draftProject?.category || 'Non catÃ©gorisÃ©',
        target_amount: Number.isFinite(goalValue) && goalValue > 0 ? Math.round(goalValue * 1000) : 0,
        rewards: normalizeRewards(draftProject?.rewards),
        story: normalizeStory(draftProject?.story)
    };

    try {
        let res;
        const currentId = id || draftProject?.campaignId;
        
        if (currentId) {
            // Update
            res = await fetch(`${API_URL}/api/campaigns/${currentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
        } else {
            // Create
            res = await fetch(`${API_URL}/api/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
        }
        
        const data = await res.json();
        if (data.success) {
            if (showSuccessAlert) {
              openFeedbackModal({
                tone: 'success',
                title: 'Modifications enregistrees',
                message: 'Votre campagne a bien ete mise a jour.',
                details: 'Vous pouvez continuer votre edition en toute tranquillite.',
              });
            }
            if (!currentId && data.campaign_id) {
                onSaveDraft({
                  ...draftProject,
                  campaignId: data.campaign_id,
                  rewards: normalizeRewards(draftProject?.rewards),
                  story: normalizeStory(draftProject?.story),
                });
                reactNavigate(`/editor/${data.campaign_id}`, { replace: true });
                return true;
            }

            onSaveDraft(normalizeCampaignToDraft({
              ...(data.campaign || {}),
              id: data.campaign?.id || currentId,
              image_url: data.campaign?.image_url ?? draftProject?.image_url,
              video_url: data.campaign?.video_url ?? draftProject?.video_url,
              rewards: data.campaign?.rewards ?? draftProject?.rewards,
              story: data.campaign?.story ?? draftProject?.story,
            }));
            return true;
        } else {
            openFeedbackModal({
              tone: 'error',
              title: 'Enregistrement impossible',
              message: data.message || 'Nous n avons pas pu enregistrer vos modifications.',
              details: 'Verifiez les informations saisies puis reessayez.',
            });
            return false;
        }
    } catch (err) {
        openFeedbackModal({
          tone: 'error',
          title: 'Serveur indisponible',
          message: 'La sauvegarde n a pas pu aboutir pour le moment.',
          details: 'Verifiez votre connexion puis reessayez dans quelques instants.',
        });
        return false;
    } finally {
        setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!draftProject?.campaignId) {
       openFeedbackModal({
         tone: 'warning',
         title: 'Brouillon manquant',
         message: 'Enregistrez d abord votre projet avant de demander la revision.',
         details: 'Une premiere sauvegarde est necessaire pour creer votre campagne.',
       });
       return;
    }

    if (!hasPrimaryMedia(draftProject)) {
      openFeedbackModal({
        tone: 'warning',
        title: 'Media principal requis',
        message: 'Ajoutez une image ou une video avant de soumettre votre campagne.',
        details: 'Un visuel fort aide votre projet a inspirer confiance des la premiere impression.',
      });
      setActiveTab('Bases');
      return;
    }

    setShowSubmitModal(true);
  };

  const confirmSubmitForReview = async () => {
    const token = localStorage.getItem('token');
    setShowSubmitModal(false);
    setIsSaving(true);
    try {
      // First, save any pending modifications
      const saved = await handleSaveToDatabase({ showSuccessAlert: false });
      if (saved === false) {
        return;
      }

      const res = await fetch(`${API_URL}/api/campaigns/${draftProject.campaignId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        openFeedbackModal({
          tone: 'success',
          title: 'Projet soumis avec succes',
          message: 'Votre campagne a ete envoyee a l equipe Hive.tn pour verification.',
          details: 'Nous vous informerons des qu une decision de moderation sera prise.',
          onClose: () => reactNavigate('/profile'),
        });
      } else {
        openFeedbackModal({
          tone: 'error',
          title: 'Soumission impossible',
          message: data.message || 'Nous n avons pas pu envoyer votre projet en revision.',
          details: 'Reessayez apres avoir verifie les informations obligatoires.',
        });
      }
    } catch (err) {
      openFeedbackModal({
        tone: 'error',
        title: 'Serveur indisponible',
        message: 'La soumission n a pas pu aboutir pour le moment.',
        details: 'Reessayez dans quelques instants.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextTab = async () => {
    const currentTabIndex = TABS.indexOf(activeTab);
    if (currentTabIndex === -1 || currentTabIndex >= TABS.length - 1) {
      return false;
    }


    if (activeTab === 'Bases' && !hasPrimaryMedia(draftProject)) {
      setShowMissingMediaModal(true);
      return false;
    }
    if (activeTab === 'Bases' || activeTab === 'Histoire') {
      const saved = await handleSaveToDatabase({ showSuccessAlert: false });
      if (saved === false) {
        return;
      }
    }

    setActiveTab(TABS[currentTabIndex + 1]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmDelete = async () => {
    const campaignId = draftProject?.campaignId || id;
    const token = localStorage.getItem('token');

    setShowDeleteModal(false);

    if (!campaignId) {
      openFeedbackModal({
        tone: 'warning',
        title: 'Aucun brouillon a supprimer',
        message: 'Ce projet n a pas encore ete enregistre.',
        details: 'Enregistrez d abord votre campagne si vous souhaitez ensuite la gerer ou la supprimer.',
      });
      return;
    }

    if (!token) {
      openFeedbackModal({
        tone: 'warning',
        title: 'Connexion requise',
        message: 'Reconnectez-vous pour supprimer ce brouillon en toute securite.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        openFeedbackModal({
          tone: 'error',
          title: 'Suppression impossible',
          message: data.message || 'Nous n avons pas pu supprimer ce brouillon.',
          details: 'Verifiez que la campagne est encore en brouillon puis reessayez.',
        });
        return;
      }

      if (onSaveDraft) {
        onSaveDraft({
          campaignId: null,
          title: '',
          subtitle: '',
          category: '',
          goal: '',
          image_url: '',
          video_url: '',
          rewards: [],
          story: { blocks: [], risks: '', faqs: [] },
        });
      }

      openFeedbackModal({
        tone: 'success',
        title: 'Brouillon supprime',
        message: 'Votre campagne a bien ete retiree.',
        details: 'Vous pouvez maintenant revenir a l accueil ou commencer un nouveau projet.',
        onClose: () => {
          if (onNavigate) {
            onNavigate('home');
          } else {
            reactNavigate('/');
          }
        },
      });
    } catch (error) {
      openFeedbackModal({
        tone: 'error',
        title: 'Serveur indisponible',
        message: 'La suppression n a pas pu aboutir pour le moment.',
        details: 'Verifiez votre connexion puis reessayez dans quelques instants.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pe-wrapper">

      {/* â”€â”€ Header â”€â”€ */}
      <header className="pe-header">
        <div className="pe-header-top">

          {/* Colonne 1 - Logo (gauche) */}
          <span className="pe-logo" onClick={() => onNavigate('home')}>Hive.tn</span>

          {/* Colonne 2 - Toggle centrÃ© */}
          <div className="pe-header-center">
            <div className="pe-mode-toggle">
              <button
                className={`pe-mode-btn ${!showPreview ? 'pe-mode-btn--active' : ''}`}
                onClick={() => setShowPreview(false)}
              >
                <span className="pe-mode-icon">E</span> Editeur
              </button>
              <button
                className={`pe-mode-btn pe-mode-btn--preview ${showPreview ? 'pe-mode-btn--active pe-mode-btn--preview-active' : ''}`}
                onClick={() => setShowPreview(true)}
              >
                <span className="pe-mode-icon">V</span> Apercu
              </button>
            </div>
          </div>

          {/* Colonne 3 - Avatar (droite) */}
          <div className="pe-header-right">
            {storedUser.avatar ? (
              <img
                src={storedUser.avatar}
                alt={userName}
                className="pe-user-avatar"
              />
            ) : (
              <div className="pe-user-avatar pe-user-avatar--fallback" aria-label={userName}>
                {userInitials}
              </div>
            )}
          </div>
        </div>

        {/* Onglets â€” masquÃ©s en mode AperÃ§u */}
        {!showPreview && (
          <nav className="pe-tabs" role="tablist" aria-label="Ã‰dition du projet">
            {TABS.map(tab => (
              <span
                key={tab}
                className={`pe-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveTab(tab)}
              >
                {tab}
              </span>
            ))}
          </nav>
        )}
      </header>

      {/* â”€â”€ MODE Ã‰DITEUR â”€â”€ */}
      {!showPreview && (
        <main className="pe-main">
          {activeTab === 'Bases' && <BasicsTab draftProject={draftProject} onSaveDraft={onSaveDraft} onNavigate={onNavigate} />}
          {activeTab === 'Recompenses' && <RewardsTab draftProject={draftProject} onSaveDraft={onSaveDraft} />}
          {activeTab === 'Histoire' && <StoryTab draftProject={draftProject} onSaveDraft={onSaveDraft} />}
          {activeTab === 'Personnes' && <PeopleTab />}
          {/* Bottom Action Bar */}
          <div className="pe-action-bar">
            <button
              className={`pe-action-btn pe-action-btn--ghost ${isSaving ? 'is-disabled' : ''}`}
              onClick={handleSaveToDatabase}
              disabled={isSaving}
            >
              <span className="pe-action-btn__icon" aria-hidden="true"></span>
              <span className="pe-action-btn__text">
                {isSaving ? (id ? 'Enregistrement...' : 'Sauvegarde...') : (id ? 'Enregistrer les modifications' : 'Enregistrer le brouillon')}
              </span>
            </button>

            {TABS.indexOf(activeTab) < TABS.length - 1 ? (
              <button
                className="pe-action-btn pe-action-btn--primary"
                onClick={handleNextTab}
              >
                <span className="pe-action-btn__text">Suivant : {TABS[TABS.indexOf(activeTab) + 1]}</span>
                <span className="pe-action-btn__arrow" aria-hidden="true">-&gt;</span>
              </button>
            ) : (
              <button
                className={`pe-action-btn pe-action-btn--primary ${isSaving ? 'is-disabled' : ''}`}
                onClick={handleSubmitForReview}
                disabled={isSaving}
              >
                <span className="pe-action-btn__icon" aria-hidden="true"></span>
                <span className="pe-action-btn__text">Soumettre le projet</span>
              </button>
            )}
          </div>

          {activeTab === 'Bases' && (
            <div
              style={{
                padding: '0 40px 32px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                className="pe-save-btn"
                style={{
                  background: 'transparent',
                  color: '#ff4d4f',
                  borderColor: 'rgba(255, 77, 79, 0.5)',
                }}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(255, 77, 79, 0.1)';
                  e.target.style.borderColor = '#ff4d4f';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = 'rgba(255, 77, 79, 0.5)';
                }}
                onClick={() => setShowDeleteModal(true)}
              >
                Supprimer ce brouillon
              </button>
            </div>
          )}
        </main>
      )}

      {/* â”€â”€ MODE APERÃ‡U (pleine page, mÃªme layout que l'Ã©diteur) â”€â”€ */}
      {showPreview && (
        <main className="pe-main pe-preview-page">
          <div className="pe-preview-content">

            {/* Titre & Sous-titre */}
            <div className="pe-preview-hero">
              <span className="pe-preview-badge">
                <span className="pe-preview-dot"></span>
                Mode PrÃ©visualisation
              </span>
              <h1 className="pe-preview-title">
                {draftProject?.title || 'Titre de votre projet'}
              </h1>
              <p className="pe-preview-subtitle">
                {draftProject?.subtitle || 'Un sous-titre accrocheur pour prÃ©senter votre concept.'}
              </p>
            </div>

            {/* Layout principal : Image + Sidebar financement */}
            <div className="pe-preview-body">

              {/* Image principale */}
              <div className="pe-preview-media">
                <div className="pe-preview-image-placeholder">
                  {draftProject?.image_url ? (
                    <img
                      src={`${API_URL}${draftProject.image_url}`}
                      alt={draftProject?.title || 'Projet'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                    />
                  ) : (
                    <span>Aucune image principale</span>
                  )}
                </div>
              </div>

              {/* Sidebar financement */}
              <aside className="pe-preview-sidebar">
                <div className="pe-preview-amount">0 DT</div>
                <div className="pe-preview-goal">
                  engagÃ©s sur un objectif de <strong>{draftProject?.goal || '0'} DT</strong>
                </div>

                <div className="pe-preview-progress-bg">
                  <div className="pe-preview-progress-fill" style={{ width: '0%' }}></div>
                </div>

                <div className="pe-preview-stats">
                  <div className="pe-preview-stat">
                    <span className="pe-preview-stat-val">0</span>
                    <span className="pe-preview-stat-lbl">contributeurs</span>
                  </div>
                  <div className="pe-preview-stat">
                    <span className="pe-preview-stat-val">{draftProject?.duration || '0'}</span>
                    <span className="pe-preview-stat-lbl">jours restants</span>
                  </div>
                </div>

                <button className="pe-preview-cta" disabled>
                  Soutenir ce projet
                </button>

                <p className="pe-preview-notice">
                  âš ï¸ Ceci est un aperÃ§u â€” le projet n'est pas encore publiÃ©.
                </p>
              </aside>
            </div>

          </div>
        </main>
      )}


      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 7, 13, 0.78)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'linear-gradient(180deg, rgba(26, 31, 43, 0.98), rgba(14, 18, 27, 0.98))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              boxShadow: '0 30px 90px rgba(0, 0, 0, 0.42)',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                margin: '0 auto 18px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                color: '#fff',
                background: 'radial-gradient(circle at 30% 30%, rgba(255, 189, 89, 0.35), rgba(255, 77, 79, 0.22))',
                border: '1px solid rgba(255, 128, 128, 0.24)',
              }}
            >
              !
            </div>
            <h2 style={{ margin: '0 0 12px', color: '#fff', fontSize: '28px', fontWeight: 800 }}>
              Supprimer ce brouillon ?
            </h2>
            <p style={{ margin: '0 0 10px', color: '#d4d4d8', fontSize: '16px', lineHeight: '1.7' }}>
              Votre projet quittera l editeur et ce brouillon ne sera plus conserve.
            </p>
            <p style={{ margin: '0 0 28px', color: '#fca5a5', fontSize: '14px', lineHeight: '1.6' }}>
              Cette action est definitive et ne peut pas etre annulee.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="pe-save-btn"
                onClick={() => setShowDeleteModal(false)}
                style={{ minWidth: '160px', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.12)' }}
              >
                Continuer l edition
              </button>
              <button
                type="button"
                className="pe-save-btn"
                onClick={handleConfirmDelete}
                style={{
                  minWidth: '160px',
                  background: 'linear-gradient(135deg, #ff6b6b, #ff4d4f)',
                  color: '#fff',
                  borderColor: 'transparent',
                  boxShadow: '0 12px 28px rgba(255, 77, 79, 0.28)',
                }}
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {showMissingMediaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 7, 13, 0.78)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'linear-gradient(180deg, rgba(23, 28, 39, 0.98), rgba(14, 18, 27, 0.98))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              boxShadow: '0 30px 90px rgba(0, 0, 0, 0.42)',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                margin: '0 auto 18px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                color: '#111',
                background: 'radial-gradient(circle at 30% 30%, rgba(12, 230, 136, 0.92), rgba(8, 182, 104, 0.78))',
                boxShadow: '0 16px 36px rgba(12, 230, 136, 0.18)',
              }}
            >
              ?
            </div>
            <h2 style={{ margin: '0 0 12px', color: '#fff', fontSize: '28px', fontWeight: 800 }}>
              Ajoutez votre media principal
            </h2>
            <p style={{ margin: '0 0 10px', color: '#d4d4d8', fontSize: '16px', lineHeight: '1.7' }}>
              Votre campagne a besoin d une image ou d une video principale avant de passer a l etape suivante.
            </p>
            <p style={{ margin: '0 0 28px', color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6' }}>
              Importez un visuel dans la section Bases pour donner une premiere impression plus forte a votre projet.
            </p>
            <button
              type="button"
              className="nav-btn-solid"
              onClick={() => setShowMissingMediaModal(false)}
              style={{
                minWidth: '180px',
                background: 'linear-gradient(135deg, #0ce688, #09c774)',
                color: '#111',
                boxShadow: '0 12px 30px rgba(12, 230, 136, 0.25)',
              }}
            >
              Compris
            </button>
          </div>
        </div>
      )}
      {showSubmitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 7, 13, 0.78)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              background: 'linear-gradient(180deg, rgba(23, 28, 39, 0.98), rgba(14, 18, 27, 0.98))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              boxShadow: '0 30px 90px rgba(0, 0, 0, 0.42)',
              padding: '34px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '78px',
                height: '78px',
                margin: '0 auto 18px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: '#111',
                background: 'radial-gradient(circle at 30% 30%, rgba(12, 230, 136, 0.92), rgba(8, 182, 104, 0.78))',
                boxShadow: '0 16px 36px rgba(12, 230, 136, 0.18)',
              }}
            >
              ?
            </div>
            <h2 style={{ margin: '0 0 12px', color: '#fff', fontSize: '30px', fontWeight: 800 }}>
              Soumettre votre projet ?
            </h2>
            <p style={{ margin: '0 0 10px', color: '#d4d4d8', fontSize: '16px', lineHeight: '1.75' }}>
              Votre campagne sera envoyee a l equipe Hive.tn pour verification avant publication.
            </p>
            <p style={{ margin: '0 0 28px', color: '#a1a1aa', fontSize: '14px', lineHeight: '1.65' }}>
              Une fois soumise, vous ne pourrez plus la modifier librement tant que la revision n est pas terminee.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="nav-btn-solid"
                onClick={() => setShowSubmitModal(false)}
                style={{
                  minWidth: '180px',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: 'none',
                }}
              >
                Continuer l edition
              </button>
              <button
                type="button"
                className="nav-btn-solid"
                onClick={confirmSubmitForReview}
                style={{
                  minWidth: '180px',
                  background: 'linear-gradient(135deg, #0ce688, #09c774)',
                  color: '#111',
                  boxShadow: '0 12px 30px rgba(12, 230, 136, 0.25)',
                }}
              >
                Oui, soumettre
              </button>
            </div>
          </div>
        </div>
      )}
      {feedbackModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 7, 13, 0.78)',
            backdropFilter: 'blur(10px)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'linear-gradient(180deg, rgba(23, 28, 39, 0.98), rgba(14, 18, 27, 0.98))',
              border:
                feedbackModal.tone === 'error'
                  ? '1px solid rgba(248, 113, 113, 0.22)'
                  : feedbackModal.tone === 'warning'
                  ? '1px solid rgba(251, 191, 36, 0.22)'
                  : '1px solid rgba(12, 230, 136, 0.16)',
              borderRadius: '24px',
              boxShadow: '0 30px 90px rgba(0, 0, 0, 0.42)',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                margin: '0 auto 18px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 800,
                color: feedbackModal.tone === 'error' ? '#fff' : '#111',
                background:
                  feedbackModal.tone === 'error'
                    ? 'radial-gradient(circle at 30% 30%, rgba(248, 113, 113, 0.95), rgba(239, 68, 68, 0.78))'
                    : feedbackModal.tone === 'warning'
                    ? 'radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.78))'
                    : 'radial-gradient(circle at 30% 30%, rgba(12, 230, 136, 0.92), rgba(8, 182, 104, 0.78))',
                boxShadow:
                  feedbackModal.tone === 'error'
                    ? '0 16px 36px rgba(239, 68, 68, 0.2)'
                    : feedbackModal.tone === 'warning'
                    ? '0 16px 36px rgba(245, 158, 11, 0.2)'
                    : '0 16px 36px rgba(12, 230, 136, 0.18)',
              }}
            >
              {feedbackModal.tone === 'success' ? 'OK' : '!'}
            </div>
            <h2 style={{ margin: '0 0 12px', color: '#fff', fontSize: '28px', fontWeight: 800 }}>
              {feedbackModal.title}
            </h2>
            <p style={{ margin: '0 0 10px', color: '#d4d4d8', fontSize: '16px', lineHeight: '1.7' }}>
              {feedbackModal.message}
            </p>
            {feedbackModal.details ? (
              <p style={{ margin: '0 0 28px', color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6' }}>
                {feedbackModal.details}
              </p>
            ) : null}
            <button
              type="button"
              className="nav-btn-solid"
              onClick={closeFeedbackModal}
              style={{
                minWidth: '180px',
                background:
                  feedbackModal.tone === 'error'
                    ? 'linear-gradient(135deg, #f87171, #ef4444)'
                    : feedbackModal.tone === 'warning'
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(135deg, #0ce688, #09c774)',
                color: feedbackModal.tone === 'error' ? '#fff' : '#111',
                boxShadow:
                  feedbackModal.tone === 'error'
                    ? '0 12px 30px rgba(239, 68, 68, 0.25)'
                    : feedbackModal.tone === 'warning'
                    ? '0 12px 30px rgba(245, 158, 11, 0.22)'
                    : '0 12px 30px rgba(12, 230, 136, 0.25)',
              }}
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectEditor;










