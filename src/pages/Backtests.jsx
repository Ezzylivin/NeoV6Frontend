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

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = {
  code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate, initialBalance: 1000, params: {},
  riskManagementMode: 'standard', riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1
};

const initialComboData = {
  strategyConfigs: [{ code: "", params: {} }], symbol: "", timeframe: "",
  startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, riskManagementMode: 'standard',
  riskPercentage: 1, growthCapitalTarget: 2000,
  mlMode: "off", mlModel: "default", mlThreshold: 0.5, mlHorizon: 1
};

const MetricsDisplay = ({ metrics }) => { /* ... implementation from before ... */ };
const CommonBacktestInputs = ({ data, onChange, options }) => { /* ... implementation from before ... */ };
const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => { /* ... implementation from before ... */ };

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
      const defaultStrategy = strategyOptions[0] || {};
      const defaultSymbol = symbolOptions[0] || "";
      const defaultTimeframe = timeframeOptions[0] || "1m";
      // ... logic to set form data ...
    }
  }, [strategyOptions, symbolOptions, timeframeOptions]);

  // ============================ FIX STARTS HERE ============================
  // This useMemo block has been rewritten to be more robust and always return a value.
  const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
    try {
        const individuals = backtestResults?.individuals || [];

        // Handle single backtest results
        if (!individuals.length) {
            const mainMetrics = backtestResults?.main?.metrics || null;
            const mainCurve = backtestResults?.main?.equityCurve?.map(d => ({ timestamp: d.timestamp, balance: d.balance })) || [];
            return { combinedEquityCurve: mainCurve, combinedMetrics: mainMetrics };
        }

        const allTimestamps = [...new Set(individuals.flatMap(ind => ind.equityCurve?.map(d => d.timestamp) || []))].sort();

        // Handle combo backtest with no equity data to plot
        if (!allTimestamps.length) {
            // We can still try to compute some metrics, but for now, returning a safe default is best
            return { combinedEquityCurve: [], combinedMetrics: null };
        }

        // --- Calculate combined results for combo backtests ---
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
        
        let peak = initialBalance;
        let maxDrawdownValue = 0;
        curve.forEach(p => {
            if (p.balance > peak) peak = p.balance;
            const dd = peak - p.balance;
            if (dd > maxDrawdownValue) maxDrawdownValue = dd;
        });
        const maxDrawdown = peak > 0 ? (maxDrawdownValue / peak) * 100 : 0;
        
        const grossProfit = individuals.reduce((sum, ind) => sum + (ind.metrics?.grossProfit || 0), 0);
        const grossLoss = individuals.reduce((sum, ind) => sum + (Math.abs(ind.metrics?.grossLoss || 0)), 0);
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

        const metrics = { initialBalance, finalBalance, totalProfit, totalTrades, winRate, maxDrawdown, profitFactor, winningTrades };
        
        return { combinedEquityCurve: curve, combinedMetrics: metrics };

    } catch (e) {
        console.error("Error calculating backtest results:", e);
        // Fallback to a safe default value in case of any unexpected error
        return { combinedEquityCurve: [], combinedMetrics: null };
    }
  }, [backtestResults, comboData.initialBalance]);
  // ============================= FIX ENDS HERE =============================

  const pieData = useMemo(() => {
    if (!combinedMetrics || !combinedMetrics.totalTrades || combinedMetrics.winningTrades === undefined) {
        return [];
    }
    const wins = combinedMetrics.winningTrades;
    const losses = combinedMetrics.totalTrades - wins;
    return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
  }, [combinedMetrics]);

  if (loading === 'initial') {
    return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;
  }

  const handleRunBacktest = async (e) => { e.preventDefault(); /* ... */ };
  const handleRunComboBacktest = async (e) => { e.preventDefault(); /* ... */ };
  // ... other handlers
  
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
                {activeTab === 'single' && (
                    <form onSubmit={handleRunBacktest} className="backtest-form">
                        {/* Single form JSX... */}
                    </form>
                )}
                {activeTab === 'combo' && (
                    <form onSubmit={handleRunComboBacktest} className="backtest-form">
                        {/* Combo form JSX... */}
                    </form>
                )}
            </div>
            {(loading === 'backtest' || combinedMetrics) && (
                <div className="results-section">
                    <h2>Backtest Results</h2>
                    {loading === 'backtest' && <div className="loading-overlay"><h3>Running backtest...</h3></div>}
                    {combinedMetrics && (
                        <>
                            <MetricsDisplay metrics={combinedMetrics} />
                            <div className="charts-container">
                                <div className="chart">
                                    <h3>Equity Curve</h3>
                                    {combinedEquityCurve?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={combinedEquityCurve}>
                                                {/* ... Chart components ... */}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : <p>No equity curve data available.</p>}
                                </div>
                                <div className="chart">
                                    <h3>Win / Loss Distribution</h3>
                                    {pieData?.length > 0 && pieData.some(d => d.value > 0) ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                 {/* ... Chart components ... */}
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p>No win/loss data available.</p>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}
