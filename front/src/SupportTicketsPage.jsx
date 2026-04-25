import React, { useEffect, useState } from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

import "./SupportTicketsPage.css";
import SupportCenterLayout from "./components/Support/SupportCenterLayout";
import {
  SupportCategoryBadge,
  SupportPriorityBadge,
  SupportStatusBadge,
} from "./components/Support/SupportBadges";
import { listUserSupportTickets } from "./modules/support/services/supportApi.js";
import {
  formatSupportDate,
  supportCategoryOptions,
  supportStatusOptions,
  userSupportSortOptions,
} from "./modules/support/utils/supportUtils.js";

const emptySummary = {
  total_tickets: 0,
  open_tickets: 0,
  closed_tickets: 0,
};

const SupportFilterMenu = ({ id, label, value, options, onChange, openMenu, setOpenMenu }) => {
  const isOpen = openMenu === id;
  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div className={`support-filter-menu ${isOpen ? "is-open" : ""}`}>
      <span className="support-filter-menu__label">{label}</span>
      <button
        type="button"
        className="support-filter-menu__button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? "" : id)}
      >
        <span>{selectedOption?.label || "Selectionner"}</span>
        <span className="support-filter-menu__chevron" aria-hidden="true">⌄</span>
      </button>

      {isOpen && (
        <div className="support-filter-menu__panel" role="listbox" aria-label={label}>
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value || "all"}
                type="button"
                className={`support-filter-menu__option ${selected ? "is-selected" : ""}`}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpenMenu("");
                }}
              >
                <span>{option.label}</span>
                {selected && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SupportTicketsPage = ({ onNavigate, isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const toolbarRef = useRef(null);
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    sortValue: "last_message_at:DESC",
    page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    setLoading(true);
    setError("");

    listUserSupportTickets(filters)
      .then((data) => {
        if (!active) return;
        setTickets(data.tickets || []);
        setSummary(data.summary || emptySummary);
        setPagination(data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message || "Impossible de charger vos tickets pour le moment.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters, token]);

  useEffect(() => {
    if (!openMenu) return undefined;

    const closeOnOutside = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setOpenMenu("");
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpenMenu("");
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  if (!token) return null;

  const hasActiveFilters = Boolean(filters.search || filters.status || filters.category);
  const statusFilterOptions = [{ value: "", label: "Tous" }, ...supportStatusOptions];
  const categoryFilterOptions = [{ value: "", label: "Toutes" }, ...supportCategoryOptions];

  return (
    <SupportCenterLayout
      onNavigate={onNavigate}
      isAuthenticated={isAuthenticated}
      onLogout={onLogout}
      title="Centre d assistance"
      subtitle="Retrouvez toutes vos demandes, suivez les statuts en un coup d oeil et ouvrez rapidement un nouveau ticket si besoin."
      actions={(
        <button className="nav-btn-solid" onClick={() => navigate("/support/new")}>
          Ouvrir un ticket
        </button>
      )}
    >
      <section className="support-overview-cards">
        <article className="support-overview-card">
          <span>Total tickets</span>
          <strong>{summary.total_tickets || 0}</strong>
          <p>Historique complet de vos demandes d assistance.</p>
        </article>
        <article className="support-overview-card">
          <span>Tickets ouverts</span>
          <strong>{summary.open_tickets || 0}</strong>
          <p>Demandes actuellement en traitement ou en attente.</p>
        </article>
        <article className="support-overview-card">
          <span>Tickets fermes</span>
          <strong>{summary.closed_tickets || 0}</strong>
          <p>Tickets resolus ou clotures dans votre historique.</p>
        </article>
      </section>

      <section className="support-toolbar" ref={toolbarRef}>
        <label className="support-toolbar__search">
          <span>Recherche</span>
          <input
            type="search"
            placeholder="Titre, reference, campagne..."
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({
              ...prev,
              search: event.target.value,
              page: 1,
            }))}
          />
        </label>

        <SupportFilterMenu
          id="status"
          label="Statut"
          value={filters.status}
          options={statusFilterOptions}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onChange={(status) => setFilters((prev) => ({
            ...prev,
            status,
            page: 1,
          }))}
        />

        <SupportFilterMenu
          id="category"
          label="Catégorie"
          value={filters.category}
          options={categoryFilterOptions}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onChange={(category) => setFilters((prev) => ({
            ...prev,
            category,
            page: 1,
          }))}
        />

        <SupportFilterMenu
          id="sort"
          label="Trier par"
          value={filters.sortValue}
          options={userSupportSortOptions}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onChange={(sortValue) => setFilters((prev) => ({
            ...prev,
            sortValue,
            page: 1,
          }))}
        />

        {hasActiveFilters && (
          <button
            className="support-toolbar__reset"
            type="button"
            onClick={() => setFilters({
              search: "",
              status: "",
              category: "",
              sortValue: "last_message_at:DESC",
              page: 1,
            })}
          >
            Reinitialiser
          </button>
        )}
      </section>

      {error && (
        <div className="support-feedback-banner is-error">
          <p>{error}</p>
          <button type="button" className="support-inline-action" onClick={() => setFilters((prev) => ({ ...prev }))}>
            Reessayer
          </button>
        </div>
      )}

      {loading ? (
        <section className="support-loading-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="support-skeleton-card" />
          ))}
        </section>
      ) : tickets.length === 0 ? (
        <section className="support-empty-state">
          <div className="support-empty-state__badge">Support</div>
          <h2>Aucun ticket pour le moment</h2>
          <p>
            Vous n'avez encore ouvert aucune demande. Si vous avez une question sur votre compte, vos paiements ou une campagne, notre équipe est prête à vous aider.
          </p>
          <button className="nav-btn-solid" onClick={() => navigate("/support/new")}>
            Creer mon premier ticket
          </button>
        </section>
      ) : (
        <>
          <section className="support-table-shell">
            <div className="support-table-header">
              <div>
                <h2>Vos conversations support</h2>
                <p>Chaque ticket reste lisible, traçable et facile à reprendre.</p>
              </div>
              <span>{pagination.total || tickets.length} ticket(s)</span>
            </div>

            <div className="support-table-scroll">
              <table className="support-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Titre</th>
                    <th>Categorie</th>
                    <th>Priorite</th>
                    <th>Statut</th>
                    <th>Assigne</th>
                    <th>Campagne</th>
                    <th>Derniere activite</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} onClick={() => navigate(`/support/${ticket.id}`)}>
                      <td>{formatSupportDate(ticket.created_at, false)}</td>
                      <td className="support-table__primary">{ticket.code}</td>
                      <td>
                        <div className="support-table__primary">{ticket.title}</div>
                      </td>
                      <td><SupportCategoryBadge category={ticket.category} /></td>
                      <td><SupportPriorityBadge priority={ticket.priority} /></td>
                      <td><SupportStatusBadge status={ticket.status} /></td>
                      <td>{ticket.assigned_admin_name || "Non assigne"}</td>
                      <td>{ticket.related_campaign_title || "Aucune"}</td>
                      <td>{formatSupportDate(ticket.last_message_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="support-mobile-list">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className="support-mobile-card"
                onClick={() => navigate(`/support/${ticket.id}`)}
              >
                <div className="support-mobile-card__top">
                  <strong>{ticket.title}</strong>
                  <SupportStatusBadge status={ticket.status} />
                </div>
                <div className="support-mobile-card__meta">
                  <span>{ticket.code}</span>
                  <span>{formatSupportDate(ticket.created_at, false)}</span>
                </div>
                <div className="support-mobile-card__chips">
                  <SupportCategoryBadge category={ticket.category} />
                  <SupportPriorityBadge priority={ticket.priority} />
                </div>
                <div className="support-mobile-card__meta">
                  <span>{ticket.assigned_admin_name || "Non assigne"}</span>
                  <span>{ticket.related_campaign_title || "Sans campagne"}</span>
                </div>
              </button>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="support-pagination">
              <button
                type="button"
                className="support-pagination__btn"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                Precedent
              </button>
              <span>Page {pagination.page} / {pagination.totalPages}</span>
              <button
                type="button"
                className="support-pagination__btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </SupportCenterLayout>
  );
};

export default SupportTicketsPage;
