import React from 'react';

const FeaturedCampaignCard = ({ project, loading, onClick }) => {
  const progress = Math.max(0, Math.min(Number(project?.funded || 0), 100));
  const supporters = Number(project?.backerCount || 0);

  return (
    <article
      className={`featured-campaign-card${onClick ? ' is-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && e.key === 'Enter') onClick();
      }}
      aria-label={project?.title ? `Campagne mise en avant : ${project.title}` : 'Campagne mise en avant'}
    >
      <div className="featured-campaign-media">
        <img
          src={project.image}
          alt={project.title}
          className="featured-campaign-image"
          loading="eager"
        />
        <div className="featured-campaign-badge">{loading ? 'Chargement...' : 'Campagne en vedette'}</div>
      </div>

      <div className="featured-campaign-body">
        <p className="featured-campaign-kicker">{project.category || 'Projet local'}</p>
        <h3 className="featured-campaign-title">{project.title}</h3>

        <div
          className="featured-campaign-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progress}% finance`}
        >
          <div
            className="featured-campaign-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="featured-campaign-meta">
          <div className="featured-campaign-stat">
            <span className="featured-campaign-stat-value">{project.collected}</span>
            <span className="featured-campaign-stat-label">montant collecte</span>
          </div>
          <div className="featured-campaign-stat">
            <span className="featured-campaign-stat-value">{supporters}</span>
            <span className="featured-campaign-stat-label">contributeurs</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default FeaturedCampaignCard;
