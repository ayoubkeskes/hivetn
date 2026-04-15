import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import * as adminService from '../../services/adminService';

export default function PendingCampaigns() {
  const { pendingCampaigns, refetchCampaigns, refetchStats } = useOutletContext();
  const [rejectModal, setRejectModal] = useState({ isOpen: false, campaignId: null, reason: '' });
  const [viewModal, setViewModal] = useState({ isOpen: false, campaign: null });

  const handleApprove = async (id) => {
    try {
      const res = await adminService.approveCampaign(id);
      if (res.success) {
        alert('Campagne approuvée avec succès.');
        refetchCampaigns();
        refetchStats();
      } else {
        alert('Erreur: ' + res.message);
      }
    } catch {
      alert('Erreur réseau lors de l\'approbation.');
    }
  };

  const handleRejectClick = (id) => {
    setRejectModal({ isOpen: true, campaignId: id, reason: '' });
  };

  const confirmRejection = async () => {
    if (!rejectModal.reason.trim()) {
      alert('Un motif de rejet est obligatoire.');
      return;
    }
    try {
      const res = await adminService.rejectCampaign(rejectModal.campaignId, rejectModal.reason);
      if (res.success) {
        alert('Campagne refusée.');
        refetchCampaigns();
        refetchStats();
      } else {
        alert('Erreur: ' + res.message);
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setRejectModal({ isOpen: false, campaignId: null, reason: '' });
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Voulez-vous supprimer cette campagne en attente ?')) return;
    try {
      const res = await adminService.deleteCampaign(id);
      if (res.success) {
        refetchCampaigns();
      }
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  return (
    <div className="fade-in admin-table-wrapper">
      <div className="table-header-bar">
        <h4>En attente de Modération ({pendingCampaigns?.length || 0})</h4>
      </div>
      {!pendingCampaigns || pendingCampaigns.length === 0 ? (
        <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>
          ✅ Aucune campagne en attente de modération.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre de la Campagne</th>
              <th>Créateur</th>
              <th>Objectif</th>
              <th>Catégorie</th>
              <th>Créée le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingCampaigns.map(camp => (
              <tr key={camp.id}>
                <td className="cell-primary">{camp.title}</td>
                <td className="cell-secondary">{camp.creator_name}</td>
                <td className="cell-primary">{(camp.target_amount / 1000).toLocaleString()} DT</td>
                <td><span className="status-badge attente">{camp.category}</span></td>
                <td className="cell-secondary">{new Date(camp.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  <button className="action-btn" onClick={() => handleApprove(camp.id)}>Approuver</button>
                  <button className="action-btn" onClick={() => setViewModal({ isOpen: true, campaign: camp })} style={{ color: '#0ea5e9' }}>Détails</button>
                  <button className="action-btn" onClick={() => alert("Commentaires globaux dans la prochaine version")} style={{ color: '#22c55e' }}>Commentaires</button>
                  <button className="action-btn" onClick={() => handleRejectClick(camp.id)} style={{ color: '#ef4444' }}>Refuser</button>
                  <button className="action-btn" onClick={() => handleDeleteCampaign(camp.id)} style={{ color: '#f97316' }}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Refuser la Campagne</h3>
            <p className="modal-desc">
              Fournissez une raison détaillée. Celle-ci sera envoyée par email au créateur.
            </p>
            <textarea
              className="modal-textarea"
              placeholder="Ex : Le plan d'affaires est incomplet..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            />
            <div className="modal-actions">
              <button className="action-btn" onClick={() => setRejectModal({ isOpen: false, campaignId: null, reason: '' })}>Annuler</button>
              <button className="btn-reject-confirm" onClick={confirmRejection}>Envoyer le Refus</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal.isOpen && viewModal.campaign && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', color: '#fff', margin: 0 }}>Détails de la Campagne</h2>
              <button onClick={() => setViewModal({ isOpen: false, campaign: null })} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '10px', textTransform: 'uppercase' }}>Informations</h3>
              <p><strong>Titre :</strong> {viewModal.campaign.title}</p>
              <p><strong>Objectif :</strong> {(viewModal.campaign.target_amount / 1000).toLocaleString()} TND</p>
              <p><strong>Créateur :</strong> {viewModal.campaign.creator_name}</p>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="action-btn" onClick={() => setViewModal({ isOpen: false, campaign: null })}>Fermer</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="action-btn" onClick={() => {
                  handleApprove(viewModal.campaign.id);
                  setViewModal({ isOpen: false, campaign: null });
                }}>Approuver</button>
                <button className="btn-reject-confirm" onClick={() => {
                  handleRejectClick(viewModal.campaign.id);
                  setViewModal({ isOpen: false, campaign: null });
                }}>Refuser</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
