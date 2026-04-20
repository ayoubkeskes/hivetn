import { useState, useCallback } from 'react';
import * as adminService from '../services/adminService';

export const useDashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [supportStats, setSupportStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, supportRes] = await Promise.all([
        adminService.fetchDashboardStats(),
        adminService.fetchSupportStats()
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats || null);
      } else {
        setError(statsRes.message || 'Erreur lors du chargement des statistiques.');
      }

      if (supportRes.success) {
        setSupportStats(supportRes.summary || supportRes.stats || null);
      }
    } catch (err) {
      setError('Impossible de charger les statistiques du tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    supportStats,
    loading,
    error,
    fetchStats
  };
};
