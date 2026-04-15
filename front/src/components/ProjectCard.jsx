import React from 'react';

import { getCampaignDaysLeft } from '../shared/utils/campaignDates.js';

const ProjectCard = ({ project, onNavigate, actions, overlay }) => (
  <article
    className="project-card"
    onClick={() => onNavigate('projectDetails', project.id)}
    role="link"
    tabIndex={0}
    aria-label={`Projet : ${project.title}`}
    onKeyDown={(e) => e.key === 'Enter' && onNavigate('projectDetails', project.id)}
  >
    <div className="project-image-container">
      <span className="project-badge">{project.category}</span>
      <img
        src={project.image}
        alt={project.title}
        className="project-image"
        loading="lazy"
      />
      {overlay && <div className="project-card-overlay">{overlay}</div>}
    </div>
    <div className="project-content">
      <h3 className="project-title">{project.title}</h3>
      <p 
        className={`project-creator${project.creatorId ? ' project-creator--link' : ''}`}
        onClick={(e) => {
          if (project.creatorId) {
            e.stopPropagation();
            onNavigate('publicProfile', project.creatorId);
          }
        }}
      >
        {project.creator}
      </p>
      <p className="project-desc">{project.desc}</p>

      <div className="project-stats">
        <div
          className="progress-bar-bg"
          role="progressbar"
          aria-valuenow={project.funded}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${project.funded}% financé`}
        >
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(project.funded, 100)}%` }}
          />
        </div>
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-value">{project.funded}%</span>
            <span className="stat-label">financé</span>
          </div>
          <div className="stat-item stat-item--center">
            <span className="stat-value stat-value--white">{project.collected}</span>
            <span className="stat-label">récolté</span>
          </div>
          <div className="stat-item stat-item--right">
            <span className="stat-value stat-value--white">
              {project.daysLeft && project.daysLeft !== '--' ? project.daysLeft : getCampaignDaysLeft(project)}
            </span>
            <span className="stat-label">jours restants</span>
          </div>
        </div>
      </div>

      {actions && <div className="project-card-actions">{actions}</div>}
    </div>
  </article>
);

export default ProjectCard;
