// File: src/api/strategy.js
import api from "./apiClient.js";

/** Fetch all strategies for the authenticated user */
export const fetchAll = async () => {
  const { data } = await api.get("/strategies");
  return data; // Backend returns an array of strategies directly
};

/** Create or update a strategy */
export const upsert = async (strategyData) => {
  const { data } = await api.post("/strategies", strategyData);
  return data;
};

/** Delete a strategy by its ID */
export const remove = async (strategyId) => {
  const { data } = await api.delete(`/strategies/${strategyId}`);
  return data;
};
