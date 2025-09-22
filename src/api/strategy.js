// File: src/api/strategyApi.js
import api from "./apiClient.js";

// --- Single Strategy APIs ---

// Fetch all strategies for the current user
export const fetchAll = async () => {
  try {
    const { data } = await api.get("/strategy");
    return data;
  } catch (err) {
    console.error("Failed to fetch strategies:", err);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// Create a new strategy
export const create = async (strategyData) => {
  try {
    const { data } = await api.post("/strategy", strategyData);
    return data;
  } catch (err) {
    console.error("Failed to create strategy:", err);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// Update a strategy by code
export const update = async (code, strategyData) => {
  try {
    const { data } = await api.put(`/strategy/${code}`, strategyData);
    return data;
  } catch (err) {
    console.error(`Failed to update strategy ${code}:`, err);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// Delete a strategy by code
export const remove = async (code) => {
  try {
    const { data } = await api.delete(`/strategy/${code}`);
    return data;
  } catch (err) {
    console.error(`Failed to delete strategy ${code}:`, err);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// --- Combo Strategy APIs ---

// Fetch all combo strategies for the current user
export const fetchAllCombo = async () => {
  try {
    const { data } = await api.get("/strategy/combo");
    return data;
  } catch (err) {
    console.error("Failed to fetch combo strategies:", err);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// Create a new combo strategy
export const createCombo = async (comboData) => {
  try {
    const { data } = await api.post("/strategy/combo", comboData);
    return data;
  } catch (err) {
    console.error("Failed to create combo strategy:", err);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// Update a combo strategy by ID
export const updateCombo = async (id, comboData) => {
  try {
    const { data } = await api.put(`/strategy/combo/${id}`, comboData);
    return data;
  } catch (err) {
    console.error(`Failed to update combo strategy ${id}:`, err);
    throw new Error(err.response?.data?.message || err.message);
  }
};

// Delete a combo strategy by ID
export const removeCombo = async (id) => {
  try {
    const { data } = await api.delete(`/strategy/combo/${id}`);
    return data;
  } catch (err) {
    console.error(`Failed to delete combo strategy ${id}:`, err);
    throw new Error(err.response?.data?.message || err.message);
  }
};
