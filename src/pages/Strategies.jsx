import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import api from "../api/apiClient.js";
import { StrategyContext } from "../context/StrategyContext.jsx";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { strategyDefinitions, initialStrategyParams } from "../config/strategyConfig.js"; // ✅ We now import our config
import "./Strategies.css";

// --- Strategy Guides & Defaults ---
// (All removed from here and put in strategyConfig.js)

// --- Default new strategy ---
const initialStrategyState = {
    name: "",
    description: "",
    params: initialStrategyParams // ✅ Use the imported default
};

const Strategies = () => {
    const {
        strategies, setStrategies, comboStrategies, setComboStrategies,
        loading, setLoading, error, setError, success, setSuccess
    } = useContext(StrategyContext);
    
    const { setups } = useBacktestSetupFunction();
    const [newStrategy, setNewStrategy] = useState(initialStrategyState);

    // ✅ --- Create a fast lookup map for strategy names (Performance Fix) ---
    const strategyNameMap = useMemo(() => {
        return new Map(strategies.map(s => [s._id, s.name]));
    }, [strategies]);

    const fetchStrategies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [singleRes, comboRes] = await Promise.all([
                api.get("/strategy"),
                api.get("/combos")
            ]);
            setStrategies(singleRes.data?.strategies || singleRes.data || []);
            setComboStrategies(comboRes.data?.combos || comboRes.data || []);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            console.error("❌ Error fetching strategies:", errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError, setStrategies, setComboStrategies]);

    useEffect(() => {
        fetchStrategies();
    }, [fetchStrategies]);

    const handleStrategyChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? Number(value) : value;

        if (name === "strategyType") {
            // ✅ --- Logic is now 1 simple line, reading from our config ---
            const newParams = strategyDefinitions[value]?.defaultParams || { strategyType: value };
            setNewStrategy(prev => ({ ...prev, params: newParams }));
            // (All the old hard-coded defaultParams are gone)
        } else if (Object.keys(newStrategy.params).includes(name)) {
            setNewStrategy(prev => ({ ...prev, params: { ...prev.params, [name]: finalValue } }));
        } else {
            setNewStrategy(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleCreateStrategy = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await api.post("/strategy", newStrategy);
            setStrategies(prev => [...prev, res.data.strategy]);
            setNewStrategy(initialStrategyState);
            setSuccess("Strategy created successfully!");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message;
            console.error("❌ Error creating strategy:", errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCombo = () => {
        alert("Combo strategy creation UI not yet implemented.");
    };

    const formatLabel = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());

    if (loading && strategies.length === 0) return <p className="loading-banner">⏳ Loading strategies...</p>;

    return (
        <div className="strategies-container">
            <h1 className="header">My Trading Strategies</h1>

            {error && <p className="error-banner">⚠️ {error}</p>}
            {success && <p className="success-banner">✅ {success}</p>}

            <div className="strategy-form">
                <h2 className="card-title">Create a New Strategy</h2>
                <form onSubmit={handleCreateStrategy}>
                    <label>Strategy Type:
                        <select name="strategyType" value={newStrategy.params.strategyType} onChange={handleStrategyChange} className="dashboard-dropdown">
                            {/* ✅ Read from our new config object */}
                            {Object.keys(strategyDefinitions).sort().map(t => <option key={t} value={t}>{strategyDefinitions[t].title}</option>)}
                        </select>
                    </label>
                    <label>Strategy Name:
                        <input type="text" name="name" value={newStrategy.name} onChange={handleStrategyChange} required placeholder="e.g., Fast BTC Scalper" />
                    </label>
                    <label>Description:
                        <textarea name="description" value={newStrategy.description} onChange={handleStrategyChange} placeholder="Describe this strategy's purpose" />
                    </label>
                    <fieldset className="parameters-form">
                        <legend>Parameters</legend>
                        {/* This part works perfectly now. It will show 'tslAtrMult' instead of SL/TP */}
                        {Object.entries(newStrategy.params).filter(([k]) => k !== "strategyType").map(([k, v]) => (
                            <label key={k}>{formatLabel(k)}: <input type="number" name={k} value={v} onChange={handleStrategyChange} step="0.1"/></label>
                        ))}
                    </fieldset>
                    <button type="submit" className="button-add" disabled={loading}>
                        {loading ? 'Creating...' : '➕ Create Strategy'}
                    </button>
                </form>

                {newStrategy.params.strategyType && (
                    <div className="strategy-guide">
                        <h3 className="card-title">Strategy Guide</h3>
                        {/* ✅ Read from our new config object */}
                        <p><strong>What it is:</strong> {strategyDefinitions[newStrategy.params.strategyType]?.whatItIs}</p>
                        <p><strong>How it works:</strong> {strategyDefinitions[newStrategy.params.strategyType]?.howItWorks}</p>
                        <p><strong>Combine with:</strong> {strategyDefinitions[newStrategy.params.strategyType]?.combineWith}</p>
                    </div>
                )}
            </div>

            <div>
                <h2 className="card-title">Saved Single Strategies</h2>
                {strategies.length > 0 ? (
                    <ul className="strategy-list">
                        {strategies.map(s => (
                            <li key={s._id} className="strategy-card">
                                <span className="strategy-name">{s.name}</span>
                                <span className="strategy-type">{s.params?.strategyType}</span>
                            </li>
                        ))}
                    </ul>
                ) : !loading && <p className="no-strategies">No strategies yet. Create your first one above!</p>}
            </div>

            <div>
                <h2 className="card-title">Saved Combo Strategies</h2>
                <button onClick={handleAddCombo} className="button-add">➕ Add Combo Strategy</button>
                {comboStrategies.length > 0 ? (
                    <ul className="strategy-list">
                        {/* ✅ Use index as a safe key fallback (Performance Fix) */}
                        {comboStrategies.map((c, index) => {
                            const strategyNames = Array.isArray(c.strategies)
                                ? c.strategies.map(s => s.params?.strategyType || s.name || "Unknown").join(" + ")
                                : c.comboConfig?.strategyCodes?.join(" + ") || "No strategies";
                            return (
                                <li key={c._id || index} className="strategy-card">
                                    <span className="strategy-name">{c.name}</span>
                                    <span className="strategy-type">{strategyNames}</span>
                                </li>
                            );
                        })}
                    </ul>
                ) : !loading && <p className="no-strategies">No combo strategies yet.</p>}
            </div>

            <div>
                <h2 className="card-title">Saved Backtest Setups</h2>
                {setups.length > 0 ? (
                    <ul className="strategy-list">
                        {setups.map(setup => {
                            const setupType = setup.isCombo ? 'Combo' : 'Single';
                            const setupStrategies = setup.isCombo
                                ? setup.comboConfig?.strategyCodes?.join(' + ')
                                : strategyNameMap.get(setup.strategyId) || 'Unknown Strategy'; // ✅ Use fast lookup map
                            return (
                                <li key={setup._id} className="strategy-card">
                                    <span className="strategy-name">{setup.name} ({setupType})</span>
                                    <span className="strategy-type">
                                        {setup.symbol} @ {setup.timeframe} | {setupStrategies}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : !loading && <p className="no-strategies">No backtest setups saved yet.</p>}
            </div>
        </div>
    );
};

export default Strategies;
