import React, { useState, useEffect, useMemo, useContext } from "react";
import { StrategyContext } from "../context/StrategyContext.jsx";
import "./Strategies.css";

// --- Strategy Guides ---
const strategyGuides = {
    "Moving Average Crossover": { title: "SMA Crossover", whatItIs: "A trend-following strategy using a fast and slow moving average.", howItWorks: "Buy when the fast MA crosses above the slow MA (a 'golden cross'). Sell when it crosses below (a 'death cross').", combineWith: "Combine with ATR for volatility-based stops or RSI to avoid entries in choppy markets." },
    "RSI": { title: "RSI (Relative Strength Index)", whatItIs: "A momentum oscillator indicating overbought (>70) or oversold (<30) conditions.", howItWorks: "Buy when RSI crosses up from below 30. Sell when it crosses down from above 70.", combineWith: "Best used in range-bound markets. Combine with SMAs to confirm the overall trend." },
    "MACD": { title: "MACD", whatItIs: "Shows trend direction and momentum using two moving averages and a signal line.", howItWorks: "Buy when the MACD line crosses above its Signal line. Sell when it crosses below.", combineWith: "Combine with ATR or Bollinger Bands to filter out weak signals." },
    "Bollinger Bands": { title: "Bollinger Bands", whatItIs: "Bollinger Bands use a moving average plus two standard deviations to form upper and lower bands.", howItWorks: "A common mean-reversion strategy is to buy when the price touches the lower band and sell when it touches the upper band.", combineWith: "Combine with RSI or a Stochastic Oscillator to confirm overbought/oversold conditions." },
    "Stochastic Oscillator": { title: "Stochastic Oscillator", whatItIs: "A momentum indicator comparing a closing price to its high-low range over a period.", howItWorks: "Buy when the %K line crosses above the %D line in the oversold area (<20). Sell when %K crosses below %D in the overbought area (>80).", combineWith: "Use with MACD to filter out false signals in strongly trending markets." },
    "Parabolic SAR": { title: "Parabolic SAR", whatItIs: "Places dots on the chart that trail the price, indicating trend direction.", howItWorks: "Buy when the dots flip from being above the price to below it. Sell when they flip from below to above.", combineWith: "Excellent for trend-following. Use a long-period SMA to confirm the overall trend direction." },
    "On-Balance Volume": { title: "On-Balance Volume (OBV)", whatItIs: "Tracks cumulative buying and selling pressure by adding or subtracting volume based on price moves.", howItWorks: "A rising OBV confirms a price uptrend. Look for divergences between OBV and price to anticipate potential reversals.", combineWith: "Use with an SMA on the OBV line itself; trade crossovers of the OBV and its own moving average." },
    "CCI": { title: "CCI (Commodity Channel Index)", whatItIs: "A momentum oscillator used to identify cyclical trends.", howItWorks: "Buy signals can be generated when CCI rises above -100 from oversold conditions. Sell signals when CCI falls below +100 from overbought.", combineWith: "Use with trend indicators like SMAs to trade only in the direction of the larger trend." },
    "ATR": { title: "ATR (Average True Range)", whatItIs: "ATR measures market volatility. It does not indicate price direction.", howItWorks: "A breakout strategy can be used: buy when the price closes above the previous close + (ATR * multiplier).", combineWith: "Best used as a tool for setting stop-loss levels or position sizing for other strategies." },
    "Ichimoku Cloud": { title: "Ichimoku Cloud", whatItIs: "A comprehensive, all-in-one indicator showing trend, momentum, and support/resistance.", howItWorks: "A common bullish signal is when the price is above the cloud, and the conversion line crosses above the base line.", combineWith: "It's a complete system, but can be paired with RSI to confirm entries." }
};

// --- Default new strategy state ---
const initialStrategyState = {
    name: "",
    description: "",
    params: { strategyType: "Moving Average Crossover", shortPeriod: 10, longPeriod: 50, SL: 1, TP: 2 }
};

