// File: src/pages/Backtests.jsx
//
// 💡 v2 UPGRADE (Robustness):
// 1. Replaced all fixed SL/TP defaults with `tslAtrMult`.
// 2. Removed fixed SL/TP inputs from the UI.
// 3. Upgraded combo-card logic to use `tslAtrMult`.
// (Includes all previous fixes)

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartReplay } from "../components/ChartReplay.jsx";
import "../components/ChartReplay.css";
import "./Backtests.css";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

// Helper functions (unchanged)
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

// --- 🚀 START OF ROBUSTNESS UPGRADE ---
// Default parameters for filters/strategy
const defaultFilterParams = {
    minAtrPct: 0, 
    trendFilterPeriod: 200, 
    minAdxLevel: 0,
    tslAtrMult: 3.5, // ✅ Replaced fixed SL/TP with our proven robust parameter
};
// --- 🚀 END OF ROBUSTNESS UPGRADE ---

// Initial state for the single backtest form
const initialFormData = {
  code: "", 
  symbol: "",
  timeframe: "",
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  params: { ...defaultFilterParams }, // ✅ This now correctly inherits tslAtrMult
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off", 
  mlModel: "", 
  mlThreshold: 0.5,
  mlHorizon: 1
};

// --- 🚀 START OF ROBUSTNESS UPGRADE ---
// Initial state for the combo backtest form
const initialComboData = {
  strategies: [ 
    // ✅ Default combo strategies now also use tslAtrMult
    { code: "", params: { tslAtrMult: 3.5 } },
    { code: "", params: { tslAtrMult: 3.5 } }
  ],
  params: { 
    minAtrPct: 0,
    trendFilterPeriod: 200,
    hybridMode: 'AND', // ✅ Default to AND (which we proved is more robust)
    minAdxLevel: 0,
    tslAtrMult: 0, // Global trailing stop (0 = use individual card's value)
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
// --- 🚀 END OF ROBUSTNESS UPGRADE ---


// 🚀 Strategy Code Map: MUST match the 'signal_map' in your Python server
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
const MetricsDisplay = ({ metrics, mainResult }) => {
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
  const items = [
    { label: "Total Return", value: metrics.totalReturn ?? 0, format: 'percent' },
    { label: "Profit Factor", value: metrics.profitFactor ?? 0, format: 'number' },
    { label: "Max Drawdown", value: metrics.maxDrawdown ?? 0, format: 'percent' },
    { label: "Win Rate", value: metrics.winRate ?? 0, format: 'percent' },
    { label: "Total Trades", value: metrics.totalTrades ?? 0, format: null },
    { label: "Avg. Win", value: metrics.averageWin ?? 0, format: 'currency' },
    { label: "Avg. Loss", value: metrics.averageLoss ?? 0, format: 'currency' },
    { label: "Final Balance", value: metrics.finalBalance ?? 0, format: 'currency' }
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

        let val = value;
        if (type === 'number') {
         val = (value === '' || value === null) ? 0 : parseFloat(value);
        }

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
                    value={data.timeframe} 
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
            </label>

            {/* Date Inputs */}
            <label>Start Date: 
                <input 
                    type="date" 
                    name="startDate" 
                    value={data.startDate}
                    onChange={handleGlobalChange} 
                    title="The first day of the backtest period (YYYY-MM-DD)."
                />
            </label>
            <label>End Date: 
                <input 
                    type="date" 
                    name="endDate" 
                    value={data.endDate} 
                    onChange={handleGlobalChange} 
                    title="The last day of the backtest period (YYYY-MM-DD)."
                />
            </label>
            <label>Initial Balance: 
                <input 
                    type="number" 
                    name="initialBalance" 
                    value={data.initialBalance} 
                    onChange={handleGlobalChange} 
                    min="1" 
                    step="1" 
                    title="The starting cash balance (e.g., 1000) for the backtest."
                />
            </label>

            {/* Risk Management Section */}
            <fieldset title="Configure how much capital to risk on each trade.">
                <legend>Risk Management</legend>
                <label>Mode:
                    <select 
                        name="riskManagementMode" 
                        value={data.riskManagementMode} 
                        onChange={handleGlobalChange}
                        title="Select the risk management style. 'Standard Risk %' uses a fixed percentage of your balance for each trade. 'Dynamic Growth Mode' risks more aggressively to reach a target."
                    >
                        <option value="standard">Standard Risk %</option>
                        <option value="dynamic">Dynamic Growth Mode</option>
                    </select>
                </label>
                {data.riskManagementMode === 'standard' ? (
                    <>
                        <label>Risk Per Trade (%): 
                            <input 
                                type="number" 
                                name="riskPercentage" 
                                value={data.riskPercentage} 
                                onChange={handleGlobalChange} 
                                step="0.1" 
                                min="0.1" 
                                required
                                title="The percentage of your total equity to risk per trade (e.g., 1 for 1%)."
                            /> 
                        </label>
                        <label>Initial Risk Amount ($):
                            <input
                                type="text"
                                readOnly
                                value={`$${(data.initialBalance * (data.riskPercentage / 100)).toFixed(2)}`}
                                className="read-only-display"
                                title="Your calculated risk for the first trade (Initial Balance * Risk %)."
                            />
                        </label>
                    </>
                ) : (
                    <>
                        <label>Growth Capital Target ($): 
                            <input 
                                type="number" 
                                name="growthCapitalTarget" 
                                value={data.growthCapitalTarget} 
                                onChange={handleGlobalChange} 
                                min="1" 
                                step="1" 
                                title="In 'Dynamic Growth Mode', this is the equity target. The system will risk aggressively to reach this target, then revert to the 'Risk %' setting."
                            /> 
                        </label>
                        <label>Risk % (After Target): 
                            <input 
                                type="number" 
                                name="riskPercentage" 
                                value={data.riskPercentage} 
                                onChange={handleGlobalChange} 
                                step="0.1" 
                                min="0.1" 
                                required
                                title="In 'Dynamic Growth Mode', this is the standard risk % to use *after* your equity target has been reached."
                            /> 
                        </label>
                        <label>Risk Amount (After Target) ($):
                            <input
                                type="text"
                                readOnly
                                value={`$${(data.growthCapitalTarget * (data.riskPercentage / 100)).toFixed(2)}`}
                                className="read-only-display"
                                title="Your calculated risk *after* the target is met (Target * Risk %)."
                            />
                        </label>
                    </>
                )}
            </fieldset>

            {/* Machine Learning Section */}
            <fieldset title="Configure Machine Learning model integration.">
                <legend>Machine Learning</legend>
                <label>Mode:
                    <select 
                        name="mlMode" 
                        value={data.mlMode || "off"} 
                        onChange={handleGlobalChange}
                        title="Select the backtest mode. 'Off' uses only TA signals. 'Hybrid' uses TA signals filtered by an ML model. 'On' uses only ML model signals."
                    >
                        <option value="off">Off (Pure TA)</option>
                        <option value="predictions">Hybrid (TA + ML Filter)</option>
                        <option value="on">On (Pure ML)</option>
                    </select>
                </label>
                {data.mlMode !== "off" && (
                    <>
                        {/* Model Dropdown */}
                        <label>Model:
                            <select 
                                name="mlModel" 
                                value={data.mlModel} 
                                onChange={handleGlobalChange} 
                                disabled={allModelOptions.length === 0}
                                title="Select the pre-trained ML model to use. The model's name (e.g., 'ada_30m_...') MUST match your selected Symbol (ADA-USD) and Timeframe (30m) to avoid an error."
                            >
                                <option value="">-- Select Model --</option>
                                {
                                    allModelOptions.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))
                                }
                            </select>
                        </label>
                        <label>Confidence Threshold: 
                            <input 
                                type="number" 
                                name="mlThreshold" 
                                value={data.mlThreshold || 0.5} 
                                step="0.01" 
                                min="0" 
                                max="1" 
                                onChange={handleGlobalChange} 
                                title="The minimum confidence (0.0 to 1.0) from the ML model to consider a signal valid. e.g., 0.65 = 65% confidence."
                            /> 
                        </label>
                        <label>Prediction Horizon: 
                            <input 
                                type="number" 
                                name="mlHorizon" 
                                value={data.mlHorizon || 1} 
                                step="1" 
                                min="1" 
                                onChange={handleGlobalChange}
                                title="The number of bars/candles the model was trained to predict. (e.g., 1 = next bar). This must match the model's training."
                            /> 
                        </label>
                    </>
                )}
                {data.mlMode === 'predictions' && (
                    <label>Hybrid Logic:
                        <select 
                            name="hybridMode" 
                            value={params.hybridMode ?? 'AND'} // ✅ Default to AND
                            onChange={handleParamChange}
                            title="How to combine TA and ML signals in 'Hybrid' mode. 'AND' requires both. 'OR' allows either. 'Regime' uses the TA signal as a long-term trend filter."
                        >
                            <option value="AND">TA AND ML (Strict Filter)</option>
                            <option value="OR">TA OR ML (Permissive)</option>
                            <option value="Regime">TA as Regime Filter</option>
                        </select>
                    </label>
                )}
            </fieldset>

            {/* Advanced Filters Section */}
            <fieldset title="Apply advanced filters to your strategy signals.">
                <legend>Advanced Filters</legend>
                <label>Volatility Filter (Min ATR %):
                    <input 
                        type="number" 
                        name="minAtrPct" 
                        value={params.minAtrPct ?? 0} 
                        onChange={handleParamChange} 
                        step="0.05" 
                        min="0" 
                        title="A volatility filter. The strategy will ONLY trade if the current ATR (Average True Range) as a percentage of price is *above* this value. e.g., 0.5 = only trade if volatility is at least 0.5% of the price. Set to 0 to disable."
                    />
                </label>
                <label>Chop Filter (Min ADX):
                    <input 
                        type="number" 
                        name="minAdxLevel" 
                        value={params.minAdxLevel ?? 0} 
                        onChange={handleParamChange} 
                        step="1" 
                        min="0" 
                        max="100"
                        title="A trend strength filter. Strategy will ONLY trade if ADX is *above* this value (e.g., 20 or 25). Set to 0 to disable."
                    />
                </label>
                
                {/* --- 🚀 START OF ROBUSTNESS UPGRADE --- */}
                {/* We now show tslAtrMult for both combo and single forms */}
                <label>Trailing Stop (ATR Mult):
                    <input 
                        type="number" 
                        name="tslAtrMult" 
                        value={params.tslAtrMult ?? 0} 
                        onChange={handleParamChange} 
                        step="0.1" 
                        min="0" 
                        title="An ATR-based trailing stop loss. A value > 0 (e.g., 3.5) will enable this AND override any fixed Stop Loss %. Set to 0 to use fixed SL%."
                    />
                </label>
                {/* --- 🚀 END OF ROBUSTNESS UPGRADE --- */}

                <label>Trend Filter SMA Period:
                    <input 
                        type="number"
                        name="trendFilterPeriod" 
                        value={params.trendFilterPeriod ?? 200}
                        onChange={handleParamChange}
                        step="1" 
                        min="0" 
                        title="A long-term trend filter. The strategy will only take trades in the direction of this SMA. (e.g., 200). Set to 0 to disable."
                    />
                </label>
            </fieldset>

            {/* --- 🚀 START OF ROBUSTNESS UPGRADE --- */}
            {/* This block is now CONDITIONAL. It will only show up if the
              user has NOT enabled the (superior) Trailing Stop.
            */}
            {(params.tslAtrMult ?? 0) === 0 && !isCombo && (
                <>
                    <label>Stop Loss (%):
                        <input 
                            type="number" 
                            name="SL" 
                            value={params.SL ?? 5.0}
                            onChange={handleParamChange} 
                            step="0.1" 
                            min="0.1" 
                            required
                            title="The Stop Loss for the TA strategy, as a percentage from the entry price (e.g., 5 = 5%). This is IGNORED if 'Trailing Stop (ATR Mult)' is > 0."
                        />
                    </label>
                    <label>Take Profit (%):
                        <input 
                            type="number" 
                            name="TP" 
                            value={params.TP ?? 10.0} 
                            onChange={handleParamChange} 
                            step="0.1" 
                            min="0.1" 
                            required
                            title="The Take Profit for the TA strategy, as a percentage from the entry price (e.g., 10 = 10%)."
                        />
                    </label>
                </>
            )}
            {/* --- 🚀 END OF ROBUSTNESS UPGRADE --- */}
        </>
    );
};

