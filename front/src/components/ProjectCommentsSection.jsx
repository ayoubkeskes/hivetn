import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5000';
const MAX_COMMENT_LENGTH = 1000;

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_URL}${url}`;
};

const formatCommentDate = (value) => {
  if (!value) return 'A l instant';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'A l instant';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'A l instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const ProjectCommentsSection = ({ campaignId, isAuthenticated, onNavigate, onCountChange }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftComment, setDraftComment] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmedComment = draftComment.trim();

  const loadComments = async () => {
    if (!campaignId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/campaigns/${campaignId}/comments`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Impossible de charger les commentaires.');
        setComments([]);
        onCountChange?.(0);
        return;
      }

      const nextComments = Array.isArray(data.comments) ? data.comments : [];
      setComments(nextComments);
      onCountChange?.(nextComments.length);
    } catch (loadError) {
      console.error('Comments load error:', loadError);
      setError('Impossible de charger les commentaires pour le moment.');
      setComments([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [campaignId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setSubmitError('Connectez-vous pour publier un commentaire.');
      return;
    }

    if (!trimmedComment) {
      setSubmitError('Le commentaire ne peut pas être vide.');
      return;
    }

    if (trimmedComment.length > MAX_COMMENT_LENGTH) {
      setSubmitError(`Le commentaire ne peut pas depasser ${MAX_COMMENT_LENGTH} caracteres.`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/campaigns/${campaignId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmedComment }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.message || 'Impossible de publier votre commentaire.');
        return;
      }

      const nextComments = [data.comment, ...comments];
      setComments(nextComments);
      onCountChange?.(nextComments.length);
      setDraftComment('');
      setSubmitSuccess('Votre commentaire a été publié.');
    } catch (submitFailure) {
      console.error('Comment submit error:', submitFailure);
      setSubmitError('Erreur réseau lors de la publication du commentaire.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pd-comments-section">
      <div className="pd-comments-header">
        <div>
          <h2>Commentaires</h2>
          <p className="pd-comments-subtitle">
            Échangez publiquement autour du projet et encouragez son créateur.
          </p>
        </div>
        <div className="pd-comments-count">{comments.length}</div>
      </div>

      {isAuthenticated ? (
        <form className="pd-comment-form" onSubmit={handleSubmit}>
          <label className="pd-comment-form__label" htmlFor="campaign-comment">
            Ajouter un commentaire
          </label>
          <textarea
            id="campaign-comment"
            className="pd-comment-form__textarea"
            placeholder="Partagez votre avis, une question ou un mot d encouragement..."
            value={draftComment}
            onChange={(event) => {
              setDraftComment(event.target.value);
              if (submitError) setSubmitError('');
              if (submitSuccess) setSubmitSuccess('');
            }}
            maxLength={MAX_COMMENT_LENGTH}
          />
          <div className="pd-comment-form__footer">
            <span className={`pd-comment-form__counter ${draftComment.length > MAX_COMMENT_LENGTH ? 'is-limit' : ''}`}>
              {draftComment.length}/{MAX_COMMENT_LENGTH}
            </span>
            <button
              type="submit"
              className="pd-comment-form__submit"
              disabled={submitting || !trimmedComment}
            >
              {submitting ? 'Publication...' : 'Publier le commentaire'}
            </button>
          </div>
          {submitError && <p className="pd-comment-feedback is-error">{submitError}</p>}
          {submitSuccess && <p className="pd-comment-feedback is-success">{submitSuccess}</p>}
        </form>
      ) : (
        <div className="pd-comment-login-callout">
          <p>Connectez-vous pour partager votre avis sur cette campagne.</p>
          <button
            type="button"
            className="pd-comment-login-callout__btn"
            onClick={() => onNavigate('signIn')}
          >
            Se connecter pour commenter
          </button>
        </div>
      )}

      {loading ? (
        <div className="pd-comments-state">Chargement des commentaires...</div>
      ) : error ? (
        <div className="pd-comments-state is-error">
          <p>{error}</p>
          <button type="button" className="pd-comments-retry" onClick={loadComments}>
            Reessayer
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="pd-comments-empty">
          <strong>Aucun commentaire pour le moment.</strong>
          <span>Soyez la première personne à lancer la conversation autour de cette campagne.</span>
        </div>
      ) : (
        <div className="pd-comments-list">
          {comments.map((comment) => (
            <article key={comment.id} className="pd-comment-card">
              <div className="pd-comment-card__avatar">
                {comment.author_avatar ? (
                  <img src={resolveMediaUrl(comment.author_avatar)} alt={comment.author_name || 'Auteur'} />
                ) : (
                  <span>{String(comment.author_name || 'U').slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="pd-comment-card__body">
                <div className="pd-comment-card__meta">
                  <strong>{comment.author_name || 'Utilisateur Hive.tn'}</strong>
                  <span>{formatCommentDate(comment.created_at)}</span>
                </div>
                <p className="pd-comment-card__content">{comment.content}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProjectCommentsSection;
