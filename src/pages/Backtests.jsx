// File: src/pages/Backtests.jsx
//
// FINAL VERSION: Includes all fixes (Strategy Mapping, Chart Replay, ML Model Selection, CSS Dims)
// 🪵 DEBUG: ADDED CONSOLE LOGS FOR FULL DATA TRACING

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartReplay } from "../components/ChartReplay.jsx"; // 🚀 CHART IMPORT
import "../components/ChartReplay.css"; // 🚀 CHART CSS IMPORT
import "./Backtests.css"; // 🚀 NOW INCLUDES THE .chart HEIGHT FIX

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

// Helper functions (formatDate, formatChartDate, getDefaultDates, getMLStartDate)
// ... (omitted for brevity, no logs needed here) ...
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};
const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};
const getMLStartDate = () => {
    return '2017-01-01'; 
}
const defaultFilterParams = {
    SL: 5.0,
    TP: 10.0,
    minAtrPct: 0, 
    trendFilterPeriod: 200, 
};
const initialFormData = {
  code: "", 
  symbol: "",
  timeframe: "",
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  params: { ...defaultFilterParams },
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off", 
  mlModel: "", 
  mlThreshold: 0.5,
  mlHorizon: 1
};
const initialComboData = {
  strategies: [ 
    { code: "", params: { SL: 5.0, TP: 10.0 } },
    { code: "", params: { SL: 5.0, TP: 10.0 } }
  ],
  params: { 
    minAtrPct: 0,
    trendFilterPeriod: 200,
    hybridMode: 'AND'
  },
  symbol: "",
  timeframe: "", 
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off",
  mlModel: "",
  mlThreshold: 0.5,
  mlHorizon: 1
};
// ... (STRATEGY_TYPE_TO_CODE_MAP omitted) ...
const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover",
  "RSI": "rsi_divergence",
  "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover",
  "CCI": "cci_oversold",
  "Bollinger Bands": "bollinger_bands",
  "Ichimoku Cloud": "ichimoku_cloud",
  "ATR": "atr_signal",
  "On-Balance Volume": "obv_signal",
  "Parabolic SAR": "psar_signal"
};

// --- Child Components (MetricsDisplay, CommonBacktestInputs, ComboStrategyCard) ---

