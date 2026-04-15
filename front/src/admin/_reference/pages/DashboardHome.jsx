import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  Users,
  PiggyBank,
  WalletCards,
  ChevronRight,
} from 'lucide-react';

const renderDashboardSectionHeader = (title, subtitle) => (
  <div className="dashboard-section-header">
    <h3>{title}</h3>
    {subtitle && <p>{subtitle}</p>}
  </div>
);

const renderKpiCard = ({ title, value, detail, icon: Icon, tone }) => (
  <article className={`admin-kpi-card admin-kpi-card--${tone}`} key={title}>
    <div className="admin-kpi-card__top">
      <span className="admin-kpi-card__icon"><Icon size={18} strokeWidth={2} /></span>
      <span className="admin-kpi-card__label">{title}</span>
    </div>
    <strong className="admin-kpi-card__value">{value}</strong>
    <span className="admin-kpi-card__detail">{detail}</span>
  </article>
);

const renderQuickActionCard = ({ title, value, text, icon: Icon, path, navigate }) => (
  <button type="button" className="quick-action-card" onClick={() => navigate(path)} key={title}>
    <span className="quick-action-card__icon"><Icon size={18} strokeWidth={2} /></span>
    <span className="quick-action-card__content">
      <strong>{title}</strong>
      <span>{text}</span>
    </span>
    <span className="quick-action-card__value">{value}</span>
    <ChevronRight className="quick-action-card__arrow" size={16} />
  </button>
);

