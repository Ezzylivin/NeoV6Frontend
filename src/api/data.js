// File: src/api/data.js
import apiClient from "./apiClient.js";

/**
 * Fetches live prices for a list of symbols.
 * @param {Array<string>} symbols - e.g., ['BTCUSDT', 'ETHUSDT']
 */
export const fetchLivePrices = async (symbols) => {
  const { data } = await apiClient.get(`/data/live?symbols=${symbols.join(',')}`);
  return data;
};

/**
 * Fetches candlestick data for a single symbol.
 * @param {object} params - { symbol, timeframe, startDate, endDate }
 */
export const fetchCandles = async ({ symbol, timeframe }) => {
    const { data } = await apiClient.get(`/data/candles?symbol=${symbol}&timeframe=${timeframe}`);
    return data;
};
