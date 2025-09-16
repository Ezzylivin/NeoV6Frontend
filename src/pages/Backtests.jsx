// File: src/pages/Backtests.jsx
// UPGRADED: Full component with crypto defaults, correct data handling, and no placeholders.

import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import "./Backtests.css";

export default function Backtests() {
    const {
        options,
        pastBacktests,
        loading,
        error,
        runNewBacktest,
        runNewBatchBacktest,
    } = useBacktest();

    // Default formData is now a valid crypto example
    const [formData, setFormData] = useState({
        strategyId: "",
        symbol: "BTC/USD",
        timeframe: "1d",
        startDate: "2024-01-01",
        endDate: "2025-09-15",
        takeProfit: "5",
        stopLoss: "2",
    });

    const [batchConfigs, setBatchConfigs] = useState([{ ...formData }]);
    const [metricsData, setMetricsData] = useState([]); // Will hold the equity curve array

    // Handle input changes
    const handleChange = (e, index = null) => {
        const { name, value } = e.target;
        if (index !== null) {
            const newBatch = [...batchConfigs];
            newBatch[index][name] = value;
            setBatchConfigs(newBatch);
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    // Add/remove batch row
    const addBatchRow = () => setBatchConfigs([...batchConfigs, { ...formData }]);
    const removeBatchRow = (i) => setBatchConfigs(batchConfigs.filter((_, idx) => idx !== i));

    // Run single backtest
    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        setMetricsData([]); // Clear previous results
        try {
            const result = await runNewBacktest(formData);
            if (result?.data?.metrics?.equityCurve) {
                setMetricsData(result.data.metrics.equityCurve);
            }
        } catch (err) {
            console.error("Single backtest failed:", err);
        }
    };

    // Run batch backtests
    const handleBatchSubmit = async (e) => {
        e.preventDefault();
        setMetricsData([]); // Clear previous results
        try {
            const result = await runNewBatchBacktest(batchConfigs);
            const firstSuccessfulResult = result?.data?.find(res => res.metrics);
            if (firstSuccessfulResult?.metrics?.equityCurve) {
                setMetricsData(firstSuccessfulResult.metrics.equityCurve);
            }
        } catch (err) {
            console.error("Batch backtest failed:", err);
        }
    };

    // Generate TP/SL options
    const tpSlOptions = [0.5, 1, 2, 3, 5, 10, 20].map((val) => (
        <option key={val} value={val}>{val}%</option>
    ));

    return (
        <div className="dashboard-container">
            <h2 className="header">Backtests</h2>

            {error && <div className="error-banner">{error}</div>}

            {/* --- Single Backtest Form --- */}
            <form className="card-row" onSubmit={handleSingleSubmit}>
                <div className="metric-card">
                    <h3 className="card-title">Single Backtest</h3>

                    <label>
                        Strategy
                        <select name="strategyId" value={formData.strategyId} onChange={handleChange} required>
                            <option value="">Select strategy</option>
                            {options.strategies.map((s) => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Symbol
                        <select name="symbol" value={formData.symbol} onChange={handleChange} required>
                            <option value="">Select symbol</option>
                            {options.symbols.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Timeframe
                        <select name="timeframe" value={formData.timeframe} onChange={handleChange} required>
                            <option value="">Select timeframe</option>
                            {options.timeframes.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Start Date
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
                    </label>

                    <label>
                        End Date
                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
                    </label>

                    <label>
                        Take Profit %
                        <select name="takeProfit" value={formData.takeProfit} onChange={handleChange}>
                            <option value="">Select TP</option>
                            {tpSlOptions}
                        </select>
                    </label>

                    <label>
                        Stop Loss %
                        <select name="stopLoss" value={formData.stopLoss} onChange={handleChange}>
                            <option value="">Select SL</option>
                            {tpSlOptions}
                        </select>
                    </label>

                    <button type="submit" disabled={loading}>
                        {loading ? "Running..." : "Run Backtest"}
                    </button>
                </div>
            </form>

            {/* --- Batch Backtests Form --- */}
            <form className="card-row" onSubmit={handleBatchSubmit}>
                {batchConfigs.map((config, idx) => (
                    <div className="metric-card" key={idx}>
                        <h3 className="card-title">Batch #{idx + 1}</h3>

                        <label>
                            Strategy
                            <select name="strategyId" value={config.strategyId} onChange={(e) => handleChange(e, idx)} required>
                                <option value="">Select strategy</option>
                                {options.strategies.map((s) => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Symbol
                            <select name="symbol" value={config.symbol} onChange={(e) => handleChange(e, idx)} required>
                                <option value="">Select symbol</option>
                                {options.symbols.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Timeframe
                            <select name="timeframe" value={config.timeframe} onChange={(e) => handleChange(e, idx)} required>
                                <option value="">Select timeframe</option>
                                {options.timeframes.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Start Date
                            <input type="date" name="startDate" value={config.startDate} onChange={(e) => handleChange(e, idx)} required />
                        </label>

                        <label>
                            End Date
                            <input type="date" name="endDate" value={config.endDate} onChange={(e) => handleChange(e, idx)} required />
                        </label>

                        <label>
                            Take Profit %
                            <select name="takeProfit" value={config.takeProfit} onChange={(e) => handleChange(e, idx)}>
                                <option value="">Select TP</option>
                                {tpSlOptions}
                            </select>
                        </label>

                        <label>
                            Stop Loss %
                            <select name="stopLoss" value={config.stopLoss} onChange={(e) => handleChange(e, idx)}>
                                <option value="">Select SL</option>
                                {tpSlOptions}
                            </select>
                        </label>

                        <div style={{ marginTop: "8px" }}>
                            {idx === batchConfigs.length - 1 && <button type="button" onClick={addBatchRow}>Add Row</button>}
                            {batchConfigs.length > 1 && <button type="button" onClick={() => removeBatchRow(idx)}>Remove Row</button>}
                        </div>
                    </div>
                ))}
                {batchConfigs.length > 0 && (
                    <div style={{ width: "100%", marginTop: "1rem" }}>
                        <button type="submit" disabled={loading}>
                            {loading ? "Running Batch..." : "Run Batch Backtests"}
                        </button>
                    </div>
                )}
            </form>

            {/* --- Metrics Charts --- */}
            {metricsData.length > 0 && (
                <div className="chart-container">
                    <h3 className="chart-header">Performance Metrics</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={metricsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tickFormatter={(timeStr) => new Date(timeStr).toLocaleDateString()} />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: "#2D3748", borderColor: "#4A5568" }} />
                            <Legend />
                            <Line type="monotone" dataKey="equity" name="Equity Curve" stroke="#3182CE" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* --- Past Backtests Table --- */}
            <div className="card-row">
                {pastBacktests.results.map((b) => (
                    <div className="metric-card" key={b._id}>
                        <div className="card-title">{b.strategyName}</div>
                        <div className="card-value">{b.symbol}</div>
                        <div>Timeframe: {b.timeframe}</div>
                        <div>Start: {new Date(b.startDate).toLocaleDateString()}</div>
                        <div>End: {new Date(b.endDate).toLocaleDateString()}</div>
                        <div>Take Profit: {b.tp}%</div>
                        <div>Stop Loss: {b.sl}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
