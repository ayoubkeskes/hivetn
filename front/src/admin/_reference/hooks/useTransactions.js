import { useState, useCallback } from 'react';
import * as adminService from '../services/adminService';

export const useTransactions = () => {
  const [pledges, setPledges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.fetchPledges();
      if (res.success) {
        setPledges(res.pledges || []);
      } else {
        setError(res.message || 'Erreur lors du chargement des transactions.');
      }
    } catch (err) {
      setError('Impossible de charger les données des transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    pledges,
    setPledges,
    loading,
    error,
    fetchTransactions
  };
};
