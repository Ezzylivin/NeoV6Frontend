// File: src/services/backtestApiService.js
//
// UPGRADED:
// - All logic now points *directly* to your Python Flask server (ml_server_api.py).
// - Removed all old, obsolete logic for 'Hybrid' mode, 'predictions', etc.
// - This file now has ONE job: send the UI config to the Python server and return the result.

import axios from "axios";
import https from 'https_proxy_agent'; // 🚀 Use https_proxy_agent for browser-compatible self-signed certs

// --- Configuration ---
// 🚀 This is the ONLY server we talk to for backtests.
const ML_SERVER_URL = "https://74.208.28.77:8001"; 

// 🚀 Create an httpsAgent to tell axios to ignore self-signed certificate errors.
// This is necessary for local/dev HTTPS.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * A consistent error handler for all API calls.
 */
const handleError = (error, functionName) => {
  console.error(`Error in ${functionName}():`, error.message);
  let message = error.message;

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('Error Response Data:', error.response.data);
    // The error from our Python server is in `error.response.data.error`
    message = error.response?.data?.error || error.response?.data?.message || `Server responded with ${error.response.status}`;
  } else if (error.request) {
    // The request was made but no response was received
    console.error('Error Request Data:', error.request);
    message = "The server did not respond. Is the ML server (ml_server_api.py) running?";
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Error Config:', error.config);
  }

  throw new Error(message);
};

// --- Main API Functions ---

/**
 * Fetches initial options for backtesting (strategies, symbols, timeframes, models).
 * This data now comes from two places: our Python server and a static list.
 */
export async function fetchOptions() {
  try {
    // 1. Get models from our Python server
    const response = await axios.get(`${ML_SERVER_URL}/api/ml/models`, { httpsAgent });
    const models = response.data || [];

    // 2. Define symbols and timeframes statically
    // This MUST match your train_models.py script
    const symbols = [
        'BTC/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD', 'ADA/USD',
        'DOGE/USD', 'SUI/USD', 'SHIB/USD', 'PEPE/USD'
    ];
    const timeframes = ['30m', '1h', '4h', '1d', '1w'];

    // 3. Define TA strategies statically
    // This MUST match the `generate_ta_signals` function in ml_server_api.py
    const strategies = [
      { code: "sma_crossover", name: "SMA Crossover" },
      { code: "rsi_divergence", name: "RSI Oversold/Overbought" },
      { code: "macd_crossover", name: "MACD Crossover" },
      { code: "stochastic_crossover", name: "Stochastic Crossover" },
      { code: "cci_oversold", name: "CCI Oversold/Overbought" },
      { code: "bollinger_bands", name: "Bollinger Bands Reversal" },
      { code: "ichimoku_cloud", name: "Ichimoku Cloud Trend" }
    ];

    return { strategies, symbols, timeframes, models };
    
  } catch (error) {
    handleError(error, "fetchOptions");
  }
}

/**
 * 🚀 THIS IS THE ONLY BACKTEST FUNCTION YOU NOW NEED.
 * It sends the config to the Python server, which handles ALL logic
 * (TA, ML, or Hybrid) based on the 'mlMode' in the payload.
 *
 * @param {object} payload - The complete backtest configuration from the UI.
 */
export async function runUniversalBacktest(payload) {
  if (!payload) throw new Error("Backtest payload is required.");

  // Simple validation
  if (!payload.symbol || !payload.timeframe || !payload.startDate || !payload.endDate) {
    throw new Error("Missing required fields (symbol, timeframe, startDate, endDate).");
  }
  
  // Validate mode-specific requirements
  if (payload.mlMode === 'off' && !payload.code) {
    throw new Error("A TA Strategy 'code' is required for 'TA Only' mode.");
  }
  if (payload.mlMode === 'on' && !payload.mlModel) {
    throw new Error("An 'mlModel' is required for 'ML Only' mode.");
  }
  if (payload.mlMode === 'predictions' && (!payload.code || !payload.mlModel)) {
    throw new Error("Both a TA 'code' and an 'mlModel' are required for Hybrid mode.");
  }

  try {
    // 🚀 Calls the single, powerful endpoint on your Python server
    const response = await axios.post(
      `${ML_SERVER_URL}/api/ml/run-backtest-on`, 
      payload, 
      { 
        httpsAgent: httpsAgent,
        timeout: 1800000 // 30 minute timeout for very long backtests
      }
    );
    
    // The Python server sends back the complete, final result
    return response.data;
    
  } catch (error) {
    handleError(error, "runUniversalBacktest");
  }
}
