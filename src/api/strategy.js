import api from "./apiClient.js";

/** Fetch all strategies for the authenticated user */
export const fetchAll = async () => {
  // FIX: Changed from /strategies to /strategy
  const { data } = await api.get("/strategy");
  return data;
};

/** Create or update a strategy */
export const upsert = async (strategyData) => {
  // FIX: Changed from /strategies to /strategy
  const { data } = await api.post("/strategy", strategyData);
  return data;
};

/** Delete a strategy by its ID */
export const remove = async (strategyId) => {
  // FIX: Changed from /strategies to /strategy
  const { data } = await api.delete(`/strategy/${strategyId}`);
  return data;
};
