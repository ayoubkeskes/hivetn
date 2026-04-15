import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Ban,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  PiggyBank,
  ScrollText,
  Settings,
  ShieldCheck,
  Undo2,
  Users,
  WalletCards,
} from 'lucide-react';

export default function Sidebar({ contextData, onNavigateHome }) {
  const { allCampaigns, pendingCampaigns, users, pledges } = contextData || {};

  const [openNavGroups, setOpenNavGroups] = useState({
    campaigns: true,
    transactions: true,
    users: true,
    support: true,
  });

  const draftCampaignsCount = (allCampaigns || []).filter((c) => c.status === 'DRAFT').length;
  const rejectedCampaignsCount = (allCampaigns || []).filter((c) => c.status === 'REJECTED').length;
  const adminUsersCount = (users || []).filter((u) => u.role === 'ADMIN').length;

  const toggleNavGroup = (groupId) => {
    setOpenNavGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderNavItem = ({ id, path, label, icon: Icon, count }) => (
    <NavLink
      key={id}
      to={path}
      end={path === '/admin'}
      className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="nav-label">
        <Icon className="nav-icon" size={16} strokeWidth={1.9} />
        {label}
      </span>
      {typeof count === 'number' && count > 0 && <span className="nav-count">{count}</span>}
    </NavLink>
  );

  const renderNavGroup = ({ id, label, icon: Icon, children }) => {
    const isOpen = openNavGroups[id];
    // Check if any child route is currently active to highlight group implicitly
    // Since logic expects exact matching, we just let NavLink handle its own active states in CSS usually,
    // but we can add `is-active` class to the group if we want.
    // However, keeping it simple:

    return (
      <div className={`admin-nav-group`} key={id}>
        <button type="button" className="admin-nav-group-toggle" onClick={() => toggleNavGroup(id)}>
          <span className="nav-label">
            <Icon className="nav-icon" size={16} strokeWidth={1.9} />
            {label}
          </span>
          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        {isOpen && (
          <div className="admin-nav-sublist">
            {children.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = (storedUser.name || 'AD').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-top">
        <span className="admin-logo" onClick={onNavigateHome} style={{ cursor: 'pointer' }}>
          Hive.tn
        </span>
      </div>

      <nav className="admin-nav" aria-label="Navigation admin">
        {renderNavItem({ id: 'dashboard', path: '/admin', label: 'Dashboard', icon: LayoutDashboard })}

        {renderNavGroup({
          id: 'campaigns',
          label: 'Campagnes',
          icon: Megaphone,
          children: [
            { id: 'campaigns', path: '/admin/campaigns', label: 'Toutes les campagnes', icon: FileText, count: allCampaigns?.length || 0 },
            { id: 'moderation', path: '/admin/campaigns/pending', label: 'En attente', icon: ShieldCheck, count: pendingCampaigns?.length || 0 },
            { id: 'drafts', path: '/admin/campaigns/drafts', label: 'Brouillons', icon: PiggyBank, count: draftCampaignsCount },
            { id: 'rejected', path: '/admin/campaigns/rejected', label: 'Rejetées', icon: Ban, count: rejectedCampaignsCount },
          ],
        })}

        {renderNavGroup({
          id: 'transactions',
          label: 'Transactions',
          icon: CreditCard,
          children: [
            { id: 'pledges', path: '/admin/transactions/pledges', label: 'Soutiens', icon: WalletCards, count: pledges?.length || 0 },
            { id: 'payments', path: '/admin/transactions/payments', label: 'Paiements', icon: CreditCard },
            { id: 'refunds', path: '/admin/transactions/refunds', label: 'Remboursements', icon: Undo2 },
          ],
        })}

        {renderNavGroup({
          id: 'users',
          label: 'Utilisateurs',
          icon: Users,
          children: [
            { id: 'users', path: '/admin/users', label: 'Tous les utilisateurs', icon: Users, count: users?.length || 0 },
            { id: 'roles', path: '/admin/users/roles', label: 'Rôles & permissions', icon: ShieldCheck, count: adminUsersCount },
          ],
        })}

        {renderNavGroup({
          id: 'support',
          label: 'Support',
          icon: LifeBuoy,
          children: [
            { id: 'support', path: '/admin/support', label: 'Tickets', icon: LifeBuoy },
            { id: 'reports', path: '/admin/support/reports', label: 'Signalements', icon: Flag },
          ],
        })}

        {renderNavItem({ id: 'analytics', path: '/admin/analytics', label: 'Analytics', icon: BarChart3 })}
        {renderNavItem({ id: 'settings', path: '/admin/settings', label: 'Paramètres', icon: Settings })}
        {renderNavItem({ id: 'logs', path: '/admin/logs', label: 'Logs Admin', icon: ScrollText })}
      </nav>

      <div className="admin-sidebar-footer">
        <div
          className="sidebar-profile-avatar"
          style={storedUser.avatar ? { background: `url(${storedUser.avatar}) center/cover`, color: 'transparent' } : {}}
        >
          {storedUser.avatar ? '' : initials}
        </div>
        <div className="sidebar-profile-name">{storedUser.name || 'Administrateur'}</div>
        <div className="sidebar-profile-role">{storedUser.email || 'admin'}</div>
      </div>
    </aside>
  );
}
