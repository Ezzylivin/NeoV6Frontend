import api from "./apiClient.js";

// Fetch all strategies for the current user
export const fetchAll = async () => {
  const { data } = await api.get("/strategy");
  return data;
};

// Create a new strategy
export const create = async (strategyData) => {
  const { data } = await api.post("/strategy", strategyData);
  return data;
};

// Update a strategy by code (not _id)
export const update = async (code, strategyData) => {
  const { data } = await api.put(`/strategy/${code}`, strategyData);
  return data;
};

// Delete a strategy by code (not _id)
export const remove = async (code) => {
  const { data } = await api.delete(`/strategy/${code}`);
  return data;
};
