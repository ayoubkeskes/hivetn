import { useState, useCallback } from 'react';
import * as adminService from '../services/adminService';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.fetchUsers();
      if (res.success) {
        setUsers(res.users || []);
      } else {
        setError(res.message || 'Erreur lors du chargement des utilisateurs.');
      }
    } catch (err) {
      setError('Impossible de charger les données des utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    setUsers,
    loading,
    error,
    fetchUsers
  };
};
