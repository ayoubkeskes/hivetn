import { requestJson } from "../../shared/services/httpClient.js";

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value).trim());
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

export const fetchAdminLogs = async (params = {}) => {
  const data = await requestJson(`/api/admin/logs${buildQueryString(params)}`);
  return {
    logs: data.logs || [],
    facets: data.facets || { action_types: [], entity_types: [] },
    pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
};

export const fetchAdminLogById = async (id) => {
  const data = await requestJson(`/api/admin/logs/${id}`);
  return data.log;
};
