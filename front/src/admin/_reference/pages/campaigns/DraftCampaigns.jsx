import React from 'react';
import { useOutletContext } from 'react-router-dom';

export default function DraftCampaigns() {
  const { allCampaigns } = useOutletContext();
  const draftCampaigns = allCampaigns?.filter((c) => c.status === 'DRAFT') || [];

  return (
    <div className="fade-in admin-table-wrapper">
      <div className="table-header-bar">
        <h4>Campagnes brouillons ({draftCampaigns.length})</h4>
      </div>
      {draftCampaigns.length === 0 ? (
        <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>
          Aucune campagne brouillon pour le moment.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Créateur</th>
              <th>Catégorie</th>
              <th>Objectif</th>
              <th>Statut</th>
              <th>Créée le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {draftCampaigns.map(camp => (
              <tr key={camp.id}>
                <td className="cell-primary">{camp.title}</td>
                <td className="cell-secondary">{camp.creator_name}</td>
                <td className="cell-secondary">{camp.category || 'Non catégorisé'}</td>
                <td className="cell-primary">{(camp.target_amount / 1000).toLocaleString()} DT</td>
                <td><span className="status-badge brouillon">Brouillon</span></td>
                <td className="cell-secondary">{new Date(camp.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>Non modifiable en admin</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
