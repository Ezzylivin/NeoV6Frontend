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

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
};

const initialComboData = {
    strategyConfigs: [{ code: "", params: {} }], symbol: "", timeframe: "",
    startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
    initialBalance: 1000, riskManagementMode: 'standard',
    riskPercentage: 1, growthCapitalTarget: 2000,
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
        { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent' },
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

const CommonBacktestInputs = ({ data, onChange, options }) => (
    <>
        <label>Symbol:
            <select name="symbol" value={data.symbol} onChange={onChange}>
                {options.symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </label>
        <label>Timeframe:
            <select name="timeframe" value={data.timeframe} onChange={onChange}>
                {options.timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </label>
        <label>Start Date: <input type="date" name="startDate" value={data.startDate} onChange={onChange} /></label>
        <label>End Date: <input type="date" name="endDate" value={data.endDate} onChange={onChange} /></label>
        <label>Initial Balance: <input type="number" name="initialBalance" value={data.initialBalance} onChange={onChange} /></label>
        <fieldset>
            <legend>Risk Management</legend>
            <label>Mode:
                <select name="riskManagementMode" value={data.riskManagementMode} onChange={onChange}>
                    <option value="standard">Standard Risk %</option>
                    <option value="dynamic">Dynamic Growth Mode</option>
                </select>
            </label>
            {data.riskManagementMode === 'standard' ? (
                <label>Risk Per Trade (%):
                    <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" />
                </label>
            ) : (
                <>
                    <label>Growth Capital Target ($):
                        <input type="number" name="growthCapitalTarget" value={data.growthCapitalTarget} onChange={onChange} />
                    </label>
                    <label>Risk % (After Target):
                        <input type="number" name="riskPercentage" value={data.riskPercentage} onChange={onChange} step="0.1" />
                    </label>
                </>
            )}
        </fieldset>
    </>
);

// --- Main Component ---
export default function Backtests() {
    const { state, runNewBacktest, runComboBacktest } = useBacktest();
    const { loading, error, options } = state;
    const { createSetup } = useBacktestSetupFunction();

    const [formData, setFormData] = useState(initialFormData);
    const [comboData, setComboData] = useState(initialComboData);
    const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });

    const strategyOptions = useMemo(() => options?.strategies || [], [options]);
    const symbolOptions = useMemo(() => options?.symbols || [], [options]);
    const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

    useEffect(() => {
        if (strategyOptions.length > 0 && !formData.code) {
            const firstStrategy = strategyOptions[0];
            const firstSymbol = symbolOptions[0] || "";
            const firstTimeframe = timeframeOptions[0] || "";
            setFormData(prev => ({ ...prev, code: firstStrategy?.code, params: firstStrategy?.params || {}, symbol: firstSymbol, timeframe: firstTimeframe }));
            setComboData(prev => ({ ...prev, strategyConfigs: [{ code: firstStrategy?.code, params: firstStrategy?.params || {} }], symbol: firstSymbol, timeframe: firstTimeframe }));
        }
    }, [strategyOptions, symbolOptions, timeframeOptions]);

    const handleFormChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? Number(value) : value;
        if (name === 'code') {
            const selectedStrategy = strategyOptions.find(s => s.code === finalValue);
            setFormData(prev => ({ ...prev, code: finalValue, params: selectedStrategy?.params || {} }));
        } else if (name.startsWith("param_")) {
            const key = name.replace("param_", "");
            setFormData(prev => ({ ...prev, params: { ...prev.params, [key]: finalValue } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleComboChange = (e, index) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? Number(value) : value;
        if (index !== null) {
            const newConfigs = [...comboData.strategyConfigs];
            if (name === "strategyCode") {
                const selectedStrategy = strategyOptions.find(s => s.code === finalValue);
                newConfigs[index] = { code: finalValue, params: selectedStrategy?.params || {} };
            } else if (name.startsWith("param_")) {
                const key = name.replace("param_", "");
                newConfigs[index].params = { ...newConfigs[index].params, [key]: finalValue };
            }
            setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
        } else {
            setComboData(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const addStrategyToCombo = () => {
        const firstStrategy = strategyOptions[0] || { code: "", params: {} };
        setComboData(prev => ({...prev, strategyConfigs: [...prev.strategyConfigs, { code: firstStrategy.code, params: firstStrategy.params }]}));
    };

    const removeStrategyFromCombo = (idx) => {
        setComboData(prev => ({ ...prev, strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx) }));
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        try {
            const result = await runNewBacktest(formData);
            setBacktestResults({ main: result, individuals: [] });
        } catch (err) { console.error("Single backtest submission failed:", err); }
    };

    const handleComboSubmit = async (e) => {
        e.preventDefault();
        try {
            const strategies = comboData.strategyConfigs
                .filter(config => config.code)
                .map(config => ({ code: config.code, params: config.params || {} }));
            if (!strategies.length) return alert("Please select at least one strategy.");
            
            const payload = { ...comboData, strategies };
            delete payload.strategyConfigs;
            
            const result = await runComboBacktest(payload);
            setBacktestResults({ main: result.combinedResult, individuals: result.individualResults || [] });
        } catch (err) { console.error("Combo backtest submission failed:", err); }
    };

    const openSaveModal = () => setIsSaveModalOpen(true);
    const closeSaveModal = () => { setIsSaveModalOpen(false); setSetupDetails({ name: "", description: "" }); };
    const handleSetupChange = (e) => setSetupDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSaveSetup = async (e) => {
        e.preventDefault();
        if (!backtestResults.main) return alert("No backtest to save");
        const payload = {
            name: setupDetails.name, description: setupDetails.description,
            symbol: backtestResults.main.symbol, timeframe: backtestResults.main.timeframe,
            strategies: backtestResults.main.strategies, initialBalance: backtestResults.main.initialBalance,
        };
        try {
            await createSetup(payload);
            alert("Setup saved successfully!");
            closeSaveModal();
        } catch (err) { alert(err.message || "Failed to save setup"); }
    };

    const { combinedEquityCurve, combinedMetrics } = useMemo(() => {
        const individuals = backtestResults.individuals;
        if (!individuals || individuals.length === 0) {
            const mainMetrics = backtestResults.main?.metrics;
            const mainCurve = backtestResults.main?.equityCurve?.map(d => ({ timestamp: d.timestamp, balance: d.balance })) || [];
            return { combinedEquityCurve: mainCurve, combinedMetrics: mainMetrics };
        }
        const allTimestamps = [...new Set(individuals.flatMap(ind => ind.equityCurve?.map(d => d.timestamp) || []))].sort();
        if (allTimestamps.length === 0) return { combinedEquityCurve: [], combinedMetrics: null };
        const initialBalance = comboData.initialBalance;
        let lastBalances = individuals.map(ind => ind.metrics.initialBalance);
        const curve = allTimestamps.map(ts => {
            let currentTotalBalance = 0;
            individuals.forEach((ind, idx) => {
                const pointInTime = ind.equityCurve.find(p => p.timestamp === ts);
                if (pointInTime) lastBalances[idx] = pointInTime.balance;
                currentTotalBalance += lastBalances[idx];
            });
            return { timestamp: ts, balance: currentTotalBalance };
        });
        const finalBalance = curve.length > 0 ? curve[curve.length - 1].balance : initialBalance;
        const totalProfit = finalBalance - initialBalance;
        const totalTrades = individuals.reduce((sum, ind) => sum + ind.metrics.totalTrades, 0);
        const winningTrades = individuals.reduce((sum, ind) => sum + ind.metrics.winningTrades, 0);
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        let peak = initialBalance;
        let maxDrawdownValue = 0;
        curve.forEach(point => {
            if (point.balance > peak) peak = point.balance;
            const drawdown = peak - point.balance;
            if (drawdown > maxDrawdownValue) maxDrawdownValue = drawdown;
        });
        const maxDrawdown = (peak > 0) ? (maxDrawdownValue / peak) * 100 : 0;
        const grossProfit = individuals.reduce((sum, ind) => sum + (ind.metrics.winningTrades * ind.metrics.averageWin), 0);
        const grossLoss = individuals.reduce((sum, ind) => sum + (ind.metrics.losingTrades * ind.metrics.averageLoss), 0);
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
        return {
            combinedEquityCurve: curve,
            combinedMetrics: { initialBalance, finalBalance, totalProfit, totalTrades, winRate, maxDrawdown, profitFactor }
        };
    }, [backtestResults, comboData.initialBalance]);

    const pieData = useMemo(() => {
        if (!combinedMetrics || !combinedMetrics.totalTrades) return [];
        const wins = combinedMetrics.totalTrades * (combinedMetrics.winRate / 100);
        return [{ name: "Win", value: wins }, { name: "Loss", value: combinedMetrics.totalTrades - wins }];
    }, [combinedMetrics]);

    if (loading === 'initial') {
        return <div className="dashboard-container"><h1>Loading Backtest Environment...</h1></div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Backtests</h1>
            {error && <div className="error-box"><h4>Error</h4><p>{error.status && `Status ${error.status}: `}{error.message}</p></div>}
            <div className="forms-container">
                <form className="backtest-form" onSubmit={handleSingleSubmit}>
                    <h2>Single Strategy Backtest</h2>
                    <label>Strategy:
                        <select name="code" value={formData.code} onChange={handleFormChange}>
                            {strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </select>
                    </label>
                    <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{symbolOptions, timeframeOptions}} />
                    {Object.keys(formData.params).map(key => (
                        <label key={key}>{key}: <input type="number" name={`param_${key}`} value={formData.params[key]} onChange={handleFormChange} step="0.1" /></label>
                    ))}
                    <button type="submit" disabled={loading === 'running'}>{loading === 'running' ? "Running..." : "Run Single Backtest"}</button>
                </form>

                <form className="backtest-form" onSubmit={handleComboSubmit}>
                    <h2>Combined Strategy Backtest</h2>
                    {comboData.strategyConfigs.map((config, idx) => (
                        <div key={idx} className="combo-strategy-row">
                            <label>Strategy {idx + 1}:
                                <select name="strategyCode" value={config.code} onChange={(e) => handleComboChange(e, idx)}>
                                    {strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                </select>
                            </label>
                            {Object.keys(config.params).map(key => (
                                <label key={key}>{key}: <input type="number" name={`param_${key}`} value={config.params[key]} onChange={(e) => handleComboChange(e, idx)} step="0.1" /></label>
                            ))}
                            {comboData.strategyConfigs.length > 1 && <button type="button" onClick={() => removeStrategyFromCombo(idx)}>Remove</button>}
                        </div>
                    ))}
                    <button type="button" onClick={addStrategyToCombo}>Add Strategy</button>
                    <CommonBacktestInputs data={comboData} onChange={(e) => handleComboChange(e, null)} options={{symbolOptions, timeframeOptions}} />
                    <button type="submit" disabled={loading === 'running_combo'}>{loading === 'running_combo' ? "Running..." : "Run Combined Backtest"}</button>
                </form>
            </div>

            {(backtestResults.main || backtestResults.individuals.length > 0) && (
                <div className="results-container">
                    <h2>Combined Results</h2>
                    <MetricsDisplay metrics={combinedMetrics} />
                    <div className="chart-container">
                        <h2>Combined Equity Curve</h2>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={combinedEquityCurve}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="timestamp" tickFormatter={formatDate} angle={-20} textAnchor="end" height={50} />
                                <YAxis domain={['dataMin', 'dataMax']} allowDataOverflow={true} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="balance" name="Combined Equity" stroke={COLORS[4]} dot={false} strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    {pieData.length > 0 && (
                        <div className="chart-container pie-chart-container">
                            <h2>Win/Loss Distribution</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                                        <Cell key="cell-0" fill={COLORS[0]} />
                                        <Cell key="cell-1" fill={COLORS[1]} />
                                    </Pie>
                                    <Tooltip/>
                                    <Legend />
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
                                        <XAxis dataKey="timestamp" tickFormatter={formatDate} />
                                        <YAxis domain={['auto', 'auto']} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="balance" name={ind.strategyName || ind.strategyCode} stroke={COLORS[idx % COLORS.length]} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                    <button className="save-setup-btn" onClick={openSaveModal}>Save Backtest Setup</button>
                </div>
            )}

            {isSaveModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-content">
                        <h3>Save Backtest Setup</h3>
                        <label>Name: <input type="text" name="name" value={setupDetails.name} onChange={handleSetupChange} /></label>
                        <label>Description: <input type="text" name="description" value={setupDetails.description} onChange={handleSetupChange} /></label>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <button type="button" onClick={closeSaveModal}>Cancel</button>
                            <button type="button" onClick={handleSaveSetup}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
