import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import "./Backtests.css";

// --- Constants and Helpers ---
const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getDefaultDates = () => {
    const today = new Date();
    const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
    const end = new Date(today); end.setDate(today.getDate() - 1);
    return { startDate: formatDate(start), endDate: formatDate(end) };
};

const initialFormData = {
    code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
    endDate: getDefaultDates().endDate, initialBalance: 1000,
    params: {}, // Will be populated by selected strategy
};

const initialComboData = {
    strategyConfigs: [{ code: "", params: {} }],
    symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
    endDate: getDefaultDates().endDate, initialBalance: 1000,
};

// --- Sub-components ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics || metrics.totalTrades === undefined) return <div className="metrics-grid-loading">Calculating metrics...</div>;
    const items = [
        { label: "Initial Balance", value: metrics.initialBalance, format: 'currency' },
        { label: "Final Balance", value: metrics.finalBalance, format: 'currency' },
        { label: "Total Profit", value: metrics.totalProfit, format: 'currency' },
        { label: "Total Trades", value: metrics.totalTrades, format: 'number' },
        { label: "Win Rate", value: metrics.winRate, format: 'percent' },
        { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'currency' },
        { label: "Profit Factor", value: metrics.profitFactor, format: 'number' },
    ];
    return (
        <div className="metrics-grid">
            {items.map(m => (
                <div key={m.label} className="metric-item">
                    <span className="metric-label">{m.label}</span>
                    <span className="metric-value">
                        {typeof m.value === "number" ? (
                            m.format === 'currency' ? `$${m.value.toFixed(2)}` :
                            m.format === 'percent' ? `${m.value.toFixed(2)}%` :
                            m.value.toFixed(2)
                        ) : "N/A"}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- Main Component ---
export default function Backtests() {
    const { strategies: availableStrategies } = useContext(StrategyContext);
    const { state, runNewBacktest, runComboBacktest } = useBacktest();
    const { setups, createSetup } = useBacktestSetupFunction();
    const { loading, error, options } = state;

    const [formData, setFormData] = useState(initialFormData);
    const [comboData, setComboData] = useState(initialComboData);
    const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });

    const strategyOptions = useMemo(() => options?.strategies || [], [options]);
    const symbolOptions = useMemo(() => options?.symbols || [], [options]);
    const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

    // Effect to populate forms with default data once options are loaded
    useEffect(() => {
        if (strategyOptions.length > 0 && !formData.code) {
            const firstStrategy = strategyOptions[0];
            setFormData(prev => ({
                ...prev,
                code: firstStrategy?.code || "",
                symbol: symbolOptions[0] || "",
                timeframe: timeframeOptions[0] || "",
                params: firstStrategy?.params || {},
            }));
            setComboData(prev => ({
                ...prev,
                symbol: symbolOptions[0] || "",
                timeframe: timeframeOptions[0] || "",
                strategyConfigs: [{ code: firstStrategy?.code || "", params: firstStrategy?.params || {} }],
            }));
        }
    }, [options, formData.code]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };
        
        if (name === 'code') {
            const selectedStrategy = strategyOptions.find(s => s.code === value);
            newFormData.params = selectedStrategy?.params || {};
        } else if (name.startsWith("param_")) {
            const key = name.replace("param_", "");
            newFormData = { ...formData, params: { ...formData.params, [key]: Number(value) || 0 } };
        }
        
        setFormData(newFormData);
    };

    const handleComboChange = (e, index) => {
        const { name, value } = e.target;
        const newConfigs = [...comboData.strategyConfigs];
    
        if (name === "strategyCode") {
            const selectedStrategy = strategyOptions.find(s => s.code === value);
            newConfigs[index] = { code: value, params: selectedStrategy?.params || {} };
            setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
        } else if (name.startsWith("param_")) {
            const key = name.replace("param_", "");
            newConfigs[index].params = { ...newConfigs[index].params, [key]: Number(value) || 0 };
            setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
        } else {
            setComboData(prev => ({ ...prev, [name]: value }));
        }
    };

    const addStrategyToCombo = () => {
        const firstStrategy = strategyOptions[0] || { code: "", params: {} };
        setComboData(prev => ({
            ...prev,
            strategyConfigs: [...prev.strategyConfigs, { code: firstStrategy.code, params: firstStrategy.params }]
        }));
    };

    const removeStrategyFromCombo = (idx) => {
        setComboData(prev => ({ ...prev, strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx) }));
    };

    // --- Backtest Execution ---

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                code: formData.code,
                symbol: formData.symbol,
                timeframe: formData.timeframe,
                startDate: formData.startDate,
                endDate: formData.endDate,
                initialBalance: Number(formData.initialBalance),
                params: formData.params
            };
            const result = await runNewBacktest(payload);
            setBacktestResults({ main: result, individuals: [] });
        } catch (err) { console.error("Single backtest submission failed:", err); }
    };

    const handleComboSubmit = async (e) => {
        e.preventDefault();
        try {
            // ✅ CRITICAL FIX: Map the configs to an array of STRINGS for the payload.
            const strategyCodes = comboData.strategyConfigs
                .map(config => config.code)
                .filter(Boolean);

            if (!strategyCodes.length) {
                alert("Please select at least one strategy.");
                return;

            }
            // ✅ CRITICAL FIX: The payload sent to the hook/service MUST use `strategyCodes`.
            const payload = {
                strategyCodes,
                symbol: comboData.symbol,
                timeframe: comboData.timeframe,
                startDate: comboData.startDate,
                endDate: comboData.endDate,
                initialBalance: Number(comboData.initialBalance),
                combinationRule: "OR" // Or from a form input
            };

            const result = await runComboBacktest(payload);
            setBacktestResults({
                main: result.combinedResult,
                individuals: result.individualResults || []
            });
        } catch (err) { console.error("Combo backtest submission failed:", err); }
    };

    // --- Frontend Data Combination & Memoization ---

    const combinedEquityCurve = useMemo(() => {
        if (!backtestResults.individuals?.length) {
            // Handle single backtest result or initial state
            return backtestResults.main?.equityCurve?.map(d => ({ 
                timestamp: d.timestamp, 
                balance: d.balance 
            })) || [];
        }

        // Create a master timeline of all unique timestamps
        const allTimestamps = [...new Set(backtestResults.individuals.flatMap(ind => ind.equityCurve.map(d => d.timestamp)))].sort();
        
        const initialTotalBalance = backtestResults.individuals.reduce((sum, ind) => sum + ind.equityCurve[0].balance, 0);

        let lastBalances = backtestResults.individuals.map(ind => ind.equityCurve[0].balance);
        
        return allTimestamps.map(ts => {
            let currentTotalBalance = 0;
            backtestResults.individuals.forEach((ind, idx) => {
                const pointInTime = ind.equityCurve.find(p => p.timestamp === ts);
                if (pointInTime) {
                    lastBalances[idx] = pointInTime.balance;
                }
                currentTotalBalance += lastBalances[idx];
            });
            return { timestamp: ts, balance: currentTotalBalance - initialTotalBalance + comboData.initialBalance };
        });

    }, [backtestResults.individuals, backtestResults.main, comboData.initialBalance]);

    const combinedMetrics = useMemo(() => {
        if (!backtestResults.individuals?.length) return backtestResults.main?.metrics;
        if (!combinedEquityCurve.length) return null;

        const initialBalance = comboData.initialBalance;
        const finalBalance = combinedEquityCurve[combinedEquityCurve.length - 1].balance;
        const totalProfit = finalBalance - initialBalance;
        
        const totalTrades = backtestResults.individuals.reduce((sum, ind) => sum + ind.metrics.totalTrades, 0);
        const winningTrades = backtestResults.individuals.reduce((sum, ind) => sum + ind.metrics.winningTrades, 0);
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        
        let peak = initialBalance;
        let maxDrawdown = 0;
        combinedEquityCurve.forEach(point => {
            if (point.balance > peak) peak = point.balance;
            const drawdown = peak > 0 ? ((peak - point.balance) / peak) * 100 : 0;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });

        const grossProfit = backtestResults.individuals.reduce((sum, ind) => sum + (ind.metrics.totalProfit > 0 ? ind.metrics.totalProfit : 0), 0);
        const grossLoss = backtestResults.individuals.reduce((sum, ind) => sum + (ind.metrics.totalProfit < 0 ? Math.abs(ind.metrics.totalProfit) : 0), 0);
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

        return { initialBalance, finalBalance, totalProfit, totalTrades, winRate, maxDrawdown, profitFactor };
    }, [backtestResults.individuals, combinedEquityCurve, comboData.initialBalance]);

    const pieData = useMemo(() => {
        if (!combinedMetrics || !combinedMetrics.totalTrades) return [];
        const wins = combinedMetrics.totalTrades * (combinedMetrics.winRate / 100);
        return [{ name: "Win", value: wins, color: COLORS[0] }, { name: "Loss", value: combinedMetrics.totalTrades - wins, color: COLORS[1] }];
    }, [combinedMetrics]);

    if (loading === 'initial') {
        return <div className="dashboard-container"><h1>Loading backtest data...</h1></div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Backtests</h1>
            {error && <div className="error-box"><h4>Error</h4><p>{error.status}: {error.message}</p></div>}
            
            <div className="forms-container">
                {/* --- FORMS (Single & Combo) --- */}
                {/* Note: The form JSX is large, so it's included below this main return block */}
                {/* This section would contain your two <form>...</form> blocks */}
            </div>

            { (backtestResults.main || backtestResults.individuals.length > 0) &&
                <div className="results-container">
                    <h2>Combined Results</h2>
                    <MetricsDisplay metrics={combinedMetrics} />

                    <div className="chart-container">
                        <h2>Combined Equity Curve</h2>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={combinedEquityCurve}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="timestamp" tickFormatter={(ts) => formatDate(ts)} />
                                <YAxis domain={['dataMin', 'dataMax']} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="balance" name="Combined Equity" stroke={COLORS[2]} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {pieData.length > 0 && (
                         <div className="chart-container">
                            <h2>Win/Loss Distribution</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                                        {pieData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    
                    {backtestResults.individuals.length > 0 && <h2>Individual Results</h2>}
                    {backtestResults.individuals.map((ind, idx) => (
                        <div key={ind.strategyCode || idx} className="individual-result-container">
                            <h3>{ind.strategyName || ind.strategyCode}</h3>
                            <MetricsDisplay metrics={ind.metrics} />
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={ind.equityCurve}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="timestamp" tickFormatter={(ts) => formatDate(ts)} />
                                        <YAxis domain={['dataMin', 'dataMax']} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="balance" stroke={COLORS[idx % COLORS.length]} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            }
        </div>
    );
}
