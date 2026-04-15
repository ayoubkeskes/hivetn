import React, { useEffect, Component } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useCampaigns } from './hooks/useCampaigns';
import { useUsers } from './hooks/useUsers';
import { useTransactions } from './hooks/useTransactions';
import { useDashboardStats } from './hooks/useDashboardStats';
import '../AdminDashboard.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'white', zIndex: 9999, height: '100vh', overflow: 'auto' }}>
          <h1>🛑 Erreur Critique du Dashboard Admin 🛑</h1>
          <p style={{fontWeight: 'bold'}}>Veuillez copier/coller ces lignes à l'IA pour corriger le problème :</p>
          <pre style={{border: '1px solid red', padding: '10px'}}>{this.state.error?.toString()}</pre>
          <pre>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminLayoutWrapper() {
  return (
    <ErrorBoundary>
      <AdminLayout />
    </ErrorBoundary>
  )
}

function AdminLayout() {
  const navigate = useNavigate();
  const { allCampaigns, pendingCampaigns, fetchCampaigns, setAllCampaigns, setPendingCampaigns, loading: loadingCamps, error: errorCamps } = useCampaigns();
  const { users, setUsers, fetchUsers, loading: loadingUsers, error: errorUsers } = useUsers();
  const { pledges, setPledges, fetchTransactions, loading: loadingTxs, error: errorTxs } = useTransactions();
  const { stats, supportStats, fetchStats, loading: loadingStats, error: errorStats } = useDashboardStats();

  useEffect(() => {
    // Fetch all needed stats on mount, identical to old behavior
    fetchStats();
    fetchCampaigns();
    fetchTransactions();
    fetchUsers();
  }, [fetchStats, fetchCampaigns, fetchTransactions, fetchUsers]);

  const loading = loadingCamps || loadingUsers || loadingTxs || loadingStats;
  const error = errorCamps || errorUsers || errorTxs || errorStats;

  console.log('[AdminLayout] State:', { loading, loadingCamps, loadingUsers, loadingTxs, loadingStats, error, stats, allCampaigns: allCampaigns?.length, users: users?.length, pledges: pledges?.length });

  const handleNavigateHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#1a1a2e', color: '#ffffff', fontSize: '22px', fontWeight: 'bold' }}>
        <p>⏳ Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', width: '100vw', height: '100vh', background: '#1a1a2e', color: '#ff6b6b', fontSize: '18px' }}>
        <p>❌ {error}</p>
        <button style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={handleNavigateHome}>Retour à l'accueil</button>
      </div>
    );
  }

  const contextData = {
    stats,
    supportStats,
    allCampaigns,
    pendingCampaigns,
    users,
    pledges,
    setAllCampaigns,
    setPendingCampaigns,
    setUsers,
    setPledges,
    refetchStats: fetchStats,
    refetchCampaigns: fetchCampaigns,
    refetchUsers: fetchUsers,
    refetchTransactions: fetchTransactions
  };

  return (
    <div className="admin-wrapper">
      <Sidebar contextData={contextData} onNavigateHome={handleNavigateHome} />
      
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <div>
              <p className="admin-header-kicker">Back-office Hive.tn</p>
              <h1 className="admin-header-title">Dashboard Admin</h1>
              <p className="admin-header-subtitle">
                Vue consolidée des campagnes, transactions et opérations à traiter.
              </p>
            </div>
          </div>
          <div className="admin-header-actions">
            <div className="admin-date">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <button className="btn-primary" onClick={handleNavigateHome}>Quitter l'Admin</button>
          </div>
        </header>

        <section className="admin-content">
          <Outlet context={contextData} />
        </section>
      </main>
    </div>
  );
}
