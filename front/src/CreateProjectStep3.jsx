import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CreateProject.css';

const API_URL = 'http://localhost:5000';

const CreateProjectStep3 = ({ onNavigate, onSaveDraft, draftProject }) => {
  const [title, setTitle] = useState(draftProject?.title || '');
  const [subtitle, setSubtitle] = useState(draftProject?.subtitle || '');
  const [photoName, setPhotoName] = useState(draftProject?.photoName || '');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = storedUser.name || 'Utilisateur';
  const userAvatar = storedUser.avatar || '';
  const userInitials = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const MAX_TITLE = 60;
  const MAX_SUBTITLE = 135;

  const isFormComplete =
    title.trim().length > 0 &&
    title.length <= MAX_TITLE &&
    subtitle.trim().length > 0 &&
    subtitle.length <= MAX_SUBTITLE;

  const imagePreview = useMemo(() => {
    if (selectedImageFile) {
      return URL.createObjectURL(selectedImageFile);
    }

    return draftProject?.image_url ? `${API_URL}${draftProject.image_url}` : '';
  }, [draftProject?.image_url, selectedImageFile]);

  useEffect(() => {
    return () => {
      if (imagePreview && selectedImageFile) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, selectedImageFile]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImageFile(file);
      setPhotoName(file.name);
      if (onSaveDraft) {
        onSaveDraft({ photoName: file.name });
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setPhotoName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (onSaveDraft) {
      onSaveDraft({
        photoName: '',
        image_url: '',
      });
    }
  };

  const uploadCampaignImage = async (campaignId, file, token) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/campaigns/${campaignId}/media/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.fileUrl) {
      throw new Error(data.message || "Erreur lors de l'importation de l'image.");
    }

    return data.fileUrl;
  };

  const handleSubmit = async () => {
    if (!isFormComplete) return;

    setError('');
    setLoading(true);

    if (onSaveDraft) {
      onSaveDraft({ title, subtitle, photoName });
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Vous devez être connecté pour créer un projet.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: subtitle,
          category: draftProject?.category || 'Non categorise',
          target_amount: 1000,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.campaign_id) {
        setError(data.message || 'Erreur lors de la creation du projet.');
        return;
      }

      let imageUrl = draftProject?.image_url || '';
      if (selectedImageFile) {
        imageUrl = await uploadCampaignImage(data.campaign_id, selectedImageFile, token);
      }

      if (onSaveDraft) {
        onSaveDraft({
          campaignId: data.campaign_id,
          title,
          subtitle,
          photoName,
          image_url: imageUrl,
          video_url: imageUrl ? '' : (draftProject?.video_url || ''),
        });
      }

      onNavigate('projectEditor', data.campaign_id);
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur. Verifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-wrapper">
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

      <div className="cp-progress-container">
        <div className="cp-progress-segment active"></div>
        <div className="cp-progress-segment active"></div>
        <div className="cp-progress-segment active"></div>
      </div>

      <main className="cp-main">
        <div style={{ maxWidth: '700px', width: '100%', textAlign: 'left', marginBottom: '40px' }}>
          <h1 className="cp-title" style={{ marginBottom: '10px' }}>Commencons par les bases</h1>
          <p className="cp-description">Facilitez la decouverte de votre projet par notre communaute.</p>
        </div>

        {error && (
          <div style={{ maxWidth: '700px', width: '100%', marginBottom: '20px', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ maxWidth: '700px', width: '100%', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '30px', textAlign: 'left' }}>
          <div className="cp-form-group">
            <label className="cp-form-label">Titre</label>
            <input
              type="text"
              className="cp-input"
              placeholder="La Ferme Hydroponique Tunisienne"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className={`cp-char-count ${title.length > MAX_TITLE ? 'error' : ''}`}>
              {title.length}/{MAX_TITLE}
            </div>
          </div>

          <div className="cp-form-group">
            <label className="cp-form-label">Sous-titre</label>
            <textarea
              className="cp-textarea"
              placeholder="Une approche écologique et locale pour produire des légumes frais toute l'année..."
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            ></textarea>
            <div className={`cp-char-count ${subtitle.length > MAX_SUBTITLE ? 'error' : ''}`}>
              {subtitle.length}/{MAX_SUBTITLE}
            </div>
          </div>

          <div className="cp-form-group" style={{ marginBottom: 0 }}>
            <label className="cp-form-label">Photo principale du projet (Optionnel)</label>
            <div className="cp-file-upload">
              <input
                type="file"
                id="project-photo"
                className="cp-file-input"
                accept="image/png, image/jpeg, image/jpg"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <label htmlFor="project-photo" className="cp-file-label">
                {photoName ? `Image sélectionnée : ${photoName}` : "Cliquez ici pour uploader une image"}
              </label>
              {!photoName && <span className="cp-file-hint">Formats supportes: JPEG, PNG, GIF. Ratio conseille 16:9.</span>}

              {imagePreview && (
                <div className="cp-image-preview-block">
                  <img
                    src={imagePreview}
                    alt="Apercu du projet"
                    className="cp-image-preview"
                  />
                  <button
                    type="button"
                    className="cp-btn-remove-image"
                    onClick={handleRemoveImage}
                  >
                    Supprimer l'image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="cp-footer">
        <div className="cp-footer-text">
          Derniere etape avant la validation !
        </div>
        <button
          className="cp-btn-next"
          disabled={!isFormComplete || loading}
          onClick={handleSubmit}
        >
          {loading ? 'Creation en cours...' : 'Valider mon projet'}
        </button>
      </footer>
    </div>
  );
};

export default CreateProjectStep3;
