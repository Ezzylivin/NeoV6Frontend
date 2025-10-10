// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "./Backtests.css";

// --- Helper functions and child components are unchanged ---
const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];
const formatDate = dateString => { /* ... */ };
const getDefaultDates = () => { /* ... */ };
const initialFormData = { /* ... */ };
const initialComboData = { /* ... */ };
const MetricsDisplay = ({ metrics }) => { /* ... implementation ... */ };
const CommonBacktestInputs = ({ data, onChange, options }) => { /* ... implementation ... */ };
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => { /* ... implementation ... */ };


// --- Main Component ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest } = useBacktest();
  const { loading, error, options } = state || {};
  const { createSetup } = useBacktestSetupFunction();
  const { strategies: contextStrategies } = useContext(StrategyContext) || {};

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTab, setActiveTab] = useState('single');

  const strategyOptions = useMemo(() => contextStrategies || [], [contextStrategies]);
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  useEffect(() => {
    // This effect populates the forms with default data once options are loaded
    if (strategyOptions.length && symbolOptions.length && timeframeOptions.length) {
      console.log("DEPENDENCIES LOADED: Populating form defaults.");
      const defaultStrategy = strategyOptions[0] || {};
      const defaultSymbol = symbolOptions[0] || "";
      const defaultTimeframe = timeframeOptions[0] || "1m";
      setFormData(prev => ({ ...prev, code: prev.code || defaultStrategy.code, params: prev.params || defaultStrategy.params || {}, symbol: prev.symbol || defaultSymbol, timeframe: prev.timeframe || defaultTimeframe }));
      setComboData(prev => ({ ...prev, strategyConfigs: prev.strategyConfigs.length === 1 && !prev.strategyConfigs[0].code ? [{ code: defaultStrategy.code, params: defaultStrategy.params || {} }] : prev.strategyConfigs, symbol: prev.symbol || defaultSymbol, timeframe: prev.timeframe || defaultTimeframe }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]);

  // The robust useMemo for calculations remains the same
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => { /* ... implementation ... */ }, [backtestResults, comboData.initialBalance]);
  const pieData = useMemo(() => { /* ... implementation ... */ }, [combinedMetrics]);

  if (loading === 'initial') {
    return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;
  }

  // ... other handlers
  
  // ============================ DIAGNOSTIC LOGS ============================
  // These will print to your browser's developer console (F12)
  console.log("--- Rendering Backtests Component ---");
  console.log("Active Tab:", activeTab);
  console.log("Form Data:", formData);
  console.log("Options Loaded:", {
      strategies: strategyOptions.length,
      symbols: symbolOptions.length,
      timeframes: timeframeOptions.length
  });
  // =========================================================================
  
  return (
    <div className="dashboard-container">
        <h1>Backtests</h1>
        {error && <div className="error-box"><h4>Error</h4><p>{error.message}</p></div>}
        <div className="backtest-main">
            <div className="backtest-forms">
                <div className="tabs">
                    <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
                    <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
                </div>
                
                {/* ============================ DIAGNOSTIC PLACEHOLDER ============================ */}
                {/* We are temporarily replacing the real form with this simple div. */}
                {activeTab === 'single' && (
                    <div style={{ border: '2px solid red', padding: '20px', marginTop: '20px' }}>
                        <h2>Single Form Placeholder</h2>
                        <p>If you can see this red box, it means the conditional rendering is working correctly.</p>
                    </div>
                )}
                 {activeTab === 'combo' && (
                    <div style={{ border: '2px solid dodgerblue', padding: '20px', marginTop: '20px' }}>
                        <h2>Combo Form Placeholder</h2>
                    </div>
                )}
                {/* ================================================================================= */}

            </div>
            {/* ... Results section remains the same ... */}
        </div>
    </div>
  );
}
