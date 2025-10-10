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

// --- Helper functions and child components (stubs for brevity) ---
const COLORS = ["#22c55e", "#ef4444"];
const formatDate = dateString => { /* ... implementation ... */ };
const getDefaultDates = () => { /* ... implementation ... */ };
const initialFormData = { /* ... implementation ... */ };
const initialComboData = { /* ... implementation ... */ };
const MetricsDisplay = ({ metrics }) => { /* ... implementation ... */ };
const CommonBacktestInputs = ({ data, onChange, options }) => { /* ... implementation ... */ };
const ComboStrategyCard = ({ idx, config, strategies, onChange, onRemove, disableRemove }) => { /* ... implementation ... */ };


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
    if (strategyOptions.length && symbolOptions.length && timeframeOptions.length) {
      console.log("DEPENDENCIES LOADED: Populating form defaults.");
      const defaultStrategy = strategyOptions[0] || {};
      const defaultSymbol = symbolOptions[0] || "";
      const defaultTimeframe = timeframeOptions[0] || "1m";
      setFormData(prev => ({ ...prev, code: prev.code || defaultStrategy.code, params: prev.params || defaultStrategy.params || {}, symbol: prev.symbol || defaultSymbol, timeframe: prev.timeframe || defaultTimeframe }));
      setComboData(prev => ({ ...prev, strategyConfigs: prev.strategyConfigs.length === 1 && !prev.strategyConfigs[0].code ? [{ code: defaultStrategy.code, params: defaultStrategy.params || {} }] : prev.strategyConfigs, symbol: prev.symbol || defaultSymbol, timeframe: prev.timeframe || defaultTimeframe }));
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]);

  // THIS IS THE CORRECTED, ROBUST VERSION OF THE useMemo HOOK
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
    try {
        const individuals = backtestResults?.individuals || [];
        if (!individuals.length) {
            const mainMetrics = backtestResults?.main?.metrics || null;
            const mainCurve = backtestResults?.main?.equityCurve?.map(d => ({ timestamp: d.timestamp, balance: d.balance })) || [];
            return { combinedEquityCurve: mainCurve, combinedMetrics: mainMetrics };
        }
        const allTimestamps = [...new Set(individuals.flatMap(ind => ind.equityCurve?.map(d => d.timestamp) || []))].sort();
        if (!allTimestamps.length) {
            return { combinedEquityCurve: [], combinedMetrics: null };
        }
        const initialBalance = comboData.initialBalance || 1000;
        let lastBalances = individuals.map(ind => ind.metrics?.initialBalance || 0);
        const curve = allTimestamps.map(ts => {
            let currentTotal = 0;
            individuals.forEach((ind, idx) => {
                const point = ind.equityCurve?.find(p => p.timestamp === ts);
                if (point) lastBalances[idx] = point.balance;
                currentTotal += lastBalances[idx];
            });
            return { timestamp: ts, balance: currentTotal };
        });
        const finalBalance = curve.length ? curve[curve.length - 1].balance : initialBalance;
        const totalProfit = finalBalance - initialBalance;
        const totalTrades = individuals.reduce((sum, ind) => sum + (ind.metrics?.totalTrades || 0), 0);
        const winningTrades = individuals.reduce((sum, ind) => sum + (ind.metrics?.winningTrades || 0), 0);
        const winRate = totalTrades ? (winningTrades / totalTrades) * 100 : 0;
        let peak = initialBalance, maxDrawdownValue = 0;
        curve.forEach(p => { if (p.balance > peak) peak = p.balance; const dd = peak - p.balance; if (dd > maxDrawdownValue) maxDrawdownValue = dd; });
        const maxDrawdown = peak > 0 ? (maxDrawdownValue / peak) * 100 : 0;
        const grossProfit = individuals.reduce((sum, ind) => sum + (ind.metrics?.grossProfit || 0), 0);
        const grossLoss = individuals.reduce((sum, ind) => sum + (Math.abs(ind.metrics?.grossLoss || 0)), 0);
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
        const metrics = { initialBalance, finalBalance, totalProfit, totalTrades, winRate, maxDrawdown, profitFactor, winningTrades };
        return { combinedEquityCurve: curve, combinedMetrics: metrics };
    } catch (e) {
        console.error("Error calculating backtest results:", e);
        return { combinedEquityCurve: [], combinedMetrics: null };
    }
  }, [backtestResults, comboData.initialBalance]);

  const pieData = useMemo(() => { /* ... implementation ... */ }, [combinedMetrics]);

  if (loading === 'initial') {
    return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;
  }
  
  // --- DIAGNOSTIC LOGS ---
  console.log("--- Rendering Backtests Component ---");
  console.log("Active Tab:", activeTab);
  console.log("Options Loaded:", {
      strategies: strategyOptions.length,
      symbols: symbolOptions.length,
      timeframes: timeframeOptions.length
  });
  
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
                
                {/* --- DIAGNOSTIC PLACEHOLDER --- */}
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
            </div>
            {/* ... Results section ... */}
        </div>
    </div>
  );
}
