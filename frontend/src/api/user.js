// File: src/api/user.js
import api from './index';

export const saveApiKeys = async (apiKey, apiSecret) => {
  const response = await api.post('/user/keys', { apiKey, apiSecret });
  return response.data;
};
