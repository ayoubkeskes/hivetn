import { requestJson } from "../../shared/services/httpClient.js";

export const getSettings = async () => {
  const data = await requestJson("/api/admin/settings");
  return data.settings || {};
};

export const updateSetting = async (key, payload) => {
  const data = await requestJson(`/api/admin/settings/${key}`, {
    method: "PUT",
    body: payload,
  });

  return data.setting;
};
