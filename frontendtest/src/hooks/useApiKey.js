// src/hooks/useApiKey.js
import { useState } from 'react';
import api from '../api';

export const useApiKey = () => {
  const [saving, setSaving] = useState(false);

  const saveKeys = async (apiKey, apiSecret) => {
    setSaving(true);
    await api.post('/user/keys', { apiKey, apiSecret });
    setSaving(false);
  };

  return { saveKeys, saving };
};
