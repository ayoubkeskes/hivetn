import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PeopleTab = () => {
  const [generatedUrl, setGeneratedUrl] = useState('');
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const rawUserName = (storedUser.name || '').trim();
  const rawUserBio = (storedUser.bio || '').trim();
  const rawUserAvatar = (storedUser.avatar || '').trim();
  const rawUserLocation = (storedUser.location || '').trim();

  const userName = rawUserName || 'Votre profil Hive';
  const userBio = rawUserBio;
  const userAvatar = rawUserAvatar;
  const userLocation = rawUserLocation || 'Tunisie';
  const userInitials = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const profileCompletion = useMemo(() => {
    const completedFields = [
      Boolean(rawUserName),
      Boolean(rawUserAvatar),
      Boolean(rawUserBio),
      true,
    ].filter(Boolean).length;

    return Math.round((completedFields / 4) * 100);
  }, [rawUserAvatar, rawUserBio, rawUserName]);

  const profileReady =
    Boolean(rawUserName) &&
    Boolean(rawUserAvatar) &&
    Boolean(rawUserBio) &&
    Boolean(userLocation);

  const profileFields = [
    { label: 'Nom', done: Boolean(rawUserName) },
    { label: 'Photo', done: Boolean(rawUserAvatar) },
    { label: 'Bio', done: Boolean(rawUserBio) },
    { label: 'Localisation', done: true },
  ];

  const handleGenerateUrl = () => {
    const randomSlug = Math.random().toString(36).substring(2, 8);
    const safeName = userName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'profil';

    setGeneratedUrl(`https://hive.tn/profile/${safeName}-${randomSlug}`);
  };

  const handleEditProfile = () => {
    navigate('/settings');
  };

  return (
    <div className="pe-people">
      <div className="pe-people__intro">
        <span className="pe-people__eyebrow">Votre presence publique</span>
        <h1 className="pe-people__title">Presentez-vous</h1>
        <p className="pe-people__description">
          Donnez à vos contributeurs une idée claire de qui vous êtes et inspirez davantage confiance dès la première visite.
        </p>
      </div>

      <div className="pe-split-row pe-people__row">
        <div className="pe-split-left pe-people__side">
          <h2>Votre profil</h2>
          <p>
            Cela apparaitra sur la page de votre projet et doit inclure votre nom, votre photo, votre biographie et votre emplacement.
          </p>
        </div>
        <div className="pe-split-right pe-people__panel pe-people__panel--plain">
          <div className="pe-people-card pe-people-card--profile">
            <div className={`pe-people-card__status ${profileReady ? 'is-ready' : 'is-pending'}`}>
              {profileReady ? 'Profil complet' : 'Profil à compléter'}
            </div>

            <div className="pe-people-card__identity">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="pe-people-card__avatar" />
              ) : (
                <div className="pe-people-card__avatar pe-people-card__avatar--fallback">{userInitials}</div>
              )}

              <div className="pe-people-card__meta">
                <h3>{userName}</h3>
                <p className="pe-people-card__role">Créateur du projet</p>
                <p className="pe-people-card__hint">
                  {profileReady
                    ? 'Votre profil est prêt et visible par les contributeurs.'
                    : 'Completez votre profil pour inspirer confiance aux contributeurs.'}
                </p>
                <p className={`pe-people-card__state-copy ${profileReady ? 'is-ready' : 'is-pending'}`}>
                  {profileReady ? 'Profil complet' : 'Profil à compléter'}
                </p>
              </div>
            </div>

            <div className="pe-people-card__details">
              <div className="pe-people-card__detail">
                <span>Biographie</span>
                <strong>{userBio ? 'Ajoutee' : 'A completer'}</strong>
              </div>
              <div className="pe-people-card__detail">
                <span>Photo</span>
                <strong>{userAvatar ? 'Ajoutee' : 'A completer'}</strong>
              </div>
              <div className="pe-people-card__detail">
                <span>Localisation</span>
                <strong>{userLocation}</strong>
              </div>
            </div>

            <div className="pe-people-card__checklist" aria-label="Etat du profil">
              {profileFields.map((field) => (
                <div
                  key={field.label}
                  className={`pe-people-card__check-item ${field.done ? 'is-done' : 'is-missing'}`}
                >
                  <span className="pe-people-card__check-bullet" aria-hidden="true">
                    {field.done ? '+' : '-'}
                  </span>
                  <span>{field.label}</span>
                </div>
              ))}
            </div>

            <div className="pe-people-card__progress">
              <div className="pe-people-card__progress-top">
                <span>Profil visible sur votre campagne</span>
                <strong>{profileCompletion}%</strong>
              </div>
              <div className="pe-people-card__progress-track">
                <div className="pe-people-card__progress-fill" style={{ width: `${profileCompletion}%` }} />
              </div>
              <p className="pe-people-card__progress-note">
                Un profil complet ameliore la credibilite de votre projet.
              </p>
            </div>

            <div className="pe-people-card__actions">
              <button
                className="cp-btn-next pe-people-card__primary-btn pe-people-card__primary-btn--compact"
                onClick={handleEditProfile}
              >
                {profileReady ? 'Modifier mon profil' : 'Completer votre profil'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pe-people__divider" />

      <div className="pe-split-row pe-people__row">
        <div className="pe-split-left pe-people__side">
          <h2>URL personnalisee</h2>
          <p>
            Créez une URL simple et mémorable pour votre profil. Elle servira aussi de base pour l'identité publique de votre projet.
          </p>
        </div>
        <div className="pe-split-right pe-people__panel">
          {!generatedUrl ? (
            <div className="pe-people-card pe-people-card--url">
              <div className="pe-people-card__icon">#</div>
              <p className="pe-people-card__url-copy">
                Cliquez sur le bouton ci-dessous pour generer automatiquement une URL unique pour votre page de profil.
              </p>
              <button
                className="cp-btn-next pe-people-card__primary-btn pe-people-card__primary-btn--wide"
                onClick={handleGenerateUrl}
              >
                Generer mon URL automatiquement
              </button>
            </div>
          ) : (
            <div className="pe-people-card pe-people-card--success">
              <h3 className="pe-people-card__success-title">URL générée avec succès</h3>
              <p className="pe-people-card__success-text">
                Votre profil public dispose maintenant d un lien propre et partageable.
              </p>
              <div className="pe-people-card__url-box">
                <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className="pe-people-card__url-link">
                  {generatedUrl}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleTab;
