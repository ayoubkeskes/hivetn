import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import Placeholder from './components/Placeholder';
import { CreditCard, Ban, ShieldCheck, Flag, Users, BarChart3, Settings, ScrollText, Undo2 } from 'lucide-react';

const DashboardHome = lazy(() => import('./pages/DashboardHome'));
// Will create these right now
const AllCampaigns = lazy(() => import('./pages/campaigns/AllCampaigns'));
const PendingCampaigns = lazy(() => import('./pages/campaigns/PendingCampaigns'));
const DraftCampaigns = lazy(() => import('./pages/campaigns/DraftCampaigns'));
const RejectedCampaigns = lazy(() => import('./pages/campaigns/RejectedCampaigns'));
const AllUsers = lazy(() => import('./pages/users/AllUsers'));

// Placeholders for less priority sections
const SupportsPlaceholder = () => <Placeholder icon={CreditCard} title="Soutiens" description="Pledges management." />;
const PaymentsPlaceholder = () => <Placeholder icon={CreditCard} title="Paiements" description="Structure prête pour le suivi détaillé." />;
const RefundsPlaceholder = () => <Placeholder icon={Undo2} title="Remboursements" description="Module réservé aux remboursements futurs." />;
const RolesPlaceholder = () => <Placeholder icon={ShieldCheck} title="Rôles & permissions" description="Base prête pour une gestion plus fine." />;
const TicketsPlaceholder = () => <Placeholder icon={Flag} title="Tickets" description="Espace support." />;
const ReportsPlaceholder = () => <Placeholder icon={Flag} title="Signalements" description="L'espace signalements est prêt." />;
const AnalyticsPlaceholder = () => <Placeholder icon={BarChart3} title="Analytics" description="Espace préparé pour les courbes." />;
const SettingsPlaceholder = () => <Placeholder icon={Settings} title="Paramètres" description="Module prêt pour les paramètres globaux." />;
const LogsPlaceholder = () => <Placeholder icon={ScrollText} title="Logs Admin" description="Espace optionnel pour tracer les actions sensibles." />;
const NotFoundPlaceholder = () => <Placeholder icon={Ban} title="Introuvable" description="Cette section n'existe pas dans l'admin." />;

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        {/* Render lazily loaded components wrapped in Suspense */}
        <Route index element={
          <Suspense fallback={<div>Chargement...</div>}>
            <DashboardHome />
          </Suspense>
        } />
        
        <Route path="campaigns" element={
          <Suspense fallback={<div>Chargement...</div>}>
            <AllCampaigns />
          </Suspense>
        } />
        <Route path="campaigns/pending" element={
          <Suspense fallback={<div>Chargement...</div>}>
            <PendingCampaigns />
          </Suspense>
        } />
        <Route path="campaigns/drafts" element={
          <Suspense fallback={<div>Chargement...</div>}>
            <DraftCampaigns />
          </Suspense>
        } />
        <Route path="campaigns/rejected" element={
          <Suspense fallback={<div>Chargement...</div>}>
            <RejectedCampaigns />
          </Suspense>
        } />

        <Route path="transactions/pledges" element={<SupportsPlaceholder />} />
        <Route path="transactions/payments" element={<PaymentsPlaceholder />} />
        <Route path="transactions/refunds" element={<RefundsPlaceholder />} />

        <Route path="users" element={
          <Suspense fallback={<div>Chargement...</div>}>
            <AllUsers />
          </Suspense>
        } />
        <Route path="users/roles" element={<RolesPlaceholder />} />

        <Route path="support" element={<TicketsPlaceholder />} />
        <Route path="support/reports" element={<ReportsPlaceholder />} />

        <Route path="analytics" element={<AnalyticsPlaceholder />} />
        <Route path="settings" element={<SettingsPlaceholder />} />
        <Route path="logs" element={<LogsPlaceholder />} />

        <Route path="*" element={<NotFoundPlaceholder />} />
      </Route>
    </Routes>
  );
}
