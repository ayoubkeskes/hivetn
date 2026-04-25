import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Clock3,
  Inbox,
  LifeBuoy,
  MessageSquareText,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  SupportCategoryBadge,
  SupportPriorityBadge,
  SupportStatusBadge,
} from "./SupportBadges";
import SupportMessageBubble from "./SupportMessageBubble";
import {
  addAdminSupportTicketNote,
  assignAdminSupportTicket,
  getAdminSupportTicket,
  listAdminSupportTickets,
  replyToAdminSupportTicket,
  updateAdminSupportTicket,
} from "../../modules/support/services/supportApi.js";
import {
  adminSupportSortOptions,
  formatSupportDate,
  formatSupportDateInput,
  getCategoryLabel,
  getInitials,
  supportCategoryOptions,
  supportPriorityOptions,
  supportStatusOptions,
} from "../../modules/support/utils/supportUtils.js";
import "../../SupportShared.css";
import "./AdminSupportWorkspace.css";

const emptySummary = {
  total_tickets: 0,
  new_unassigned_tickets: 0,
  open_in_progress_tickets: 0,
  awaiting_user_reply_tickets: 0,
  resolved_closed_tickets: 0,
};

const defaultSupportFilters = {
  search: "",
  status: "",
  category: "",
  priority: "",
  assignedAdminId: "",
  dateFrom: "",
  dateTo: "",
  sortValue: "last_message_at:DESC",
  page: 1,
};

const summaryCards = [
  { key: "total_tickets", label: "Total tickets", icon: LifeBuoy },
  { key: "new_unassigned_tickets", label: "Nouveaux / non assignes", icon: Inbox },
  { key: "open_in_progress_tickets", label: "Ouverts / en cours", icon: MessageSquareText },
  { key: "awaiting_user_reply_tickets", label: "En attente client", icon: Clock3 },
  { key: "resolved_closed_tickets", label: "Résolus / fermes", icon: UserRound },
];