const formatActivityDate = (date) => {
  if (!date) return 'Date indisponible';
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const { stats, supportStats, allCampaigns, pendingCampaigns, users, pledges } = useOutletContext();

  const totalFunds = stats?.totalFunds || 0;
  const platformRevenue = totalFunds * (stats?.commissionRate || 0.05);
  const activeCampaigns = stats?.activeCampaigns || 0;
  const successRate = stats?.successRate || 0;
  const totalUsers = stats?.totalUsers || 0;
  const totalPaidDonations = stats?.totalPaidDonations || 0;
  const totalTarget = stats?.totalTarget || 0;
  const latestPaidDonations = stats?.latestPaidDonations || [];
  const categorySplit = stats?.categorySplit || [];
  const totalCategoryCount = categorySplit.reduce((sum, c) => sum + c.value, 0) || 1;

  const draftCampaigns = (allCampaigns || []).filter((campaign) => campaign.status === 'DRAFT');
  const rejectedCampaigns = (allCampaigns || []).filter((campaign) => campaign.status === 'REJECTED');
  const adminUsers = (users || []).filter((user) => user.role === 'ADMIN');
  const failedPledges = (pledges || []).filter((pledge) => ['FAILED', 'EXPIRED', 'CANCELED'].includes(pledge.status));
  const openSupportTickets = supportStats?.open_in_progress_tickets ?? supportStats?.open_tickets ?? null;
  const unassignedSupportTickets = supportStats?.new_unassigned_tickets ?? null;

  const statusCounts = {
    draft: stats?.draftCampaigns ?? draftCampaigns.length,
    pending: stats?.pendingCampaigns ?? pendingCampaigns.length,
    active: stats?.activeCampaigns ?? activeCampaigns,
    rejected: rejectedCampaigns.length,
    closed: stats?.closedCampaigns ?? allCampaigns.filter((campaign) => campaign.status === 'CLOSED').length,
  };
  const totalStatusCount = Object.values(statusCounts).reduce((sum, value) => sum + Number(value || 0), 0) || 1;

  const dashboardKpis = [
    {
      title: 'Montant traité',
      value: `${totalFunds.toLocaleString('fr-FR')} DT`,
      detail: `${totalPaidDonations} soutien${totalPaidDonations > 1 ? 's' : ''} payé${totalPaidDonations > 1 ? 's' : ''}`,
      icon: CreditCard,
      tone: 'green',
    },
    {
      title: 'Revenus plateforme',
      value: `${platformRevenue.toLocaleString('fr-FR')} DT`,
      detail: `${Math.round((stats?.commissionRate || 0.05) * 100)}% sur paiements vérifiés`,
      icon: BarChart3,
      tone: 'blue',
    },
    {
      title: 'Campagnes actives',
      value: activeCampaigns.toLocaleString('fr-FR'),
      detail: `${statusCounts.pending} en attente de modération`,
      icon: Megaphone,
      tone: 'violet',
    },
    {
      title: 'Utilisateurs',
      value: totalUsers.toLocaleString('fr-FR'),
      detail: `${adminUsers.length} admin${adminUsers.length > 1 ? 's' : ''}`,
      icon: Users,
      tone: 'slate',
    },
    {
      title: 'Taux de succès',
      value: `${successRate}%`,
      detail: `${statusCounts.closed} campagne${statusCounts.closed > 1 ? 's' : ''} clôturée${statusCounts.closed > 1 ? 's' : ''}`,
      icon: ShieldCheck,
      tone: 'amber',
    },
    {
      title: 'Objectifs cumulés',
      value: `${totalTarget.toLocaleString('fr-FR')} DT`,
      detail: 'Campagnes actives et clôturées',
      icon: PiggyBank,
      tone: 'cyan',
    },
  ];

  const campaignStatusCards = [
    { key: 'draft', label: 'Brouillons', value: statusCounts.draft, className: 'brouillon' },
    { key: 'pending', label: 'En attente', value: statusCounts.pending, className: 'attente' },
    { key: 'active', label: 'Actives', value: statusCounts.active, className: 'actif' },
    { key: 'rejected', label: 'Rejetées', value: statusCounts.rejected, className: 'refuse' },
    { key: 'closed', label: 'Clôturées', value: statusCounts.closed, className: 'archive' },
  ];

  const recentActivities = [
    ...latestPaidDonations.map((donation) => ({
      id: `donation-${donation.id}`,
      type: 'Soutien payé',
      title: donation.campaignTitle || 'Campagne inconnue',
      meta: `${donation.donorName || 'Utilisateur inconnu'} · ${Number(donation.amountTnd || 0).toLocaleString('fr-FR')} DT`,
      date: donation.paidAt,
      icon: WalletCards,
    })),
    ...(pendingCampaigns || []).slice(0, 4).map((campaign) => ({
      id: `pending-${campaign.id}`,
      type: 'Campagne à modérer',
      title: campaign.title || 'Sans titre',
      meta: campaign.creator_name || 'Créateur inconnu',
      date: campaign.created_at,
      icon: ShieldCheck,
    })),
    ...(users || []).slice(0, 3).map((user) => ({
      id: `user-${user.id}`,
      type: 'Nouvel utilisateur',
      title: user.name || user.email || 'Utilisateur',
      meta: user.role === 'ADMIN' ? 'Administrateur' : 'Membre',
      date: user.created_at,
      icon: Users,
    })),
  ]
    .filter((activity) => activity.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const dashboardAlerts = [
    {
      id: 'pending-campaigns',
      title: 'Campagnes en attente',
      text: statusCounts.pending > 0
        ? `${statusCounts.pending} campagne${statusCounts.pending > 1 ? 's' : ''} attendent une décision.`
        : 'Aucune campagne en attente de modération.',
      level: statusCounts.pending > 0 ? 'warning' : 'success',
      action: 'Voir',
      path: '/admin/campaigns/pending',
    },
    {
      id: 'support-tickets',
      title: 'Tickets non traités',
      text: openSupportTickets === null
        ? 'Statistiques support indisponibles pour le moment.'
        : `${openSupportTickets} ticket${openSupportTickets > 1 ? 's' : ''} ouvert${openSupportTickets > 1 ? 's' : ''}${unassignedSupportTickets ? `, dont ${unassignedSupportTickets} non assigné${unassignedSupportTickets > 1 ? 's' : ''}` : ''}.`,
      level: openSupportTickets > 0 ? 'warning' : 'success',
      action: 'Ouvrir',
      path: '/admin/support',
    },
    {
      id: 'pledge-issues',
      title: 'Soutiens à vérifier',
      text: failedPledges.length > 0
        ? `${failedPledges.length} soutien${failedPledges.length > 1 ? 's' : ''} échoué${failedPledges.length > 1 ? 's' : ''} ou expiré${failedPledges.length > 1 ? 's' : ''}.`
        : 'Aucun incident de soutien détecté.',
      level: failedPledges.length > 0 ? 'danger' : 'success',
      action: 'Analyser',
      path: '/admin/transactions/pledges',
    },
  ];

  return (
    <div className="fade-in dashboard-overview">
      <section>
        {renderDashboardSectionHeader('Indicateurs clés', 'Les métriques qui résument la santé opérationnelle de Hive.tn.')}
        <div className="admin-widgets">
          {dashboardKpis.slice(0, 6).map(renderKpiCard)}
        </div>
      </section>

      <section>
        {renderDashboardSectionHeader('Actions rapides', 'Accès direct aux files qui demandent le plus souvent une décision admin.')}
        <div className="quick-actions-grid">
          {[
            { title: 'Campagnes en attente', value: statusCounts.pending, text: 'Valider ou refuser les projets', icon: ShieldCheck, path: '/admin/campaigns/pending' },
            { title: 'Utilisateurs', value: totalUsers, text: 'Gérer les comptes et rôles', icon: Users, path: '/admin/users' },
            { title: 'Tickets', value: openSupportTickets ?? '—', text: 'Suivre les demandes support', icon: LifeBuoy, path: '/admin/support' },
            { title: 'Soutiens', value: (pledges || []).length, text: 'Transactions archivées', icon: WalletCards, path: '/admin/transactions/pledges' },
          ].map((item) => renderQuickActionCard({ ...item, navigate }))}
        </div>
      </section>

      <section className="dashboard-main-grid">
        <div className="analytics-card dashboard-panel">
          {renderDashboardSectionHeader('Répartition par secteur', 'Volume de campagnes par catégorie active ou en cours de revue.')}
          <div className="category-bars">
            {categorySplit.length > 0 ? categorySplit.slice(0, 8).map((cat, index) => {
              const percentage = Math.round((cat.value / totalCategoryCount) * 100);
              return (
                <div className="category-bar-item" key={cat.name}>
                  <div className="category-bar-header">
                    <span className="category-bar-label">{cat.name}</span>
                    <span className="category-bar-pct">{percentage}% · {cat.value}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${percentage}%`, '--bar-index': index }}></div>
                  </div>
                </div>
              );
            }) : (
              <p className="dashboard-empty-state">Aucune donnée de catégorie disponible.</p>
            )}
          </div>
        </div>

        <div className="analytics-card dashboard-panel">
          {renderDashboardSectionHeader('Statuts campagnes', 'Lecture rapide du pipeline de modération et publication.')}
          <div className="campaign-status-grid">
            {campaignStatusCards.map((item) => {
              const percentage = Math.round((Number(item.value || 0) / totalStatusCount) * 100);
              return (
                <article className="campaign-status-card" key={item.key}>
                  <div>
                    <span className={`status-badge ${item.className}`}>{item.label}</span>
                    <strong>{Number(item.value || 0).toLocaleString('fr-FR')}</strong>
                  </div>
                  <div className="campaign-status-card__bar">
                    <span style={{ width: `${percentage}%` }}></span>
                  </div>
                  <small>{percentage}% du pipeline</small>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="dashboard-lower-grid">
        <div className="dashboard-panel dashboard-alerts">
          {renderDashboardSectionHeader('Alertes', 'Signaux à traiter avant qu’ils ne deviennent bloquants.')}
          <div className="dashboard-alert-list">
            {dashboardAlerts.map((alert) => (
              <article className={`dashboard-alert dashboard-alert--${alert.level}`} key={alert.id}>
                <span className="dashboard-alert__dot"></span>
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.text}</p>
                </div>
                <button type="button" onClick={() => navigate(alert.path)}>{alert.action}</button>
              </article>
            ))}
          </div>
        </div>

        <div className="dashboard-panel dashboard-activity">
          {renderDashboardSectionHeader('Activité récente', 'Derniers événements détectés à partir des données disponibles.')}
          {recentActivities.length === 0 ? (
            <p className="dashboard-empty-state">Aucune activité récente à afficher.</p>
          ) : (
            <div className="activity-timeline">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <article className="activity-item" key={activity.id}>
                    <span className="activity-item__icon"><Icon size={15} strokeWidth={2} /></span>
                    <div>
                      <div className="activity-item__top">
                        <strong>{activity.type}</strong>
                        <time>{formatActivityDate(activity.date)}</time>
                      </div>
                      <p>{activity.title}</p>
                      <span>{activity.meta}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
