import { useState, useCallback } from 'react';
import * as adminService from '../services/adminService';

export const useCampaigns = () => {
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [pendingCampaigns, setPendingCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [allRes, pendingRes] = await Promise.all([
        adminService.fetchAllCampaigns(),
        adminService.fetchPendingCampaigns(),
      ]);

      if (allRes.success) {
        setAllCampaigns(allRes.campaigns || []);
      } else {
        setError(allRes.message || 'Erreur lors du chargement des campagnes.');
      }

      if (pendingRes.success) {
        setPendingCampaigns(pendingRes.campaigns || []);
      }
    } catch (err) {
      setError('Impossible de charger les données des campagnes.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    allCampaigns,
    setAllCampaigns,
    pendingCampaigns,
    setPendingCampaigns,
    loading,
    error,
    fetchCampaigns
  };
};