const Strategies = () => {
    const {
        strategies,
        comboStrategies,
        createStrategy,
        createComboStrategy,
        deleteStrategy,
        deleteComboStrategy,
        loading,
        error,
        success,
        fetchStrategies,
    } = useContext(StrategyContext);

    const [newStrategy, setNewStrategy] = useState(initialStrategyState);

    useEffect(() => {
        fetchStrategies();
    }, [fetchStrategies]);

    const handleStrategyChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? Number(value) : value;

        if (name === "strategyType") {
            const defaultParams = {
                "Moving Average Crossover": { strategyType: value, shortPeriod: 10, longPeriod: 50, SL: 1, TP: 2 },
                "RSI": { strategyType: value, rsiPeriod: 14, overbought: 70, oversold: 30, SL: 1.5, TP: 3 },
                "MACD": { strategyType: value, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SL: 2, TP: 4 },
                "Bollinger Bands": { strategyType: value, period: 20, stdDev: 2, SL: 1, TP: 1.5 },
                "Stochastic Oscillator": { strategyType: value, period: 14, signalPeriod: 3, overbought: 80, oversold: 20, SL: 1, TP: 2 },
                "Parabolic SAR": { strategyType: value, step: 0.02, max: 0.2, SL: 2, TP: 5 },
                "On-Balance Volume": { strategyType: value, obvPeriod: 20, SL: 2, TP: 3 },
                "CCI": { strategyType: value, cciPeriod: 20, overbought: 100, oversold: -100, SL: 1.5, TP: 3 },
                "ATR": { strategyType: value, atrPeriod: 14, atrMultiplier: 2.0, SL: 1, TP: 3 },
                "Ichimoku Cloud": { strategyType: value, conversionPeriod: 9, basePeriod: 26, spanPeriod: 52, displacement: 26, SL: 3, TP: 6 }
            };
            setNewStrategy(prev => ({ ...prev, params: defaultParams[value] || { strategyType: value } }));
        } else if (Object.keys(newStrategy.params).includes(name)) {
            setNewStrategy(prev => ({ ...prev, params: { ...prev.params, [name]: finalValue } }));
        } else {
            setNewStrategy(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleCreateStrategy = async (e) => {
        e.preventDefault();
        const success = await createStrategy(newStrategy);
        if (success) {
            setNewStrategy(initialStrategyState);
        }
    };

    const handleAddCombo = () => {
        // This should ideally open a modal or navigate to a new page for combo creation
        alert("Combo strategy creation UI not yet implemented.");
    };

    const formatLabel = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

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
                            {Object.keys(strategyGuides).sort().map(t => <option key={t} value={t}>{strategyGuides[t].title}</option>)}
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
                        {Object.entries(newStrategy.params).filter(([k]) => k !== "strategyType").map(([k, v]) => (
                            <label key={k}>{formatLabel(k)}: <input type="number" name={k} value={v} onChange={handleStrategyChange} step="0.1" /></label>
                        ))}
                    </fieldset>
                    <button type="submit" className="button-add" disabled={loading}>
                        {loading ? 'Creating...' : '➕ Create Strategy'}
                    </button>
                </form>

                {newStrategy.params.strategyType && (
                    <div className="strategy-guide">
                        <h3 className="card-title">Strategy Guide</h3>
                        <p><strong>What it is:</strong> {strategyGuides[newStrategy.params.strategyType]?.whatItIs}</p>
                        <p><strong>How it works:</strong> {strategyGuides[newStrategy.params.strategyType]?.howItWorks}</p>
                        <p><strong>Combine with:</strong> {strategyGuides[newStrategy.params.strategyType]?.combineWith}</p>
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
                                <button onClick={() => deleteStrategy(s._id)} className="delete-button">🗑️</button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="no-strategies">No single strategies yet. Create your first one above!</p>}
            </div>

            <div>
                <h2 className="card-title">Saved Combo Strategies</h2>
                <button onClick={handleAddCombo} className="button-add">➕ Add Combo Strategy</button>
                {comboStrategies.length > 0 ? (
                    <ul className="strategy-list">
                        {comboStrategies.map(c => {
                             const strategyNames = Array.isArray(c.strategies)
                                ? c.strategies.map(s => s.name || "Unknown").join(" + ")
                                : c.comboConfig?.strategyCodes?.join(" + ") || "No strategies";
                            return (
                                <li key={c._id} className="strategy-card">
                                    <span className="strategy-name">{c.name}</span>
                                    <span className="strategy-type">{strategyNames}</span>
                                    <button onClick={() => deleteComboStrategy(c._id)} className="delete-button">🗑️</button>
                                </li>
                            );
                        })}
                    </ul>
                ) : <p className="no-strategies">No combo strategies yet.</p>}
            </div>
        </div>
    );
};

export default Strategies;