// Displays performance metrics (unchanged)
const MetricsDisplay = ({ metrics }) => {
  // 🪵 DEBUG: [State & Props] Log props for MetricsDisplay
  console.log("🪵 DEBUG: MetricsDisplay [Props]:", { metrics });
  if (!metrics) return <div className="metrics-grid-loading">Calculating metrics...</div>;
  const formatValue = (value, format) => {
      if (typeof value !== "number" || isNaN(value)) {
        // 🪵 DEBUG: [Errors & Status] Log any invalid metric value
        console.warn(`🪵 DEBUG: MetricsDisplay formatValue received invalid number:`, { value, format });
        return "N/A";
      }
      switch (format) {
          case 'currency': return `$${value.toFixed(2)}`;
          case 'percent': return `${value.toFixed(2)}%`;
          case 'number': return value.toFixed(2);
          default: return value;
      }
  };
  // ... (rest of MetricsDisplay) ...
  const items = [
    { label: "Total Return", value: metrics.totalReturn, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' },
    { label: "Win Rate", value: metrics.winRate, format: 'percent' },
    { label: "Total Trades", value: metrics.totalTrades, format: null },
    { label: "Avg. Win", value: metrics.averageWin, format: 'currency' },
    { label: "Avg. Loss", value: metrics.averageLoss, format: 'currency' },
    { label: "Final Balance", value: metrics.finalBalance, format: 'currency' }
  ];
  return (
    <div className="metrics-grid">
      {items.map(m => (
        <div key={m.label} className="metric-item">
          <span className="metric-label">{m.label}</span>
          <span className="metric-value">{formatValue(m.value, m.format)}</span>
        </div>
      ))}
    </div>
  );
};

// Common input fields (with ML filtering logic)
const CommonBacktestInputs = ({ data, onChange, options, availableModelData, isCombo = false }) => {
    // 🪵 DEBUG: [State & Props] Log props for CommonBacktestInputs
    console.log("🪵 DEBUG: CommonBacktestInputs [Props]:", { data, options, availableModelData, isCombo });

    const symbolOptions = options.symbolOptions || [];
    const timeframeOptions = options.timeframeOptions || [];
    const allModelOptions = options.modelOptions || []; 

    const handleParamChange = (e) => {
        const { name, value, type } = e.target;
        // 🪵 DEBUG: [User Actions] Log common param change
        console.log("🪵 DEBUG: CommonBacktestInputs [handleParamChange]:", { name, value, type });
        const val = type === 'number' && value !== '' ? parseFloat(value) : value;
        const syntheticEvent = { target: { name: `param_${name}`, value: val, type: type } };
        onChange(syntheticEvent);
    };
    const handleGlobalChange = (e) => {
        // 🪵 DEBUG: [User Actions] Log common global change
        console.log("🪵 DEBUG: CommonBacktestInputs [handleGlobalChange]:", { name: e.target.name, value: e.target.value, type: e.target.type });
        onChange(e);
    };

    const params = data.params || {};

    // Processed Dropdown Lists for ML availability indicators
    const processedSymbolOptions = useMemo(() => {
        // 🪵 DEBUG: [Data Flow & Memoization] Log processing of symbol options
        console.log("🪵 DEBUG: CommonBacktestInputs [Memo]: Processing symbol options...", { mlMode: data.mlMode, availableSymbols: availableModelData.availableSymbols });
        if (data.mlMode === 'off') {
            return symbolOptions.map(s => ({ value: s, name: s, isAvailable: true }));
        }
        const { availableSymbols } = availableModelData;
        const sortedSymbols = [...symbolOptions].sort((a, b) => {
            const aHas = availableSymbols.has(a);
            const bHas = availableSymbols.has(b);
            return (bHas ? 1 : 0) - (aHas ? 1 : 0);
        });
        return sortedSymbols.map(s => {
            const isAvailable = availableSymbols.has(s);
            return {
                value: s,
                name: isAvailable ? s : `${s} (No models)`,
                isAvailable: isAvailable
            };
        });
    }, [data.mlMode, symbolOptions, availableModelData]);

    const processedTimeframeOptions = useMemo(() => {
        // 🪵 DEBUG: [Data Flow & Memoization] Log processing of timeframe options
        console.log("🪵 DEBUG: CommonBacktestInputs [Memo]: Processing timeframe options...", { mlMode: data.mlMode, symbol: data.symbol, lookup: availableModelData.lookup });
        if (data.mlMode === 'off') {
            return timeframeOptions.map(t => ({ value: t, name: t, isAvailable: true }));
        }
        if (!data.symbol) {
             return timeframeOptions.map(t => ({
                value: t,
                name: `${t} (Select Symbol)`,
                isAvailable: false
             }));
        }
        const { lookup } = availableModelData;
        const sortedTimeframes = [...timeframeOptions].sort((a, b) => {
            const aHas = lookup.has(`${data.symbol}_${a}`);
            const bHas = lookup.has(`${data.symbol}_${b}`);
            return (bHas ? 1 : 0) - (aHas ? 1 : 0);
        });
        return sortedTimeframes.map(t => {
            const isAvailable = lookup.has(`${data.symbol}_${t}`);
            return {
                value: t,
                name: isAvailable ? t : `${t} (No model)`,
                isAvailable: isAvailable
            };
        });
    }, [data.mlMode, data.symbol, timeframeOptions, availableModelData]);

    return (
        <>
          {/* ... (JSX for CommonBacktestInputs) ... */}
         {/* ... (omitted for brevity) ... */}
            {/* UPDATED Symbol Dropdown */}
            <label>Symbol:
                <select 
                    name="symbol" 
                    value={data.symbol} 
                    onChange={handleGlobalChange} 
                    disabled={!processedSymbolOptions.length}
                    title="Select the market (e.g., BTC-USD) to run the backtest on."
                >
                    <option value="">-- Select Symbol --</option>
                    {processedSymbolOptions.map(s => (
                        <option 
                            key={s.value} 
                            value={s.value} 
                            disabled={data.mlMode !== 'off' && !s.isAvailable} 
                            style={{ color: (data.mlMode !== 'off' && !s.isAvailable) ? '#888' : 'white' }}
                        >
                            {s.name}
                        </option>
                    ))}
                </select>
            </label>

            {/* UPDATED Timeframe Dropdown */}
            <label>Timeframe:
                <select 
                    name="timeframe" 
              _a`             value={data.timeframe} 
                    onChange={handleGlobalChange} 
                    disabled={!processedTimeframeOptions.length}
                    title="Select the chart timeframe (e.g., 1h, 4h, 1d) for the backtest."
                >
                    <option value="">-- Select Timeframe --</option>
                    {processedTimeframeOptions.map(t => (
                        <option 
                            key={t.value} 
                            value={t.value} 
                            disabled={data.mlMode !== 'off' && !t.isAvailable} 
                            style={{ color: (data.mlMode !== 'off' && !t.isAvailable) ? '#888' : 'white' }}
                        >
                            {t.name}
                        </option>
                    ))}
                </select>
        _   </label>
        {/* ... (rest of common inputs JSX) ... */}
        </>
    );
};

// Combo Strategy Card Component (unchanged)
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  // 🪵 DEBUG: [State & Props] Log props for ComboStrategyCard
  console.log(`🪵 DEBUG: ComboStrategyCard #${idx} [Props]:`, { config, strategies, disableRemove });
  const handleChange = (e) => onChange(e, idx);
  return (
    <div className="combo-card">
      {/* ... (JSX for ComboStrategyCard) ... */}
      <div className="combo-card-header"><strong>Strategy #{idx + 1}</strong>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)} className="remove-btn">✕</button>}
      </div>
      <div className="combo-card-body">
        <label>Strategy:
          <select 
            name="code" 
            value={config.code} 
            onChange={handleChange} 
            disabled={!strategies.length}
            title="Select the TA strategy for this card in the combo."
          >
            <option value="">-- Select --</option>
            {strategies.length ? strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option disabled>Loading...</option>}
          </select>
        </label>
        <label>Stop Loss (%): 
            <input 
                type="number" 
                name="param_SL" 
                value={config.params?.SL ?? 5.0} 
                onChange={handleChange} 
                step="0.1" 
                min="0" 
                title="Override the global Stop Loss % for this specific strategy."
            />
        </label>
        <label>Take Profit (%): 
            <input 
                type="number" 
                name="param_TP" 
                value={config.params?.TP ?? 10.0} 
                onChange={handleChange} 
                step="0.1" 
                min="0" 
                title="Override the global Take Profit % for this specific strategy."
            />
        </label>
      </div>
    </div>
  );
};


// --- Main Page Component ---
export default function Backtests() {
  // 🪵 DEBUG: [Data Flow & Memoization] Log component render & initial hook state
  console.log("🪵 DEBUG: Backtests.jsx [RENDER START]");
  const { state, runNewBacktest, runComboBacktest, getPastBacktests } = useBacktest(); // Destructure getPastBacktests
  const { loading = 'initial', error = null, options = {} } = state || {};

  // 🪵 DEBUG: [Data Flow & Memoization] Log hook state changes
  useEffect(() => {
    console.log("🪵 DEBUG: Backtests.jsx [Hook State Change]:", { state });
    if (error) {
      console.error("🪵 DEBUG: Backtests.jsx [Hook ERROR]:", error);
    }
  }, [state, error]); // Log when state (and error) changes

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');

  // NEW FIX: This hook transforms the raw strategies from the DB to Python-compatible codes
  const strategyOptions = useMemo(() => {
    if (!options?.strategies) return [];
    
    const mappedStrategies = options.strategies.map(strategy => {
      const strategyTypeKey = strategy.params?.strategyType?.trim();
      const pythonCode = STRATEGY_TYPE_TO_CODE_MAP[strategyTypeKey];
      
      if (pythonCode) {
        return {
          ...strategy,
          code: pythonCode // <-- This is the Python-compatible code
        };
      }
      
      // 🪵 DEBUG: [Errors & Status] Warn about unmapped strategies
      console.warn(`🪵 DEBUG: [Unmapped Strategy]: ${strategy.name} (type: ${strategy.params?.strategyType}). It will not be available in dropdowns.`);
      return null; 
    }).filter(Boolean); // filter(Boolean) removes all null entries
    
    // 🪵 DEBUG: [Data Flow & Memoization] Log strategy options processing
    console.log("🪵 DEBUG: Backtests.jsx [Memo]: Processing strategyOptions...", { raw: options?.strategies, mapped: mappedStrategies });
    return mappedStrategies;
    
  }, [options?.strategies]);
  
  // Memoize other options
  const symbolOptions = useMemo(() => options?.symbols || [], [options?.symbols]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options?.timeframes]);
  
  // 1. Helper to give timeframes a sortable "weight"
  const timeframeWeights = {
      '30m': 1,
      '1h': 2,
      '4h': 3,
      '1d': 4,
      '1w': 5,
  };
  
  // 2. Parse and Sort the Model List (Full List)
  const modelOptions = useMemo(() => {
      if (!options?.models) return [];

      // Parse each model name
      const parsedModels = options.models.map(model => {
          const parts = model.id.split('_');
          let symbolBase = 'zzz'; 
          let timeframe = 'zzz';
          let tfWeight = 99;
          let modelName = model.name;
          
          if (parts.length >= 3) {
              symbolBase = parts[0]; 
              timeframe = parts[1];  
              tfWeight = timeframeWeights[timeframe] || 99;
              modelName = parts.slice(2).join('_');
          }
          return { ...model, symbolBase, timeframe, tfWeight, modelName };
      });
      
      // Sort the parsed list
      parsedModels.sort((a, b) => {
          if (a.symbolBase < b.symbolBase) return -1;
          if (a.symbolBase > b.symbolBase) return 1;
          if (a.tfWeight < b.tfWeight) return -1;
          if (a.tfWeight > b.tfWeight) return 1;
          if (a.modelName < b.modelName) return -1;
          if (a.modelName > b.modelName) return 1;
          return 0;
      });
      
      // 🪵 DEBUG: [Data Flow & Memoization] Log model options processing
      console.log("🪵 DEBUG: Backtests.jsx [Memo]: Processing modelOptions...", { raw: options?.models, parsed: parsedModels });
      return parsedModels;
  }, [options?.models]);

  // Data structure to quickly check which symbol/timeframe combinations have models
  const availableModelData = useMemo(() => {
    const availableSymbols = new Set();
    const availableTimeframes = new Set();
    const lookup = new Set(); // e.g., 'BTC-USD_1h'

    if (!modelOptions.length) {
        // 🪵 DEBUG: [Data Flow & Memoization] Log early exit for availableModelData
        console.log("🪵 DEBUG: Backtests.jsx [Memo]: availableModelData (no models found)");
        return { availableSymbols, availableTimeframes, lookup };
    }

    for (const model of modelOptions) {
        const { symbolBase, timeframe } = model;
        const fullSymbol = `${symbolBase.toUpperCase()}-USD`; 
        
        availableSymbols.add(fullSymbol);
        availableTimeframes.add(timeframe);
        lookup.add(`${fullSymbol}_${timeframe}`);
    }
    
    // 🪵 DEBUG: [Data Flow & Memoization] Log available model data
    const result = { availableSymbols, availableTimeframes, lookup };
    console.log("🪵 DEBUG: Backtests.jsx [Memo]: Processing availableModelData...", result);
    return result;
  }, [modelOptions]); 


  // --- Effects to set default form values when options load ---
  useEffect(() => {
    // Set default TA strategy
    if (strategyOptions.length > 0 && !formData.code) {
      // 🪵 DEBUG: [Data Flow & Memoization] Log setting default single strategy
      console.log("🪵 DEBUG: Backtests.jsx [Effect]: Setting default TA strategy (Single Form).");
      const defaultStrategy = strategyOptions[0];
      setFormData(prev => ({ ...prev, code: defaultStrategy.code, params: { ...defaultStrategy.params, ...prev.params } }));
    }
  }, [strategyOptions, formData.code]); 

  useEffect(() => {
    // Set default TA strategies for combo
    if (strategyOptions.length > 0 && comboData.strategies.every(c => !c.code)) {
      // 🪵 DEBUG: [Data Flow & Memoization] Log setting default combo strategies
      console.log("🪵 DEBUG: Backtests.jsx [Effect]: Setting default TA strategies (Combo Form).");
      const newConfigs = comboData.strategies.map((config, index) => {
        const strategy = strategyOptions[index] || strategyOptions[0];
        return { code: strategy.code, params: { ...strategy.params, SL: 5.0, TP: 10.0 } };
      });
      setComboData(prev => ({ ...prev, strategies: newConfigs }));
    }
  }, [strategyOptions, comboData.strategies]); 

  // [FIXED] Set Default Symbol from Model List
  useEffect(() => {
    // Wait for ALL lists to be ready and ensure symbol isn't already set
    if (symbolOptions.length > 0 && modelOptions.length > 0 && !formData.symbol) {
        const firstModel = modelOptions[0]; 
        const firstModelSymbol = `${firstModel.symbolBase.toUpperCase()}-USD`; 
        
        let defaultSymbol = "";
        
        if (symbolOptions.includes(firstModelSymbol)) {
            defaultSymbol = firstModelSymbol;
        } else {
            defaultSymbol = symbolOptions.find(s => s === 'BTC-USD') || symbolOptions[0];
        }
        
        // 🪵 DEBUG: [Data Flow & Memoization] Log setting default symbol
        console.log("🪵 DEBUG: Backtests.jsx [Effect]: Setting default symbol.", { defaultSymbol });
        setFormData(prev => ({ ...prev, symbol: defaultSymbol }));
        setComboData(prev => ({ ...prev, symbol: defaultSymbol }));
    }
  }, [symbolOptions, modelOptions, formData.symbol]); 

  // Set default timeframe
  useEffect(() => {
    if (timeframeOptions.length && !formData.timeframe) {
        const defaultTimeframe = timeframeOptions.find(t => t === '1h') || timeframeOptions[0];
        // 🪵 DEBUG: [Data Flow & Memoization] Log setting default timeframe
        console.log("🪵 DEBUG: Backtests.jsx [Effect]: Setting default timeframe.", { defaultTimeframe });
        setFormData(prev => ({ ...prev, timeframe: defaultTimeframe }));
        setComboData(prev => ({ ...prev, timeframe: defaultTimeframe }));
    }
  }, [timeframeOptions, formData.timeframe]); 

  // NEW: Effect to dynamically change date range based on ML Mode
  useEffect(() => {
    const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDates();
    const mlStartDate = getMLStartDate(); // '2017-01-01'
    const mlMode = activeTab === 'single' ? formData.mlMode : comboData.mlMode;

    // 🪵 DEBUG: [Data Flow & Memoization] Log date range change effect
    console.log("🪵 DEBUG: Backtests.jsx [Effect]: Checking for date range update.", { activeTab, mlMode });

    const setForm = activeTab === 'single' ? setFormData : setComboData;

    setForm(prev => {
      const newStartDate = prev.mlMode === 'on' ? mlStartDate : defaultStart;
      if (prev.startDate !== newStartDate || prev.endDate !== defaultEnd) {
        // 🪵 DEBUG: [Data Flow & Memoization] Log *applying* date range update
        console.log("🪵 DEBUG: Backtests.jsx [Effect]: Applying new date range.", { newStartDate, defaultEnd });
        return {
          ...prev,
          startDate: newStartDate,
          endDate: defaultEnd
        };
      }
      return prev; 
    });
    
  }, [formData.mlMode, comboData.mlMode, activeTab]); 

  // [FIXED] Auto-select default model for SINGLE form
  useEffect(() => {
    const mode = formData.mlMode;
    if (mode === 'off' || modelOptions.length === 0) return;

    if (mode === 'on' || mode === 'predictions') {
        const currentModel = formData.mlModel;
        const isValid = modelOptions.some(m => m.id === currentModel);
        
        if (!isValid) {
            // 🪵 DEBUG: [Data Flow & Memoization] Log auto-selecting model (Single)
            console.log("🪵 DEBUG: Backtests.jsx [Effect]: Auto-selecting default model (Single).", { newModel: modelOptions[0].id });
            setFormData(prev => ({
                ...prev,
                mlModel: modelOptions[0].id 
            }));
        }
    }
  }, [modelOptions, formData.mlMode, formData.mlModel]); 


  // [FIXED] Auto-select default model for COMBO form
  useEffect(() => {
    const mode = comboData.mlMode;
    if (mode === 'off' || modelOptions.length === 0) return;

    if (mode === 'on' || mode === 'predictions') {
        const currentModel = comboData.mlModel;
        const isValid = modelOptions.some(m => m.id === currentModel);

        if (!isValid) {
            // 🪵 DEBUG: [Data Flow & Memoization] Log auto-selecting model (Combo)
            console.log("🪵 DEBUG: Backtests.jsx [Effect]: Auto-selecting default model (Combo).", { newModel: modelOptions[0].id });
            setComboData(prev => ({
                ...prev,
                mlModel: modelOptions[0].id 
            }));
        }
  S }
  }, [modelOptions, comboData.mlMode, comboData.mlModel]);


  // --- Memoized Results Data ---
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
      // 🪵 DEBUG: [Data Flow & Memoization] Log processing of backtest results
      console.log("🪵 DEBUG: Backtests.jsx [Memo]: Processing results...", { backtestResults });
      try {
        const mainResult = backtestResults?.main || backtestResults?.combinedResult;
        if (mainResult?.metrics && mainResult?.equityCurve) {
          // 🪵 DEBUG: [Data Flow & Memoization] Log successful result mapping
          console.log("🪵 DEBUG: Backtests.jsx [Memo]: Successfully mapped mainResult.", { metrics: mainResult.metrics, equityCurveLength: mainResult.equityCurve.length });
          return {
            combinedEquityCurve: (mainResult.equityCurve || []).map(p => ({ ...p, timestamp: new Date(p.timestamp).getTime() })),
            combinedMetrics: mainResult.metrics || null,
          };
        }
        // 🪵 DEBUG: [Data Flow & Memoization] Log empty/invalid results
        console.log("🪵 DEBUG: Backtests.jsx [Memo]: No valid mainResult metrics or equityCurve found.");
        return { combinedEquityCurve: [], combinedMetrics: null };
      } catch (e) {
        // 🪵 DEBUG: [Errors & Status] Log error during result processing
        console.error("🪵 DEBUG: Backtests.jsx [Memo ERROR]: Error processing results:", e, { backtestResults });
        return { combinedEquityCurve: [], combinedMetrics: null };
      }
  }, [backtestResults]);

  const pieData = useMemo(() => {
    // 🪵 DEBUG: [Data Flow & Memoization] Log pie data calculation
    console.log("🪵 DEBUG: Backtests.jsx [Memo]: Calculating pie data...", { combinedMetrics });
    if (!combinedMetrics || typeof combinedMetrics.winningTrades !== 'number' || typeof combinedMetrics.totalTrades !== 'number') return [];
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    if (wins <= 0 && losses <= 0) return [];
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);


  // Initial loading screen
  if (loading === 'initial') {
    // 🪵 DEBUG: [Errors & Status] Log initial loading state
    console.log("🪵 DEBUG: Backtests.jsx [Status]: Initializing (loading === 'initial')...");
    return (
        <div className="dashboard-container">
            <h1>Backtests</h1>
            <div className="loading-overlay" style={{ position: 'relative', background: 'none' }}>
                <h3>Initializing Backtest Environment...</h3>
                <div className="spinner"></div>
            </div>
        </div>
    );
  }


  // --- Event Handlers (handleFormChange, handleComboChange, etc. ) ---
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    // 🪵 DEBUG: [User Actions] Log single form change
    console.log("🪵 DEBUG: Backtests.jsx [handleFormChange]:", { name, value, type });
    const val = type === 'number' && value !== '' ? parseFloat(value) : (type === 'checkbox' ? e.target.checked : value);
    if (name === 'code') {
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      // 🪵 DEBUG: [User Actions] Log strategy selection
      console.log("🪵 DEBUG: Backtests.jsx [handleFormChange]: Strategy selected.", { selectedStrategy });
      setFormData(prev => ({ ...prev, code: value, params: { ...prev.params, ...(selectedStrategy?.params || {}) } }));
    } else if (name.startsWith("param_")) {
      const paramName = name.substring(6);
      setFormData(prev => ({ ...prev, params: { ...prev.params, [paramName]: val } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };
  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    // 🪵 DEBUG: [User Actions] Log combo form change
    console.log("🪵 DEBUG: Backtests.jsx [handleComboChange]:", { name, value, type });
    const val = type === 'number' && value !== '' ? parseFloat(value) : (type === 'checkbox' ? e.target.checked : value);
    if (name.startsWith("param_")) {
      const paramName = name.substring(6);
      setComboData(prev => ({ ...prev, params: { ...prev.params, [paramName]: val } }));
    } else {
      setComboData(prev => ({ ...prev, [name]: val }));
    }
  };
  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    // 🪵 DEBUG: [User Actions] Log combo card change
    console.log("🪵 DEBUG: Backtests.jsx [handleStrategyConfigChange]:", { index, name, value, type });
    const isParam = name.startsWith("param_");
    const val = type === 'number' && value !== '' ? parseFloat(value) : (type === 'checkbox' ? e.target.checked : value);
    const updatedStrategies = [...comboData.strategies];
    const currentConfig = { ...updatedStrategies[index] };
    if (isParam) {
      const paramName = name.substring(6);
      currentConfig.params = { ...(currentConfig.params || {}), [paramName]: val };
    } else if (name === 'code') {
      const selectedStrategy = strategyOptions.find(s => s.code === value);
      // 🪵 DEBUG: [User Actions] Log combo card strategy selection
      console.log("🪵 DEBUG: Backtests.jsx [handleStrategyConfigChange]: Strategy selected for card.", { index, selectedStrategy });
      currentConfig.code = value;
      currentConfig.params = { ...(selectedStrategy?.params || {}), SL: currentConfig.params?.SL ?? 5.0, TP: currentConfig.params?.TP ?? 10.0, };
    }
    updatedStrategies[index] = currentConfig;
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };
  const addStrategyCard = () => {
    // 🪵 DEBUG: [User Actions] Log adding strategy card
    console.log("🪵 DEBUG: Backtests.jsx [addStrategyCard]: Adding new card.");
    const defaultStrategy = strategyOptions[0] || {};
    const newCard = { code: defaultStrategy.code || "", params: { ...(defaultStrategy.params || {}), SL: 5.0, TP: 10.0 } };
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, newCard] }));
  };
  const removeStrategyCard = (index) => {
    // 🪵 DEBUG: [User Actions] Log removing strategy card
    console.log("🪵 DEBUG: Backtests.jsx [removeStrategyCard]: Removing card.", { index });
    if (comboData.strategies.length <= 1) return;
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };

  // --- Submit Handlers ---
  const handleRunBacktest = async (e) => {
    e.preventDefault();
    // 🪵 DEBUG: [Submissions & Responses] Log single submit validation
    console.log("🪵 DEBUG: Backtests.jsx [handleRunBacktest]: Validating...");
    if (formData.mlMode !== 'off' && !formData.mlModel) { alert("Please select an ML model."); return; }
    if (formData.mlMode === 'off' && !formData.code) { alert("Please select a TA Strategy."); return; }
    setBacktestResults({ main: null, individuals: [] });
    
    // 🪵 DEBUG: [Submissions & Responses] Log PAYLOAD being sent to hook
    console.log("🪵 DEBUG: Backtests.jsx [SUBMIT]: Running SINGLE backtest with payload:", { ...formData });
    
    try {
      const res = await runNewBacktest?.(formData);
      if (res) { setBacktestResults({ main: res, individuals: [] }); }
      
      // 🪵 DEBUG: [Submissions & Responses] Log RESPONSE from hook (THIS IS THE CRITICAL LOG FROM YOUR PREVIOUS CONTEXT)
      console.log("BACKTEST RESULTS (for ChartReplay):", res);
      
      // 🪵 DEBUG: [Submissions & Responses] Log specific metrics if they exist
      if (res?.metrics) {
        console.log("🪵 DEBUG: Backtests.jsx [RESPONSE METRICS]:", res.metrics);
      }
      if (res?.equityCurve?.length > 0) {
        console.log("🪵 DEBUG: Backtests.jsx [RESPONSE EQUITY]:", {
          start: res.equityCurve[0],
          end: res.equityCurve[res.equityCurve.length - 1],
          length: res.equityCurve.length
        });
      }
      
    } catch (err) { 
      // 🪵 DEBUG: [Errors & Status] Log submission failure
      console.error("🪵 DEBUG: Single backtest submission FAILED:", err.message, err); 
    }
  };
  const handleRunComboBacktest = async (e) => {
    e.preventDefault();
    // 🪵 DEBUG: [Submissions & Responses] Log combo submit validation
    console.log("🪵 DEBUG: Backtests.jsx [handleRunComboBacktest]: Validating...");
    if (comboData.mlMode !== 'off' && !comboData.mlModel) { alert("Please select an ML model for the combo."); return; }
    if (comboData.strategies.filter(s => s.code?.trim()).length < 1) { alert("Please select at least one TA strategy for the combo."); return; }
    setBacktestResults({ main: null, individuals: [] });

    // 🪵 DEBUG: [Submissions & Responses] Log PAYLOAD being sent to hook
    console.log("🪵 DEBUG: Backtests.jsx [SUBMIT]: Running COMBO backtest with payload:", { ...comboData });

    try {
      const comboRes = await runComboBacktest?.(comboData);
      // 🪵 DEBUG: [Submissions & Responses] Log RESPONSE from hook
      console.log("🪵 DEBUG: Backtests.jsx [RESPONSE]: COMBO backtest results:", comboRes);
      if (comboRes) { setBacktestResults(comboRes); }
    } catch (err) { 
      // 🪵 DEBUG: [Errors & Status] Log submission failure
      console.error("🪵 DEBUG: Combo backtest submission FAILED:", err.message, err); 
    }
  };

  // --- UI Helper Functions ---
  const getButtonText = (loadingState) => {
    // 🪵 DEBUG: [Errors & Status] Log loading state change for button
    // console.log(`🪵 DEBUG: getButtonText, loading: ${loadingState}`); // This is too noisy, uncomment if needed
    switch (loadingState) {
      case 'running_ml': return 'Processing ML...';
      case 'running_backtest': return 'Running Backtest...';
      case 'running_combo': return 'Running Combo...';
      case 'fetching': return 'Fetching Data...';
      case 'running': return 'Processing...';
      case 'idle':
      default: return activeTab === 'single' ? 'Run Backtest' : 'Run Combo Backtest';
    }
  };
  const getStatusMessage = (loadingState, currentFormData) => {
    // 🪵 DEBUG: [Errors & Status] Log status message generation
    // console.log(`🪵 DEBUG: getStatusMessage, loading: ${loadingState}`); // Also noisy
    switch (loadingState) {
      case 'running_ml':
        if (currentFormData?.mlMode === 'predictions') return 'Fetching external ML features & predictions...';
        if (currentFormData?.mlMode === 'on') return 'Running Python ML backtest (loading data, applying model, simulating)...';
        return 'Running Python backtest...';
      case 'running_backtest':
        if (currentFormData?.mlMode === 'off') return 'Running TA simulation in Node.js...';
        if (currentFormData?.mlMode === 'on') return 'Initiating Python ML backtest... (Checking cache)';
        return 'Starting backtest simulation...';
      case 'running_combo':
        return 'Running Combo Backtest in Python...';
      case 'fetching': return 'Fetching required data...';
      case 'running': return 'Processing request...';
      default: return 'Processing...';
    }
  };

  // Updated single submit logic
  const isSingleSubmitDisabled = loading !== 'idle' ||
    (!options?.symbols?.length) ||
    (formData.mlMode === 'off' && !formData.code) ||
    (formData.mlMode === 'predictions' && (!formData.code || !formData.mlModel)) ||
    (formData.mlMode === 'on' && !formData.mlModel);

  // Updated combo submit logic
  const isComboSubmitDisabled = loading !== 'idle' ||
    (!options?.symbols?.length) ||
    (comboData.mlMode === 'predictions' && (!comboData.mlModel)) ||
    (comboData.mlMode === 'on' && !comboData.mlModel) ||
    (comboData.strategies.filter(s => s.code?.trim()).length < 1);

  const currentFormDataForStatus = activeTab === 'single' ? formData : comboData;

  // --- Render JSX ---
  // 🪵 DEBUG: [Data Flow & Memoization] Log final render props and states
  console.log("🪵 DEBUG: Backtests.jsx [RENDER JSX]:", { loading, error, activeTab, formData, comboData, backtestResults, combinedMetrics });
  
  return (
    <div className="dashboard-container">
      <h1>Backtests</h1>
      {error && <div className="error-box"><h4>Backtest Error</h4><p>{error.message || 'An unknown error occurred.'}</p></div>}

      <div className="backtest-main">
        <div className="backtest-forms">
          {/* Tabs */}
          <div className="tabs">
            <button className={activeTab === 'single' ? 'active' : ''} onClick={() => { 
              // 🪵 DEBUG: [User Actions] Log tab switch
              console.log("🪵 DEBUG: Backtests.jsx [User Action]: Switched tab to 'single'");
              setActiveTab('single');
            }}>Single Strategy</button>
            <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => {
              // 🪵 DEBUG: [User Actions] Log tab switch
              console.log("🪵 DEBUG: Backtests.jsx [User Action]: Switched tab to 'combo'");
              setActiveTab('combo');
            }}>Combo Strategy</button>
          </div>

          {/* Single Strategy Form */}
          {activeTab === 'single' && (
            <form onSubmit={handleRunBacktest} className="backtest-form">
              {/* ... (rest of single form JSX) ... */}
            </form>
          )}

          {/* Combo Strategy Form */}
          {activeTab === 'combo' && (
             <form onSubmit={handleRunComboBacktest} className="backtest-form">
                {/* ... (rest of combo form JSX) ... */}
             </form>
          )}
        </div> {/* end backtest-forms */}

        {/* --- Results Section --- */}
        {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="results-section">
      _       <h2>Backtest Results</h2>
            
            {loading !== 'idle' && (
              <div className="loading-overlay">
                <h3>{getStatusMessage(loading, currentFormDataForStatus)}</h3>
                <div className="spinner"></div>
              </div>
            )}
            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                
                {/* 🚀 CHART REPLAY COMPONENT */}
                {backtestResults.main && backtestResults.main.candleData?.length > 0 && (
                  // 🪵 DEBUG: [Submissions & Responses] Log data being sent to ChartReplay
                  (console.log("🪵 DEBUG: Backtests.jsx [Render]: Rendering ChartReplay with results:", {
                    candleDataLength: backtestResults.main.candleData?.length,
                    tradeBreakdownLength: backtestResults.main.tradeBreakdown?.length,
                    symbol: backtestResults.main.symbol
                NEW   }),
                  <ChartReplay results={backtestResults.main} />)
  S           )}
                
                <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
                     <ResponsiveContainer width="100%" height={300}>
                       <LineChart data={combinedEquityCurve} margin={{ top: 5, right: 20, left: 10, bottom: 25 }}>
                         {/* ... (rest of LineChart) ... */}
                       </LineChart>
            _       </ResponsiveContainer>
                  </div>
                  <div className="chart">
                    <h3>Win / Loss Distribution</h3>
                     <ResponsiveContainer width="100%" height={300}>
                       <PieChart>
                         {/* ... (rest of PieChart) ... */}
                       </PieChart>
                     </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
             {loading === 'idle' && !combinedMetrics && !error && (
                 <p className="no-results-message">Select parameters and run a backtest to see results here.</p>
             )}
          </div>
        )}
      </div> {/* end backtest-main */}
    </div> // end dashboard-container
  );
}
