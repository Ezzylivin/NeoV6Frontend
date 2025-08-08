// File: src/api/logs.js
import api from './apiClient'; // your configured axios instance

export const getLogs = async () => {
  try {
    const response = await api.get('/logs');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch logs');
  }
};




export const createLog = async () => {
  try {
    const response = await api.get('/logs');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch logs');
  }
};
