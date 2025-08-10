// File: src/api/logs.js
import api from './apiClient.js'; // your configured axios instance

export const getLogs = async () => {
  try {
    const response = await apiClient.get('/api/log/get');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch logs');
  }
};




export const createLog = async () => {
  try {
    const response = await apiClient.get('/api/log/create');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch logs');
  }
};
