// File: src/api/data.js
import apiClient from "./apiClient.js";

/**
 * Fetches live prices for a list of symbols.
 */
export const fetchLivePrices = async (symbols) => {
  const { data } = await apiClient.get(`/data/live?symbols=${symbols.join(',')}`);
  return data;
};

/**
 * Fetches candlestick data for a single symbol.
 */
export const fetchCandles = async ({ symbol, timeframe }) => {
    const { data } = await apiClient.get(`/data/candles?symbol=${symbol}&timeframe=${timeframe}`);
    
    // --- THIS IS THE FIX ---
    // The backend sends back an object like { success: true, data: [...] }.
    // We need to return the 'data' property, which contains the actual array.
    return data.data; 
};
