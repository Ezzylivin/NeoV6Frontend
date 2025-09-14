import api from "./apiClient.js";

export const fetchAll = async () => {
  const { data } = await api.get("/strategy");
  return data;
};

export const create = async (strategyData) => {
  const { data } = await api.post("/strategy", strategyData);
  return data;
};

export const update = async (id, strategyData) => {
  const { data } = await api.put(`/strategy/${id}`, strategyData);
  return data;
};

export const remove = async (strategyId) => {
  const { data } = await api.delete(`/strategy/${strategyId}`);
  return data;
};
