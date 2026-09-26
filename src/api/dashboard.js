import api from "./apiClient";
import { CRYPTO_API } from "../config/api.js";

// 🚀 Dashboard Data Service
// Centralizes all data fetching for the Dashboard page

export const dashboardApi = {
  // 1. Get list of available symbols (e.g., BTC, ETH, SOL)
  getSymbols: async () => {
    try {
      const response = await api.get("/data/symbols");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch symbols:", error);
      return []; // Return empty array on failure
    }
  },

  // 2. Get live candle data for a specific symbol
  getCandles: async (symbol, timeframe = "1h", limit = 300) => {
    try {
      const response = await api.get("/data/candles", {
        params: { symbol, timeframe, limit }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch candles for ${symbol}:`, error);
      return [];
    }
  },

  // 3. Get Macro Data (CPI, Fed Rate) from your legacy source
  // We keep this separate because it points to a different URL than your main backend
  getMacroData: async () => {
    try {
      const response = await fetch(`${CRYPTO_API}/data`);
      if (!response.ok) throw new Error('Macro API failure');
      
      const text = await response.text();
      // Fix the "NaN" JSON error from the source
      const cleanText = text.replace(/NaN/g, 'null');
      return JSON.parse(cleanText);
    } catch (error) {
      console.error("Failed to fetch macro data:", error);
      return {};
    }
  }
};
