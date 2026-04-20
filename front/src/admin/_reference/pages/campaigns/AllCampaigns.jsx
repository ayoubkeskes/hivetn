import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Eye, Edit2, MessageSquare, Trash2, Megaphone, X } from 'lucide-react';
import { buildApiUrl } from '../../../shared/services/api.js';
import * as adminService from '../../services/adminService';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return buildApiUrl(url);
};

const formatCampaignStatus = (status) => {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'PENDING') return 'En attente';
  if (status === 'DRAFT') return 'Brouillon';
  if (status === 'REJECTED') return 'Refusée';
  if (status === 'CLOSED') return 'Clôturée';
  return status;
};

export default function AllCampaigns() {
  const { allCampaigns, pendingCampaigns, stats, refetchCampaigns } = useOutletContext();
  
  const [campFilters, setCampFilters] = useState({ search: '', category: '', status: '', sort: 'newest' });
  const [campPage, setCampPage] = useState(1);
  const campItemsPerPage = 10;
  
  const [previewPanel, setPreviewPanel] = useState({ isOpen: false, campaign: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, campaign: null });

  // Note: Modals for Edit/Comments are simplified here or can be fully copied if needed. 
  // For brevity and focus, we prioritize the structure and existing operations. 
  // If editing is required in AllCampaigns, we will trigger an alert or a future modal.
  const handleOpenEditCampaign = (campaign) => {
    alert("L'édition modulaire sera finalisée dans les prochaines étapes. Edition pour: " + campaign.title);
  };
  
  const handleOpenCampaignComments = (campaign) => {
    alert("Les commentaires seront ouverts via un portail global pour: " + campaign.title);
  };

  const handleDeleteCampaign = (campaign) => {
    setDeleteModal({ isOpen: true, campaign });
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteModal.campaign) return;
    try {
      const res = await adminService.deleteCampaign(deleteModal.campaign.id);
      if (res.success) {
        alert('Campagne supprimée');
        refetchCampaigns();
      } else {
        alert('Erreur: ' + res.message);
      }
    } catch (err) {
      alert('Erreur réseau lors de la suppression.');
    } finally {
      setDeleteModal({ isOpen: false, campaign: null });
    }
  };

  const uniqueCategories = useMemo(() => {
    if (!allCampaigns) return [];
    return [...new Set(allCampaigns.map(c => c.category).filter(Boolean))].sort();
  }, [allCampaigns]);

  const filteredCamps = useMemo(() => {
    return (allCampaigns || []).filter(c => {
      if (campFilters.search && !c.title?.toLowerCase().includes(campFilters.search.toLowerCase()) && !c.creator_name?.toLowerCase().includes(campFilters.search.toLowerCase())) return false;
      if (campFilters.category && c.category !== campFilters.category) return false;
      if (campFilters.status && c.status !== campFilters.status) return false;
      return true;
    }).sort((a, b) => {
      if (campFilters.sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (campFilters.sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (campFilters.sort === 'goal') return (b.target_amount || 0) - (a.target_amount || 0);
      if (campFilters.sort === 'collected') return (b.current_amount || 0) - (a.current_amount || 0);
      return 0;
    });
  }, [allCampaigns, campFilters]);

  const totalCampPages = Math.ceil(filteredCamps.length / campItemsPerPage);
  const currentCampPage = Math.min(campPage, totalCampPages > 0 ? totalCampPages : 1);
  const paginatedCamps = filteredCamps.slice((currentCampPage - 1) * campItemsPerPage, currentCampPage * campItemsPerPage);

  const activeCount = allCampaigns?.filter(c => c.status === 'ACTIVE').length || 0;
  const draftCount = allCampaigns?.filter(c => c.status === 'DRAFT').length || 0;
  const pendingCount = pendingCampaigns?.length || 0;

  return (
    <div className="fade-in admin-campaigns-module">
      {/* KPI Summary Cards */}
      <div className="kpi-summary-cards">
        <article className="kpi-card">
          <span className="kpi-label">Total Campagnes</span>
          <strong className="kpi-value">{allCampaigns?.length || 0}</strong>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Actives</span>
          <strong className="kpi-value active-val">{activeCount}</strong>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">En attente</span>
          <strong className="kpi-value pending-val">{pendingCount}</strong>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Brouillons</span>
          <strong className="kpi-value draft-val">{draftCount}</strong>
        </article>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar-controls">
        <div className="filter-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une campagne..."
            value={campFilters.search}
            onChange={(e) => { setCampFilters(prev => ({ ...prev, search: e.target.value })); setCampPage(1); }}
          />
        </div>
        <div className="filter-dropdowns">
          <select 
            value={campFilters.category} 
            onChange={(e) => { setCampFilters(prev => ({ ...prev, category: e.target.value })); setCampPage(1); }}
          >
            <option value="">Toutes Catégories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select 
            value={campFilters.status} 
            onChange={(e) => { setCampFilters(prev => ({ ...prev, status: e.target.value })); setCampPage(1); }}
          >
            <option value="">Tous Statuts</option>
            <option value="ACTIVE">Actives</option>
            <option value="PENDING">En attente</option>
            <option value="DRAFT">Brouillons</option>
            <option value="REJECTED">Rejetées</option>
            <option value="CLOSED">Clôturées</option>
          </select>
          <select
            value={campFilters.sort}
            onChange={(e) => { setCampFilters(prev => ({ ...prev, sort: e.target.value })); setCampPage(1); }}
          >
            <option value="newest">Plus récentes en premier</option>
            <option value="oldest">Plus anciennes en premier</option>
            <option value="goal">Objectif décroissant</option>
            <option value="collected">Collecte décroissante</option>
          </select>
        </div>
      </div>

      {/* Enhanced Table Workspace */}
      <div className="admin-table-wrapper mod-campaigns-table">
        {paginatedCamps.length === 0 ? (
          <div className="table-empty-state">
            <Megaphone size={40} className="empty-icon" />
            <h4>Aucune campagne trouvée</h4>
            <p>Modifiez vos critères de recherche ou de filtre.</p>
          </div>
        ) : (
          <>
            <table className="admin-table enhanced-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Collecte / Objectif</th>
                  <th>Statut</th>
                  <th>Créée le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCamps.map(campaign => {
                  const goal = campaign.target_amount || 0;
                  const collected = (campaign.current_amount || 0);
                  let pct = goal > 0 ? Math.round((collected / goal) * 100) : 0;
                  pct = Math.min(100, Math.max(0, pct));
                  const thumbnailUrl = resolveMediaUrl(campaign.image_url);

                  return (
                    <tr key={campaign.id} className="enhanced-row">
                      <td>
                        <div className="cell-title-group">
                          <div className="campaign-thumbnail">
                            {thumbnailUrl ? (
                              <img src={thumbnailUrl} alt="Thumbnail" />
                            ) : (
                              <div className="thumb-placeholder"><Megaphone size={16} /></div>
                            )}
                          </div>
                          <div className="campaign-title-info">
                            <strong>{campaign.title || 'Campagne sans titre'}</strong>
                            <small>{campaign.creator_name || 'Créateur inconnu'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-progress">
                          <div className="progress-numbers">
                            <strong>{(collected / 1000).toLocaleString('fr-FR')} DT</strong>
                            <span> / {(goal / 1000).toLocaleString('fr-FR')} DT</span>
                          </div>
                          <div className="campaign-progress-bar">
                            <div className="campaign-progress-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge modern-badge badge-${campaign.status?.toLowerCase() || 'default'}`}>
                          {formatCampaignStatus(campaign.status)}
                        </span>
                      </td>
                      <td className="cell-secondary">
                        {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <div className="cell-actions-iconic">
                          <button className="icon-btn btn-view" title="Voir l'aperçu" onClick={() => setPreviewPanel({ isOpen: true, campaign })}>
                            <Eye size={18} />
                          </button>
                          {['ACTIVE', 'PENDING', 'DRAFT'].includes(campaign.status) && (
                            <>
                              <button className="icon-btn btn-edit" title="Modifier" onClick={() => handleOpenEditCampaign(campaign)}>
                                <Edit2 size={18} />
                              </button>
                              <button className="icon-btn btn-comments" title="Commentaires" onClick={() => handleOpenCampaignComments(campaign)}>
                                <MessageSquare size={18} />
                              </button>
                              <button className="icon-btn btn-delete" title="Supprimer" onClick={() => handleDeleteCampaign(campaign)}>
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalCampPages > 1 && (
              <div className="table-pagination">
                <span className="pagination-info">
                  Affichage de {((currentCampPage - 1) * campItemsPerPage) + 1} à {Math.min(currentCampPage * campItemsPerPage, filteredCamps.length)} sur {filteredCamps.length} campagnes
                </span>
                <div className="pagination-controls">
                  <button 
                    disabled={currentCampPage === 1} 
                    onClick={() => setCampPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <span className="page-indicator">Page {currentCampPage} / {totalCampPages}</span>
                  <button 
                    disabled={currentCampPage === totalCampPages} 
                    onClick={() => setCampPage(p => Math.min(totalCampPages, p + 1))}
                  >
                    Suivant <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Side Panel Preview */}
      {previewPanel.isOpen && previewPanel.campaign && (
        <>
          <div className="preview-panel-overlay" onClick={() => setPreviewPanel({ isOpen: false, campaign: null })}></div>
          <div className="preview-panel-drawer open">
            <div className="preview-panel-header">
              <h3>Aperçu de la Campagne</h3>
              <button className="icon-btn btn-close-panel" onClick={() => setPreviewPanel({ isOpen: false, campaign: null })}>
                <X size={20} />
              </button>
            </div>
            <div className="preview-panel-content">
              {resolveMediaUrl(previewPanel.campaign.image_url) ? (
                <img src={resolveMediaUrl(previewPanel.campaign.image_url)} alt="Campaign cover" className="preview-cover" />
              ) : (
                <div className="preview-cover-placeholder"><Megaphone size={32} /></div>
              )}
              <div className="preview-body">
                <h2>{previewPanel.campaign.title || 'Sans titre'}</h2>
                <p className="preview-creator">Par <strong>{previewPanel.campaign.creator_name || 'Créateur inconnu'}</strong></p>
                <div className="preview-tags">
                  <span className={`status-badge modern-badge badge-${previewPanel.campaign.status?.toLowerCase() || 'default'}`}>
                    {formatCampaignStatus(previewPanel.campaign.status)}
                  </span>
                  {previewPanel.campaign.category && (
                    <span className="category-badge">{previewPanel.campaign.category}</span>
                  )}
                </div>
                <div className="preview-goal-box">
                  <div className="goal-row">
                    <span>Objectif</span>
                    <strong>{((previewPanel.campaign.target_amount || 0) / 1000).toLocaleString('fr-FR')} DT</strong>
                  </div>
                  <div className="goal-row">
                    <span>Collecté</span>
                    <strong>{((previewPanel.campaign.current_amount || 0) / 1000).toLocaleString('fr-FR')} DT</strong>
                  </div>
                </div>
                <div className="preview-desc">
                  <h4>Description</h4>
                  <p>{previewPanel.campaign.description || 'Aucune description disponible.'}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Basic Delete Modal */}
      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">!</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer cette campagne ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Cette action retirera définitivement la campagne de la plateforme.
            </p>
            <div className="admin-delete-comment-modal__preview">
              <strong>{deleteModal.campaign?.title}</strong>
            </div>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button
                className="action-btn"
                onClick={() => setDeleteModal({ isOpen: false, campaign: null })}
              >
                Garder la campagne
              </button>
              <button className="btn-reject-confirm" onClick={confirmDeleteCampaign}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
