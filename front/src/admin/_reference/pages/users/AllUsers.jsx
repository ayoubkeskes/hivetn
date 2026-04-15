import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import * as adminService from '../../services/adminService';

export default function AllUsers() {
  const { users, refetchUsers, refetchStats } = useOutletContext();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, user: null });
  const [roleConfirmModal, setRoleConfirmModal] = useState({ isOpen: false, user: null, newRole: 'USER' });
  const [editUserModal, setEditUserModal] = useState({
    isOpen: false, userId: null, name: '', email: '', role: 'USER', bio: '', avatar: ''
  });

  const handleDeleteUser = (user) => {
    setDeleteUserModal({ isOpen: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserModal.user) return;
    try {
      const res = await adminService.deleteUser(deleteUserModal.user.id);
      if (res.success) {
        alert('Utilisateur supprimé.');
        refetchUsers();
        refetchStats();
      } else {
        alert('Suppression impossible: ' + res.message);
      }
    } catch {
      alert('Erreur réseau lors de la suppression.');
    } finally {
      setDeleteUserModal({ isOpen: false, user: null });
    }
  };

  const handleToggleRole = (user) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setRoleConfirmModal({ isOpen: true, user, newRole });
  };

  const confirmToggleRole = async () => {
    if (!roleConfirmModal.user) return;
    try {
      const res = await adminService.updateUserRole(roleConfirmModal.user.id, roleConfirmModal.newRole);
      if (res.success) {
        alert('Rôle mis à jour.');
        refetchUsers();
      } else {
        alert('Modification impossible: ' + res.message);
      }
    } catch {
      alert('Erreur réseau.');
    } finally {
      setRoleConfirmModal({ isOpen: false, user: null, newRole: 'USER' });
    }
  };

  const handleOpenEditUser = (user) => {
    setEditUserModal({
      isOpen: true,
      userId: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      bio: user.bio || '',
      avatar: user.avatar || '',
    });
  };

  const handleSaveEditedUser = async () => {
    if (!editUserModal.name.trim() || !editUserModal.email.trim()) {
      alert('Nom et Email sont obligatoires.');
      return;
    }
    try {
      const res = await adminService.updateUser(editUserModal.userId, {
        name: editUserModal.name.trim(),
        email: editUserModal.email.trim(),
        role: editUserModal.role,
        bio: editUserModal.bio,
        avatar: editUserModal.avatar,
      });
      if (res.success) {
        alert('Utilisateur mis à jour.');
        if (res.user.id === currentUser.id) {
          localStorage.setItem('user', JSON.stringify({ ...currentUser, ...res.user }));
        }
        refetchUsers();
        setEditUserModal({ isOpen: false, userId: null, name: '', email: '', role: 'USER', bio: '', avatar: '' });
      } else {
        alert('Mise à jour impossible: ' + res.message);
      }
    } catch {
      alert('Erreur réseau.');
    }
  };

  return (
    <div className="fade-in admin-table-wrapper">
      <div className="table-header-bar">
        <h4>Utilisateurs de la Plateforme ({users?.length || 0})</h4>
      </div>
      {!users || users.length === 0 ? (
        <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>Aucun utilisateur trouvé.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Email</th>
              <th>Inscrit le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.id === currentUser.id;
              return (
                <tr key={u.id}>
                  <td className="cell-primary">{u.name}</td>
                  <td>
                    <span className={`status-badge ${u.role === 'ADMIN' ? 'actif' : 'attente'}`}>
                      {u.role === 'ADMIN' ? 'Admin' : 'Utilisateur'}
                    </span>
                  </td>
                  <td className="cell-secondary">{u.email}</td>
                  <td className="cell-secondary">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    {isSelf ? (
                      <span style={{ color: '#a1a1aa', fontSize: '12px', fontStyle: 'italic' }}>Vous (protégé)</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="action-btn user-edit-btn" onClick={() => handleOpenEditUser(u)} title="Modifier l'utilisateur">
                          ✏️ Renommer
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleToggleRole(u)}
                          style={{ color: u.role === 'ADMIN' ? '#f59e0b' : '#10b981' }}
                        >
                          {u.role === 'ADMIN' ? '⬇ Rétrograder' : '⬆ Promouvoir'}
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleDeleteUser(u)}
                          style={{ color: '#ef4444' }}
                        >
                          🗑 Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Delete User Modal */}
      {deleteUserModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">!</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer cet utilisateur ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Toutes ses campagnes seront également supprimées. Irréversible.
            </p>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button className="action-btn" onClick={() => setDeleteUserModal({ isOpen: false, user: null })}>Annuler</button>
              <button className="btn-reject-confirm" onClick={confirmDeleteUser}>Oui, supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUserModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%', textAlign: 'left' }}>
            <h3 className="modal-title">Modifier utilisateur</h3>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Nom</label>
              <input
                className="modal-textarea"
                style={{ minHeight: 'auto', height: '46px' }}
                value={editUserModal.name}
                onChange={(e) => setEditUserModal(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Email</label>
              <input
                className="modal-textarea"
                style={{ minHeight: 'auto', height: '46px' }}
                value={editUserModal.email}
                onChange={(e) => setEditUserModal(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="action-btn" onClick={() => setEditUserModal({ isOpen: false, userId: null, name: '', email: '', role: 'USER', bio: '', avatar: '' })}>Annuler</button>
              <button className="btn-primary" onClick={handleSaveEditedUser}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Role Modal */}
      {roleConfirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-role-confirm-modal">
            <h3 className="modal-title admin-role-confirm-modal__title">
              {roleConfirmModal.newRole === 'ADMIN' ? 'Promouvoir cet utilisateur ?' : 'Retirer les droits admin ?'}
            </h3>
            <div className="modal-actions admin-role-confirm-modal__actions">
              <button className="action-btn" onClick={() => setRoleConfirmModal({ isOpen: false, user: null, newRole: 'USER' })}>Annuler</button>
              <button className="btn-primary" onClick={confirmToggleRole}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
