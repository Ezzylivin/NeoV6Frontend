// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from "recharts";
import "./Backtests.css";

// --- Constants and Helpers ---
const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];

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
    endDate: getDefaultDates().endDate, initialBalance: 1000, params: {},
};

const initialComboData = {
    strategyConfigs: [{ code: "", params: {} }],
    symbol: "", timeframe: "", startDate: getDefaultDates().startDate,
    endDate: getDefaultDates().endDate, initialBalance: 1000,
};

// --- Sub-components ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics) return null;
    const items = [
        { label: "Initial Balance", value: metrics.initialBalance || metrics.finalBalance - metrics.totalProfit },
        { label: "Total Profit", value: metrics.totalProfit },
        { label: "Win Rate", value: metrics.winRate },
        { label: "Total Trades", value: metrics.totalTrades },
        { label: "Max Drawdown", value: metrics.maxDrawdown },
        { label: "Profit Factor", value: metrics.profitFactor },
        { label: "Final Balance", value: metrics.finalBalance },
    ];
    return (
        <div className="metrics-grid">
            {items.map(m => (
                <div key={m.label} className="metric-item">
                    <span className="metric-label">{m.label}</span>
                    <span className="metric-value">
                        {typeof m.value === "number"
                            ? (m.label.includes("Win Rate") || m.label.includes("Factor") ? `${m.value.toFixed(2)}` : `$${m.value.toFixed(2)}`)
                            : m.value || "N/A"}
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
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [setupDetails, setSetupDetails] = useState({ name: "", description: "" });

    const strategyOptions = useMemo(() => options?.strategies || [], [options]);
    const symbolOptions = useMemo(() => options?.symbols || [], [options]);
    const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

    useEffect(() => {
        if (options.strategies.length > 0 && formData.code === "") {
            setFormData(prev => ({
                ...prev,
                code: options.strategies[0]?.code || "",
                symbol: options.symbols[0] || "",
                timeframe: options.timeframes[0] || "",
                params: options.strategies[0]?.params || {},
            }));
        }
        if (options.strategies.length > 0 && comboData.strategyConfigs[0].code === "") {
            setComboData(prev => ({
                ...prev,
                symbol: options.symbols[0] || "",
                timeframe: options.timeframes[0] || "",
                strategyConfigs: [{ code: options.strategies[0]?.code || "", params: options.strategies[0]?.params || {} }],
            }));
        }
    }, [options, formData.code, comboData.strategyConfigs]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith("param_")) {
            const key = name.replace("param_", "");
            setFormData(prev => ({ ...prev, params: { ...prev.params, [key]: value } }));
        } else setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleComboChange = (e, idx) => {
        const { name, value } = e.target;
        if (name === "strategyCode") {
            const newConfigs = [...comboData.strategyConfigs];
            newConfigs[idx] = { ...newConfigs[idx], code: value };
            setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
        } else setComboData(prev => ({ ...prev, [name]: value }));
    };

    const addStrategyToCombo = () => {
        setComboData(prev => ({
            ...prev,
            strategyConfigs: [...prev.strategyConfigs, { code: strategyOptions[0]?.code || "", params: {} }]
        }));
    };

    const removeStrategyFromCombo = (idx) => {
        setComboData(prev => ({
            ...prev,
            strategyConfigs: prev.strategyConfigs.filter((_, i) => i !== idx)
        }));
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                code: formData.code,
                symbol: formData.symbol.replace("-", "/").toUpperCase(),
                timeframe: formData.timeframe,
                startDate: formData.startDate,
                endDate: formData.endDate,
                initialBalance: Number(formData.initialBalance),
                params: formData.params
            };
            const result = await runNewBacktest(payload);
            setBacktestResults({ main: result, individuals: [] });
        } catch (err) {
            console.error("Single backtest submission failed:", err);
        }
    };

    // ✅ Fully upgraded combo submit
    // --- Combo Strategy Backtest ---
const handleComboSubmit = async (e) => {
    e.preventDefault();
    try {
        // This is the CRITICAL part. It maps the array of objects to an array of strings.
        const strategyCodes = comboData.strategyConfigs
            .map(config => config.code)
            .filter(Boolean); // This ensures no empty codes are sent

        if (!strategyCodes.length) {
            alert("Please select at least one valid strategy.");
            return;
        }

        // This creates the payload with the correct key (`strategyCodes`) and value (array of strings).
        const payload = {
            strategyCodes, 
            symbol: comboData.symbol,
            timeframe: comboData.timeframe,
            startDate: comboData.startDate,
            endDate: comboData.endDate,
            initialBalance: Number(comboData.initialBalance),
        };

        // For debugging, you can check that this new payload is correct.
        console.log("Sending corrected payload to the hook:", payload);

        const result = await runComboBacktest(payload);
        setBacktestResults({
            main: result.combinedResult || result,
            individuals: result.individualResults || []
        });
    } catch (err) {
        console.error("Combo backtest submission failed:", err);
        // The error will be displayed in the UI via the hook's state.
    }
};

    const openSaveModal = () => setIsSaveModalOpen(true);
    const closeSaveModal = () => { setIsSaveModalOpen(false); setSetupDetails({ name: "", description: "" }); };
    const handleSetupChange = (e) => setSetupDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSaveSetup = async (e) => {
        e.preventDefault();
        if (!backtestResults.main) return alert("No backtest to save");
        const payload = {
            name: setupDetails.name,
            description: setupDetails.description,
            symbol: backtestResults.main.symbol,
            timeframe: backtestResults.main.timeframe,
            strategies: backtestResults.main.strategies,
            initialBalance: backtestResults.main.initialBalance,
        };
        try {
            await createSetup(payload);
            alert("Setup saved successfully!");
            closeSaveModal();
        } catch (err) {
            alert(err.message || "Failed to save setup");
        }
    };

    const chartData = useMemo(() => {
        if (!backtestResults.main?.equityCurve) return [];
        return backtestResults.main.equityCurve.map(d => ({ date: d.timestamp || d.date, equity: d.balance || d.equity }));
    }, [backtestResults.main?.equityCurve]);

    const individualCharts = useMemo(() => {
        if (!backtestResults.individuals?.length) return [];
        return backtestResults.individuals.map(ind => ({
            code: ind.strategyName || ind.code,
            data: ind.equityCurve?.map(d => ({ date: d.timestamp || d.date, equity: d.balance || d.equity })) || [],
        }));
    }, [backtestResults.individuals]);

    const pieData = useMemo(() => {
        const metrics = backtestResults.main?.metrics || {};
        if (!metrics.totalTrades) return [];
        const wins = metrics.totalTrades * (metrics.winRate / 100);
        const losses = metrics.totalTrades - wins;
        return [{ name: "Win", value: wins, color: COLORS[0] }, { name: "Loss", value: losses, color: COLORS[1] }];
    }, [backtestResults.main?.metrics]);

    if (loading === 'initial') {
        return <div className="dashboard-container"><h2>Loading backtest data...</h2></div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Backtests</h1>

            {error && (
                <div className="error-box">
                    <h4>An Error Occurred</h4>
                    <p><strong>{error.status ? `Status ${error.status}: ` : ''}</strong>{error.message || 'Please try again.'}</p>
                </div>
            )}

            <div className="forms-container">
                {/* Single Strategy */}
                <form className="backtest-form" onSubmit={handleSingleSubmit}>
                    <h2>Single Strategy Backtest</h2>
                    <label>Strategy:
                        <select name="code" value={formData.code} onChange={handleFormChange}>
                            {strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </select>
                    </label>
                    <label>Symbol:
                        <select name="symbol" value={formData.symbol} onChange={handleFormChange}>
                            {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <label>Timeframe:
                        <select name="timeframe" value={formData.timeframe} onChange={handleFormChange}>
                            {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                    <label>Start Date: <input type="date" name="startDate" value={formData.startDate} onChange={handleFormChange} /></label>
                    <label>End Date: <input type="date" name="endDate" value={formData.endDate} onChange={handleFormChange} /></label>
                    <label>Initial Balance: <input type="number" name="initialBalance" value={formData.initialBalance} onChange={handleFormChange} /></label>
                    <button type="submit" disabled={loading === 'running'}>
                        {loading === 'running' ? "Running..." : "Run Backtest"}
                    </button>
                </form>

                {/* Combo Strategy */}
                <form className="backtest-form" onSubmit={handleComboSubmit}>
                    <h2>Combo Strategy Backtest</h2>
                    {comboData.strategyConfigs.map((config, idx) => (
                        <div key={idx} className="combo-strategy-row">
                            <label>Strategy {idx + 1}:
                                <select value={config.code} name="strategyCode" onChange={(e) => handleComboChange(e, idx)}>
                                    {strategyOptions.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                </select>
                            </label>
                            {comboData.strategyConfigs.length > 1 &&
                                <button type="button" onClick={() => removeStrategyFromCombo(idx)}>Remove</button>
                            }
                        </div>
                    ))}
                    <button type="button" onClick={addStrategyToCombo}>Add Strategy</button>
                    <label>Symbol:
                        <select name="symbol" value={comboData.symbol} onChange={(e) => handleComboChange(e, -1)}>
                            {symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <label>Timeframe:
                        <select name="timeframe" value={comboData.timeframe} onChange={(e) => handleComboChange(e, -1)}>
                            {timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                    <label>Start Date: <input type="date" name="startDate" value={comboData.startDate} onChange={(e) => handleComboChange(e, -1)} /></label>
                    <label>End Date: <input type="date" name="endDate" value={comboData.endDate} onChange={(e) => handleComboChange(e, -1)} /></label>
                    <label>Initial Balance: <input type="number" name="initialBalance" value={comboData.initialBalance} onChange={(e) => handleComboChange(e, -1)} /></label>
                    <button type="submit" disabled={loading === 'running_combo'}>
                        {loading === 'running_combo' ? "Running..." : "Run Combo Backtest"}
                    </button>
                </form>
            </div>

            {backtestResults.main && (
                <div className="results-container">
                    <MetricsDisplay metrics={backtestResults.main.metrics} />

                    <h2>Equity Curves</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {chartData.length && <Line type="monotone" data={chartData} dataKey="equity" name="Combined" stroke={COLORS[2]} />}
                            {individualCharts.map((c, idx) => (
                                <Line key={c.code} type="monotone" data={c.data} dataKey="equity" name={c.code} stroke={COLORS[idx % COLORS.length]} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>

                    {pieData.length > 0 && (
                        <div className="pie-container">
                            <h3>Win / Loss Ratio</h3>
                            <PieChart width={300} height={300}>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                            </PieChart>
                        </div>
                    )}

                    <button onClick={openSaveModal}>Save Backtest Setup</button>

                    {isSaveModalOpen && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <h3>Save Backtest Setup</h3>
                                <form onSubmit={handleSaveSetup}>
                                    <label>Name: <input name="name" value={setupDetails.name} onChange={handleSetupChange} required /></label>
                                    <label>Description: <input name="description" value={setupDetails.description} onChange={handleSetupChange} /></label>
                                    <button type="submit">Save Setup</button>
                                    <button type="button" onClick={closeSaveModal}>Cancel</button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
