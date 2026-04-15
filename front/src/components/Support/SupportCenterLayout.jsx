import React from "react";
import { Link, useLocation } from "react-router-dom";

import Navbar from "../../Navbar";
import "./SupportCenterLayout.css";

const navigationItems = [
  {
    to: "/support",
    label: "Tous les tickets",
    description: "Suivre vos demandes et les dernieres reponses.",
  },
  {
    to: "/support/new",
    label: "Ouvrir un ticket",
    description: "Contacter rapidement l'équipe Hive.tn.",
  },
];

const SupportCenterLayout = ({
  onNavigate,
  isAuthenticated,
  onLogout,
  title,
  subtitle,
  actions,
  children,
}) => {
  const location = useLocation();
  const isTicketDetailsPath = /^\/support\/[^/]+$/.test(location.pathname) && location.pathname !== "/support/new";

  return (
    <div className="support-page-wrapper">
      <Navbar
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        activeTab="support"
      />

      <div className="support-shell">
        <aside className="support-sidebar">
          <div className="support-sidebar__eyebrow">Support centre</div>
          <h2 className="support-sidebar__title">Nous restons disponibles à chaque étape.</h2>
          <p className="support-sidebar__copy">
            Ouvrez un ticket clair, suivez les réponses de l'équipe et gardez un historique propre de vos demandes.
          </p>

          <nav className="support-sidebar__nav" aria-label="Navigation support">
            {navigationItems.map((item) => {
              const isActive = item.to === "/support"
                ? location.pathname === "/support" || isTicketDetailsPath
                : location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`support-sidebar__link ${isActive ? "is-active" : ""}`}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </Link>
              );
            })}
          </nav>

          <div className="support-sidebar__card">
            <p className="support-sidebar__card-label">Conseil</p>
            <p className="support-sidebar__card-text">
              Ajoutez le contexte complet de votre demande et, si besoin, associez la campagne concernee pour accelerer le traitement.
            </p>
          </div>
        </aside>

        <section className="support-main-panel">
          <header className="support-main-panel__header">
            <div>
              <p className="support-main-panel__eyebrow">Assistance Hive.tn</p>
              <h1 className="support-main-panel__title">{title}</h1>
              {subtitle && <p className="support-main-panel__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="support-main-panel__actions">{actions}</div>}
          </header>

          <div className="support-main-panel__content">{children}</div>
        </section>
      </div>
    </div>
  );
};

export default SupportCenterLayout;
