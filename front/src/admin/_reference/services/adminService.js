import { buildApiUrl } from '../../shared/services/api.js';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
  };
};

// ── Stats ───────────────────────────────────────────
export const fetchDashboardStats = async () => {
  const res = await fetch(buildApiUrl('/api/admin/stats'), { headers: getHeaders() });
  return res.json();
};

export const fetchSupportStats = async () => {
  const res = await fetch(buildApiUrl('/api/admin/support/tickets?page=1&limit=1'), { headers: getHeaders() });
  return res.json();
};

// ── Campaigns ───────────────────────────────────────
export const fetchAllCampaigns = async () => {
  const res = await fetch(buildApiUrl('/api/admin/campaigns'), { headers: getHeaders() });
  return res.json();
};

export const fetchPendingCampaigns = async () => {
  const res = await fetch(buildApiUrl('/api/admin/campaigns/pending'), { headers: getHeaders() });
  return res.json();
};

export const approveCampaign = async (id) => {
  const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}/approve`), {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.json();
};

export const rejectCampaign = async (id, reason) => {
  const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}/reject`), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return res.json();
};

export const deleteCampaign = async (id) => {
  const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}`), {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const updateCampaign = async (id, data) => {
  const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}`), {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const uploadCampaignImage = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}/image`), {
    method: 'POST',
    headers: getAuthHeader(), // no content-type to let browser set boundary
    body: formData,
  });
  return res.json();
};

export const uploadCampaignVideo = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}/video`), {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });
  return res.json();
};

// ── Comments ────────────────────────────────────────
export const fetchCampaignComments = async (campaignId) => {
  const res = await fetch(buildApiUrl(`/api/admin/campaigns/${campaignId}/comments`), { headers: getHeaders() });
  return res.json();
};

export const deleteComment = async (commentId) => {
  const res = await fetch(buildApiUrl(`/api/admin/comments/${commentId}`), {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

// ── Users ───────────────────────────────────────────
export const fetchUsers = async () => {
  const res = await fetch(buildApiUrl('/api/admin/users'), { headers: getHeaders() });
  return res.json();
};

export const deleteUser = async (id) => {
  const res = await fetch(buildApiUrl(`/api/admin/users/${id}`), {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const updateUserRole = async (id, role) => {
  const res = await fetch(buildApiUrl(`/api/admin/users/${id}/role`), {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ role }),
  });
  return res.json();
};

export const updateUser = async (id, data) => {
  const res = await fetch(buildApiUrl(`/api/admin/users/${id}`), {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

// ── Transactions/Pledges ────────────────────────────
export const fetchPledges = async () => {
  const res = await fetch(buildApiUrl('/api/admin/pledges'), { headers: getHeaders() });
  return res.json();
};
