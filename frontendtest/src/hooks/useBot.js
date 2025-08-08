import { useState, useCallback } from 'react';

import { startBot, stopBot, getBotStatus } from '../api/bot';

export const useBot = () => {
  
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStartBot = useCallback(async (symbol, amount, timeframes) => {
    try {
      setLoading(true);
      setError(null);
      const result = await startBot(token, symbol, amount, timeframes);
      setStatus(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to start bot');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStopBot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await stopBot(token);
      setStatus(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to stop bot');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBotStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getBotStatus(token);
      setStatus(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to get bot status');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    startBot: handleStartBot,
    stopBot: handleStopBot,
    getBotStatus: fetchBotStatus,
    status,
    loading,
    error,
  };
};