const SupportToolbarMenu = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`admin-support-toolbar__menu ${isOpen ? "is-open" : ""}`} ref={menuRef}>
      <button
        type="button"
        className="admin-support-toolbar__menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="admin-support-toolbar__menu-label">{label}</span>
        <span className="admin-support-toolbar__menu-value">{selectedOption?.label}</span>
        <span className="admin-support-toolbar__menu-arrow" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="admin-support-toolbar__menu-list" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`admin-support-toolbar__menu-option ${option.value === value ? "is-selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={option.value === value}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminSupportWorkspace = () => {
  const navigate = useNavigate();
  const params = useParams();
  const wildcardPath = params["*"] || "";
  const wildcardParts = wildcardPath.split("/").filter(Boolean);
  const ticketId = params.ticketId || (wildcardParts[0] === "support" && wildcardParts[1] !== "reports" ? wildcardParts[1] : null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const endOfMessagesRef = useRef(null);
  const [tickets, setTickets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState(defaultSupportFilters);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [replyNextStatus, setReplyNextStatus] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [workflowDraft, setWorkflowDraft] = useState({
    status: "OPEN",
    priority: "MEDIUM",
    category: "GENERAL",
    assignedAdminId: "",
  });
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const loadTickets = async () => {
    setListLoading(true);
    setListError("");

    try {
      const data = await listAdminSupportTickets(filters);
      setTickets(data.tickets || []);
      setAdmins(data.admins || []);
      setSummary(data.summary || emptySummary);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (loadError) {
      setListError(loadError.message || "Impossible de charger les tickets support.");
    } finally {
      setListLoading(false);
    }
  };

  const loadTicketDetail = async () => {
    if (!ticketId) {
      setDetail(null);
      setDetailError("");
      return;
    }

    setDetailLoading(true);
    setDetailError("");

    try {
      const data = await getAdminSupportTicket(ticketId);
      setDetail(data.ticket);
      setAdmins(data.admins || []);
      setWorkflowDraft({
        status: data.ticket.status || "OPEN",
        priority: data.ticket.priority || "MEDIUM",
        category: data.ticket.category || "GENERAL",
        assignedAdminId: data.ticket.assigned_admin_id || "",
      });
    } catch (loadError) {
      setDetailError(loadError.message || "Impossible de charger ce ticket.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filters]);

  useEffect(() => {
    loadTicketDetail();
  }, [ticketId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [detail?.messages?.length]);

  const handleOpenTicket = (id) => {
    navigate(`/admin/support/${id}`);
  };

  const handleReply = async (event) => {
    event.preventDefault();
    setFeedback("");

    if (!detail || !replyDraft.trim()) return;

    setReplySubmitting(true);

    try {
      const data = await replyToAdminSupportTicket(detail.id, {
        message: replyDraft.trim(),
        attachment: replyAttachment,
        next_status: replyNextStatus,
      });

      setDetail(data.ticket);
      setAdmins(data.admins || []);
      setReplyDraft("");
      setReplyAttachment(null);
      setReplyNextStatus("");
      setFeedback(data.message || "La réponse a été envoyée.");
      loadTickets();
    } catch (replyError) {
      setFeedback(replyError.message || "Impossible d'envoyer la réponse.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!detail) return;

    setWorkflowSubmitting(true);
    setFeedback("");

    try {
      if (workflowDraft.assignedAdminId !== (detail.assigned_admin_id || "")) {
        await assignAdminSupportTicket(detail.id, workflowDraft.assignedAdminId || null);
      }

      const data = await updateAdminSupportTicket(detail.id, {
        status: workflowDraft.status,
        priority: workflowDraft.priority,
        category: workflowDraft.category,
      });

      setDetail(data.ticket);
      setAdmins(data.admins || []);
      setFeedback(data.message || "Le ticket a été mis à jour.");
      loadTickets();
    } catch (updateError) {
      setFeedback(updateError.message || "Impossible de mettre a jour ce ticket.");
    } finally {
      setWorkflowSubmitting(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!detail || !noteDraft.trim()) return;

    setNoteSubmitting(true);
    setFeedback("");

    try {
      const data = await addAdminSupportTicketNote(detail.id, noteDraft.trim());
      setDetail((prev) => ({
        ...(prev || {}),
        internal_notes: [data.internalNote, ...(prev?.internal_notes || [])],
      }));
      setNoteDraft("");
      setFeedback(data.message || "La note interne a été ajoutée.");
    } catch (noteError) {
      setFeedback(noteError.message || "Impossible d'ajouter cette note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  const activeTicketId = detail?.id || ticketId || "";
  const latestMessage = detail?.messages?.[detail.messages.length - 1] || null;

  const renderTicketsList = () => {
    if (listLoading) {
      return (
        <section className="support-loading-grid admin-support-loading-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="support-skeleton-card" />
          ))}
        </section>
      );
    }

    if (tickets.length === 0) {
      return (
        <section className="support-empty-state admin-support-list-empty">
          <div className="support-empty-state__badge">Support client</div>
          <h2>Aucun ticket ne correspond a ces filtres</h2>
          <p>Ajustez les filtres ou attendez qu'une nouvelle demande client arrive.</p>
        </section>
      );
    }

    return (
      <div className="admin-support-ticket-list">
        {tickets.map((ticket) => {
          const isActive = String(activeTicketId) === String(ticket.id);
          return (
            <button
              key={ticket.id}
              type="button"
              className={`admin-support-ticket-card ${isActive ? "is-active" : ""}`}
              onClick={() => handleOpenTicket(ticket.id)}
            >
              <div className="admin-support-ticket-card__top">
                <div>
                  <span className="admin-support-ticket-card__code">{ticket.code}</span>
                  <strong>{ticket.title || "Ticket sans titre"}</strong>
                </div>
                <ChevronRight size={16} />
              </div>

              <div className="admin-support-ticket-card__user">
                <span className="admin-support-ticket-card__avatar">
                  {getInitials(ticket.user_name || ticket.user_email || "U")}
                </span>
                <div>
                  <strong>{ticket.user_name || "Client inconnu"}</strong>
                  <small>{ticket.user_email || "Email indisponible"}</small>
                </div>
              </div>

              <div className="admin-support-ticket-card__badges">
                <SupportPriorityBadge priority={ticket.priority} />
                <SupportStatusBadge status={ticket.status} />
              </div>

              <div className="admin-support-ticket-card__footer">
                <span>{getCategoryLabel(ticket.category)}</span>
                <span>{ticket.assigned_admin_name || "Non assigné"}</span>
                <span>{formatSupportDate(ticket.updated_at || ticket.created_at, false)}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (detailLoading) {
      return (
        <section className="support-loading-grid admin-support-loading-grid admin-support-loading-grid--detail">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="support-skeleton-card" />
          ))}
        </section>
      );
    }

    if (detailError) {
      return (
        <section className="support-empty-state admin-support-detail-empty">
          <div className="support-empty-state__badge">Erreur</div>
          <h2>Impossible de charger ce ticket</h2>
          <p>{detailError}</p>
        </section>
      );
    }

    if (!ticketId || !detail) {
      return (
        <section className="support-empty-state admin-support-detail-empty">
          <div className="admin-support-detail-empty__visual" aria-hidden="true">
            <MessageSquareText size={32} />
          </div>
          <div className="support-empty-state__badge">Aperçu ticket</div>
          <h2>Sélectionnez un ticket</h2>
          <p>Choisissez une conversation dans la colonne de gauche pour afficher le détail du ticket, les messages et le workflow.</p>
          <div className="admin-support-detail-empty__hints" aria-hidden="true">
            <span>Messages</span>
            <span>Assignation</span>
            <span>Workflow</span>
          </div>
        </section>
      );
    }

    return (
      <div className="admin-support-detail-panel__content">
        <section className="admin-support-overview-card">
          <div className="admin-support-overview-card__top">
            <div>
              <span className="admin-support-detail-topbar__code">{detail.code}</span>
              <h2>{detail.title}</h2>
              <p>{detail.user_name} - {detail.user_email}</p>
            </div>
            <button type="button" className="action-btn" onClick={() => navigate("/admin/support")}>
              <X size={16} /> Fermer
            </button>
          </div>

          <div className="admin-support-overview-card__badges">
            <SupportStatusBadge status={detail.status} />
            <SupportPriorityBadge priority={detail.priority} />
            <SupportCategoryBadge category={detail.category} />
          </div>

          <div className="admin-support-overview-card__meta">
            <article>
              <span>Utilisateur</span>
              <strong>{detail.user_name || "Client inconnu"}</strong>
            </article>
            <article>
              <span>Dernier message</span>
              <strong>{formatSupportDate(detail.last_message_at || detail.updated_at)}</strong>
            </article>
            <article>
              <span>Campagne</span>
              <strong>{detail.related_campaign_title || "Aucune"}</strong>
            </article>
          </div>

          <div className="admin-support-overview-card__message">
            <span>Dernier message</span>
            <p>{latestMessage?.message || "Aucun message disponible pour ce ticket."}</p>
          </div>
        </section>

        {feedback && (
          <div className={`support-feedback-banner ${feedback.toLowerCase().includes("impossible") ? "is-error" : "is-success"}`}>
            <p>{feedback}</p>
          </div>
        )}

        <section className="support-conversation-card">
          <div className="support-conversation-card__header">
            <div>
              <h2>Conversation</h2>
              <p>Historique complet des échanges entre le client et le support.</p>
            </div>
            <SupportStatusBadge status={detail.status} />
          </div>

          <div className="support-message-thread">
            {detail.messages?.map((message) => (
              <SupportMessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender_role === "ADMIN" && message.sender_id === currentUser.id}
              />
            ))}
            <div ref={endOfMessagesRef} />
          </div>

          <form className="support-reply-form" onSubmit={handleReply}>
            <label>
              <span>Réponse publique</span>
              <textarea
                rows="5"
                placeholder="Envoyez une réponse claire et rassurante au client."
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
              />
            </label>
            <div className="support-reply-form__footer">
              <label className="support-reply-form__upload">
                <span>Pièce jointe</span>
                <input type="file" onChange={(event) => setReplyAttachment(event.target.files?.[0] || null)} />
                <small>{replyAttachment ? replyAttachment.name : "Optionnel"}</small>
              </label>
              <label className="support-reply-form__upload">
                <span>Nouveau statut</span>
                <select value={replyNextStatus} onChange={(event) => setReplyNextStatus(event.target.value)}>
                  <option value="">Conserver le statut</option>
                  {supportStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit" disabled={replySubmitting || !replyDraft.trim()}>
                {replySubmitting ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        </section>

        <div className="admin-support-sidecolumn admin-support-sidecolumn--grid">
          <div className="admin-support-sidecard">
            <h3>Informations ticket</h3>
            <div className="admin-support-sidecard__row">
              <span>Client</span>
              <strong>{detail.user_name}</strong>
            </div>
            <div className="admin-support-sidecard__row">
              <span>Email</span>
              <strong>{detail.user_email}</strong>
            </div>
            <div className="admin-support-sidecard__row">
              <span>Créé le</span>
              <strong>{formatSupportDate(detail.created_at)}</strong>
            </div>
            <div className="admin-support-sidecard__row">
              <span>Dernier message</span>
              <strong>{formatSupportDate(detail.last_message_at)}</strong>
            </div>
            <div className="admin-support-sidecard__row">
              <span>Campagne liée</span>
              <strong>{detail.related_campaign_title || "Aucune"}</strong>
            </div>
            {detail.related_campaign_id && (
              <button type="button" className="action-btn admin-support-sidecard__link" onClick={() => navigate(`/project/${detail.related_campaign_id}`)}>
                Ouvrir la campagne
              </button>
            )}
          </div>

          <div className="admin-support-sidecard">
            <h3>Workflow</h3>
            <label className="admin-support-sidecard__field">
              <span>Assigné à</span>
              <select value={workflowDraft.assignedAdminId} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, assignedAdminId: event.target.value }))}>
                <option value="">Non assigné</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>{admin.name}</option>
                ))}
              </select>
            </label>
            <label className="admin-support-sidecard__field">
              <span>Statut</span>
              <select value={workflowDraft.status} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, status: event.target.value }))}>
                {supportStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-support-sidecard__field">
              <span>Priorité</span>
              <select value={workflowDraft.priority} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, priority: event.target.value }))}>
                {supportPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-support-sidecard__field">
              <span>Catégorie</span>
              <select value={workflowDraft.category} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, category: event.target.value }))}>
                {supportCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-primary" onClick={handleSaveWorkflow} disabled={workflowSubmitting}>
              {workflowSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>

          <div className="admin-support-sidecard">
            <h3>Notes internes</h3>
            <form className="admin-support-notes-form" onSubmit={handleAddNote}>
              <textarea
                rows="4"
                placeholder="Note visible uniquement par les administrateurs."
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
              <button type="submit" className="action-btn admin-support-notes-form__btn" disabled={noteSubmitting || !noteDraft.trim()}>
                {noteSubmitting ? "Ajout..." : "Ajouter une note"}
              </button>
            </form>
            <div className="admin-support-notes-list">
              {(detail.internal_notes || []).map((note) => (
                <article key={note.id} className="admin-support-note">
                  <div className="admin-support-note__top">
                    <strong>{note.admin_name}</strong>
                    <span>{formatSupportDate(note.created_at)}</span>
                  </div>
                  <p>{note.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="admin-support-sidecard">
            <h3>Resume</h3>
            <div className="admin-support-sidecard__row">
              <span>Statut actuel</span>
              <SupportStatusBadge status={detail.status} />
            </div>
            <div className="admin-support-sidecard__row">
              <span>Priorité</span>
              <SupportPriorityBadge priority={detail.priority} />
            </div>
            <div className="admin-support-sidecard__row">
              <span>Catégorie</span>
              <SupportCategoryBadge category={detail.category} />
            </div>
            <div className="admin-support-sidecard__row">
              <span>Date d'ouverture</span>
              <strong>{formatSupportDateInput(detail.created_at)}</strong>
            </div>
            <div className="admin-support-sidecard__row">
              <span>Contexte</span>
              <strong>{getCategoryLabel(detail.category)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-support-workspace fade-in">
      <section className="admin-support-summary">
        {summaryCards.map(({ key, label, icon: Icon }) => (
          <article key={key} className="admin-support-summary__card">
            <div className="admin-support-summary__card-top">
              <span>{label}</span>
              <div className="admin-support-summary__icon"><Icon size={16} /></div>
            </div>
            <strong>{summary[key] || 0}</strong>
          </article>
        ))}
      </section>

      <section className="admin-support-filters" aria-label="Filtres support client">
        <label className="admin-support-toolbar__search" aria-label="Recherche support">
          <Search size={17} />
          <input
            type="search"
            placeholder="Rechercher par reference, titre ou utilisateur..."
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
          />
          {filters.search && (
            <button
              type="button"
              className="admin-support-toolbar__clear"
              onClick={() => setFilters((prev) => ({ ...prev, search: "", page: 1 }))}
              aria-label="Effacer la recherche"
            >
              <X size={15} />
            </button>
          )}
        </label>

        <div className="admin-support-toolbar__group admin-support-toolbar__group--filters">
          <SupportToolbarMenu
            label="Statut"
            value={filters.status}
            options={[{ value: "", label: "Tous" }, ...supportStatusOptions]}
            onChange={(nextValue) => setFilters((prev) => ({ ...prev, status: nextValue, page: 1 }))}
          />
          <SupportToolbarMenu
            label="Catégorie"
            value={filters.category}
            options={[{ value: "", label: "Toutes" }, ...supportCategoryOptions]}
            onChange={(nextValue) => setFilters((prev) => ({ ...prev, category: nextValue, page: 1 }))}
          />
          <SupportToolbarMenu
            label="Priorité"
            value={filters.priority}
            options={[{ value: "", label: "Toutes" }, ...supportPriorityOptions]}
            onChange={(nextValue) => setFilters((prev) => ({ ...prev, priority: nextValue, page: 1 }))}
          />
          <SupportToolbarMenu
            label="Agent"
            value={filters.assignedAdminId}
            options={[{ value: "", label: "Tous" }, { value: "UNASSIGNED", label: "Non assignés" }, ...admins.map((admin) => ({ value: admin.id, label: admin.name }))]}
            onChange={(nextValue) => setFilters((prev) => ({ ...prev, assignedAdminId: nextValue, page: 1 }))}
          />
        </div>

        <div className="admin-support-toolbar__sort">
          <SupportToolbarMenu
            label="Trier par"
            value={filters.sortValue}
            options={adminSupportSortOptions}
            onChange={(nextValue) => setFilters((prev) => ({ ...prev, sortValue: nextValue, page: 1 }))}
          />
        </div>

        <button
          type="button"
          className="admin-support-toolbar__reset"
          onClick={() => setFilters(defaultSupportFilters)}
        >
          Réinitialiser
        </button>
      </section>

      {listError && (
        <div className="support-feedback-banner is-error">
          <p>{listError}</p>
        </div>
      )}

      <div className="admin-support-shell">
        <section className="admin-support-list-panel">
          <div className="table-header-bar">
            <h4>Tickets support ({pagination.total || tickets.length})</h4>
          </div>
          {renderTicketsList()}

          {pagination.totalPages > 1 && (
            <div className="support-pagination">
              <button
                type="button"
                className="support-pagination__btn"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                Précédent
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
        </section>

        <section className="admin-support-detail-panel">
          {renderDetailPanel()}
        </section>
      </div>
    </div>
  );
};

export default AdminSupportWorkspace;
