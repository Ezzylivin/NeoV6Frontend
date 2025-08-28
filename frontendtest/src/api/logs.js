// File: src/api/logs.js
import apiClient from './apiClient.js'; // your configured axios instance

export const getLogs = async () => {
  try {
    const response = await apiClient.get('/logs/get');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch logs');
  }
};




export const createLog = async () => {
  try {
    const response = await apiClient.get('/logs/create');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch logs');
  }
};