// --- 🚀 START OF ROBUSTNESS UPGRADE ---
// Combo Strategy Card Component (Upgraded to use tslAtrMult)
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  // 🪵 DEBUG: [State & Props] Log props for ComboStrategyCard
  console.log(`🪵 DEBUG: ComboStrategyCard #${idx} [Props]:`, { config, strategies, disableRemove });
  const handleChange = (e) => onChange(e, idx);

  // Check if the individual card's trailing stop is enabled.
  // We use the global `tslAtrMult` from `data.params` if it's set,
  // otherwise we use the individual card's.
  // For this component, we'll just show/hide based on its own `tslAtrMult`.
  const trailingStopEnabled = (config.params?.tslAtrMult ?? 0) > 0;

  return (
    <div className="combo-card">
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
        
        {/* New Trailing Stop Input */}
        <label>Trailing Stop (ATR Mult):
             <input 
                type="number" 
                name="param_tslAtrMult" 
                value={config.params?.tslAtrMult ?? 0} 
                onChange={handleChange} 
                step="0.1" 
                min="0" 
                title="An ATR-based trailing stop loss. (e.g., 3.5). Set to 0 to use fixed SL% for this card."
            />
        </label>

        {/* Conditionally show fixed SL/TP only if TSL is off */}
        {!trailingStopEnabled && (
          <>
            <label>Stop Loss (%): 
                <input 
                    type="number" 
                    name="param_SL" 
                    value={config.params?.SL ?? 5.0} 
                    onChange={handleChange} 
                    step="0.1" 
                    min="0"
                    title="Fixed Stop Loss %. This is IGNORED if 'Trailing Stop (ATR Mult)' is > 0."
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
                    title="Fixed Take Profit %."
                />
            </label>
          </>
        )}
      </div>
    </div>
  );
};
// --- 🚀 END OF ROBUSTNESS UPGRADE ---


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
      // ✅ This now correctly spreads the *new* default params (with tslAtrMult)
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
        // ✅ Use new robust defaults
        return { code: strategy.code, params: { ...strategy.params, tslAtrMult: 3.5 } };
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

  // [CRASH FIX] - The auto-date-change feature is disabled
  /*
  useEffect(() => {
    ...
  }, [formData.mlMode, comboData.mlMode, activeTab]); 
  */

  // [MODEL MISMATCH FIX] - Auto-select correct model for SINGLE form
  useEffect(() => {
    const { mlMode, symbol, timeframe, mlModel } = formData;
    if (mlMode === 'off' || modelOptions.length === 0 || !symbol || !timeframe) return;
  
    if (mlMode === 'on' || mlMode === 'predictions') {
      const symbolBase = symbol.split('-')[0].toLowerCase();
      
      const isCurrentModelValid = modelOptions.some(m => 
        m.id === mlModel && 
        m.symbolBase === symbolBase && 
        m.timeframe === timeframe
      );
  
      if (isCurrentModelValid) return;
  
      const newDefaultModel = modelOptions.find(m => 
        m.symbolBase === symbolBase && 
        m.timeframe === timeframe
      );
  
      if (newDefaultModel) {
        // 🪵 DEBUG: [Data Flow & Memoization] Log auto-selecting new default model (Single).
        console.log("🪵 DEBUG: Backtests.jsx [Effect]: Auto-selecting default model (Single).", { newModel: newDefaultModel.id });
        setFormData(prev => ({
          ...prev,
          mlModel: newDefaultModel.id
        }));
      } else {
        console.warn(`🪵 DEBUG: Backtests.jsx [Effect]: No matching model found for ${symbol} @ ${timeframe}.`);
        setFormData(prev => ({ ...prev, mlModel: "" }));
      }
    }
  }, [modelOptions, formData.mlMode, formData.symbol, formData.timeframe]);

  // [MODEL MISMATCH FIX] - Auto-select correct model for COMBO form
  useEffect(() => {
    const { mlMode, symbol, timeframe, mlModel } = comboData;
    if (mlMode === 'off' || modelOptions.length === 0 || !symbol || !timeframe) return;
  
    if (mlMode === 'on' || mlMode === 'predictions') {
      const symbolBase = symbol.split('-')[0].toLowerCase();
      
      const isCurrentModelValid = modelOptions.some(m => 
        m.id === mlModel && 
        m.symbolBase === symbolBase && 
        m.timeframe === timeframe
      );
  
      if (isCurrentModelValid) return;
  
      const newDefaultModel = modelOptions.find(m => 
        m.symbolBase === symbolBase && 
        m.timeframe === timeframe
      );
  
      if (newDefaultModel) {
        // 🪵 DEBUG: [Data Flow & Memoization] Log auto-selecting new default model (Combo).
        console.log("🪵 DEBUG: Backtests.jsx [Effect]: Auto-selecting default model (Combo).", { newModel: newDefaultModel.id });
        setComboData(prev => ({
          ...prev,
          mlModel: newDefaultModel.id
        }));
      } else {
        console.warn(`🪵 DEBUG: Backtests.jsx [Effect]: No matching model found for ${symbol} @ ${timeframe} (Combo).`);
        setComboData(prev => ({ ...prev, mlModel: "" }));
      }
    }
  }, [modelOptions, comboData.mlMode, comboData.symbol, comboData.timeframe]); 
  

  // --- Memoized Results Data ---
 const { combinedEquityCurve, combinedMetrics, mainResult } = useMemo(() => {
       // 🪵 DEBUG: [Data Flow & Memoization] Log processing of backtest results
      console.log("🪵 DEBUG: Backtests.jsx [Memo]: Processing results...", { backtestResults });
       try {
         const mainResult = backtestResults?.main || backtestResults?.combinedResult;
         if (mainResult?.metrics && mainResult?.equity) { // ✅ Use 'equity' key
           // 🪵 DEBUG: [Data Flow & Memoization] Log successful result mapping
           console.log("🪵 DEBUG: Backtests.jsx [Memo]: Successfully mapped mainResult.", { metrics: mainResult.metrics, equityCurveLength: mainResult.equity.length });
           return {
             combinedEquityCurve: (mainResult.equity || []).map(p => ({ ...p, timestamp: new Date(p.timestamp).getTime() })), // ✅ Use 'equity' key
             combinedMetrics: mainResult.metrics || null,
             mainResult: mainResult
           };
         }
         // 🪵 DEBUG: [Data Flow & Memoization] Log empty/invalid results
         console.log("🪵 DEBUG: Backtests.jsx [Memo]: No valid mainResult metrics or equityCurve found.");
         return { combinedEquityCurve: [], combinedMetrics: null, mainResult:null };
       } catch (e) {
         // 🪵 DEBUG: [Errors & Status] Log error during result processing
         console.error("🪵 DEBUG: Backtests.jsx [Memo ERROR]: Error processing results:", e, { backtestResults });
         return { combinedEquityCurve: [], combinedMetrics: null, mainResult:null };
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
    
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') {
      val = (value === '' || value === null) ? 0 : parseFloat(value);
    }

    if (name === 'code') {
      const selectedStrategy = strategyOptions.find(s => s.code === val); // Use val here
      // 🪵 DEBUG: [User Actions] Log strategy selection
      console.log("🪵 DEBUG: Backtests.jsx [handleFormChange]: Strategy selected.", { selectedStrategy });
      // ✅ This now correctly spreads the *new* default params (with tslAtrMult)
      setFormData(prev => ({ ...prev, code: val, params: { ...prev.params, ...(selectedStrategy?.params || {}) } })); // Use val
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
    
    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') {
      val = (value === '' || value === null) ? 0 : parseFloat(value);
    }

    if (name.startsWith("param_")) {
      const paramName = name.substring(6);
      setComboData(prev => ({ ...prev, params: { ...prev.params, [paramName]: val } }));
    } else {
      setComboData(prev => ({ ...prev, [name]: val }));
    }
  };
  
  // --- 🚀 START OF ROBUSTNESS UPGRADE ---
  const handleStrategyConfigChange = (e, index) => {
    const { name, value, type } = e.target;
    // 🪵 DEBUG: [User Actions] Log combo card change
    console.log("🪵 DEBUG: Backtests.jsx [handleStrategyConfigChange]:", { index, name, value, type });
    const isParam = name.startsWith("param_");

    let val = (type === 'checkbox' ? e.target.checked : value);
    if (type === 'number') {
      val = (value === '' || value === null) ? 0 : parseFloat(value);
    }

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
      // ✅ Update default to use new robust parameter
      currentConfig.params = { 
        ...(selectedStrategy?.params || {}), 
        tslAtrMult: currentConfig.params?.tslAtrMult ?? 3.5, // Keep existing tslAtrMult or use default
      };
    }
    updatedStrategies[index] = currentConfig;
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };
  
  const addStrategyCard = () => {
    // 🪵 DEBUG: [User Actions] Log adding strategy card
    console.log("🪵 DEBUG: Backtests.jsx [addStrategyCard]: Adding new card.");
    const defaultStrategy = strategyOptions[0] || {};
    // ✅ Update new card to use new robust parameter
    const newCard = { 
        code: defaultStrategy.code || "", 
        params: { ...(defaultStrategy.params || {}), tslAtrMult: 3.5 } 
    };
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, newCard] }));
  };
  // --- 🚀 END OF ROBUSTNESS UPGRADE ---
  
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
      
      console.log("BACKTEST RESULTS (for ChartReplay):", res);
      
      if (res?.metrics) {
        console.log("🪵 DEBUG: Backtests.jsx [RESPONSE METRICS]:", res.metrics);
      }
      if (res?.equity?.length > 0) { // ✅ Use 'equity' key
        console.log("🪵 DEBUG: Backtests.jsx [RESPONSE EQUITY]:", {
          start: res.equity[0],
          end: res.equity[res.equity.length - 1],
          length: res.equity.length
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
              {(formData.mlMode === 'off' || formData.mlMode === 'predictions') && (
                <label>Strategy:
                  <select 
                    name="code"
                    value={formData.code} 
                    onChange={handleFormChange} 
                    disabled={!strategyOptions.length}
                    title="Select the core Technical Analysis (TA) strategy to run."
                  >
                    <option value="">-- Select TA Strategy --</option>
                    {strategyOptions.length ? strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>) : <option disabled>Loading...</option>}
                  </select>
                </label>
                 )}
              <CommonBacktestInputs
                  data={formData}
                  onChange={handleFormChange}
                  options={{ symbolOptions, timeframeOptions, modelOptions }}
                  availableModelData={availableModelData}
                  isCombo={false}
              />
              <button type="submit" disabled={isSingleSubmitDisabled}>
               {getButtonText(loading)}
              </button>
            </form>
          )}

          {/* Combo Strategy Form */}
          {activeTab === 'combo' && (
             <form onSubmit={handleRunComboBacktest} className="backtest-form">
                <CommonBacktestInputs
                    data={comboData}
                    onChange={handleComboChange}
                        options={{ symbolOptions, timeframeOptions, modelOptions }}
                    availableModelData={availableModelData}
                    isCombo={true}
                />
                <div className="combo-strategy-list">
                    {comboData.strategies.map((config, idx) => (
                    <ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} />
                  ))}
                </div>
                <button type="button" onClick={addStrategyCard} disabled={loading !== 'idle' || !strategyOptions.length}>Add Strategy</button>
                <button type="submit" disabled={isComboSubmitDisabled}>
                   {getButtonText(loading)}
                </button>
             </form>
          )}
        </div> {/* end backtest-forms */}

        {/* --- Results Section --- */}
        {(loading !== 'idle' || combinedMetrics || error) && (
          <div className="results-section">
            <h2>Backtest Results</h2>
            
            {loading !== 'idle' && (
              <div className="loading-overlay">
                <h3>{getStatusMessage(loading, currentFormDataForStatus)}</h3>
                <div className="spinner"></div>
              </div>
            )}
            {loading === 'idle' && combinedMetrics && !error && (
              <>
                <MetricsDisplay metrics={combinedMetrics} mainResult={mainResult} />
                
                {/***********************************************}
                  💡 START CHART REPLAY FIX
                 ***********************************************/}
                {mainResult && mainResult.candleData?.length > 0 && (() => {
                  const symbol = activeTab === 'single' ? formData.symbol : comboData.symbol;
                  
                  console.log("🪵 DEBUG: Backtests.jsx [Render]: Rendering ChartReplay with results:", {
                    candleDataLength: mainResult.candleData?.length,
                    tradeBreakdownLength: mainResult.tradeBreakdown?.length,
                    symbol: symbol 
                  });
                  
                  return <ChartReplay results={mainResult} symbol={symbol} />;
                })()}
                {/***********************************************}
                  💡 END CHART REPLAY FIX
                 ***********************************************/}
                
                <div className="charts-container">
                  <div className="chart">
                    <h3>Equity Curve</h3>
                      <ResponsiveContainer width="100%" height={300}>
                       <LineChart data={combinedEquityCurve} margin={{ top: 5, right: 20, left: 10, bottom: 25 }}>
                         {combinedEquityCurve.length > 0 && (
                          <XAxis dataKey="timestamp" tickFormatter={formatChartDate} angle={-30} textAnchor="end" height={50} interval="preserveStartEnd" />
                         )}
                         <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} allowDataOverflow={true} />
                         <Tooltip formatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
                         <CartesianGrid stroke="#555" strokeDasharray="3 3"/>
                         <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} strokeWidth={2} />
                       </LineChart>
                     </ResponsiveContainer>
                    </div>
                  <div className="chart">
                    <h3>Win / Loss Distribution</h3>
                     <ResponsiveContainer width="100%" height={300}>
                     <PieChart>
                         
                       {pieData.length > 0 && (
                           <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => { const RADIAN = Math.PI / 180; const radius = innerRadius + (outerRadius - innerRadius) * 0.5; const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN); return ( <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" > {`${pieData[index].name}: ${value}`} </text> ); }}>
                           {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                           </Pie>
                       )}
                       <Tooltip />
                       <Legend />
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
