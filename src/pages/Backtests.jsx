// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Backtests.css";

export default function Backtests() {
  const { runBacktest, results, error } = useBacktest();
  const { setupOptions } = useBacktestSetupFunction();
  const { strategies } = useContext(StrategyContext);

  // selectors state
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedTP, setSelectedTP] = useState("");
  const [selectedSL, setSelectedSL] = useState("");

  // multiple strategies setup
  const [activeStrategies, setActiveStrategies] = useState([]);

  useEffect(() => {
    if (setupOptions) {
      setSelectedSymbol(setupOptions.symbols?.[0] || "");
      setSelectedTimeframe(setupOptions.timeframes?.[0] || "");
      setSelectedStrategy(setupOptions.strategies?.[0] || "");
      setSelectedTP(setupOptions.takeProfits?.[0] || "");
      setSelectedSL(setupOptions.stopLosses?.[0] || "");
    }
  }, [setupOptions]);

  // Add strategy configuration
  const handleAddStrategy = () => {
    if (!selectedStrategy || !selectedSymbol || !selectedTimeframe) return;

    const newSetup = {
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      strategy: selectedStrategy,
      takeProfit: selectedTP,
      stopLoss: selectedSL,
    };

    setActiveStrategies([...activeStrategies, newSetup]);
  };

  // Run all backtests
  const handleRunAll = async () => {
    if (activeStrategies.length === 0) return;
    for (const strat of activeStrategies) {
      await runBacktest(strat);
    }
  };

  // Prepare combined equity curve
  const combinedEquity = useMemo(() => {
    if (!results || Object.keys(results).length === 0) return [];
    const curves = Object.values(results).map((r) => r?.equityCurve || []);
    if (curves.length === 0) return [];

    return curves[0].map((_, idx) => {
      const total = curves.reduce((sum, curve) => sum + (curve[idx]?.equity || 0), 0);
      return { step: idx, combinedEquity: total };
    });
  }, [results]);

  return (
    <div className="backtest-dashboard">
      <h1 className="page-title">Backtesting Dashboard</h1>

      {/* --- Setup Controls --- */}
      <div className="setup-controls">
        <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
          {setupOptions?.symbols?.map((sym) => (
            <option key={sym} value={sym}>{sym}</option>
          ))}
        </select>

        <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
          {setupOptions?.timeframes?.map((tf) => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>

        <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
          {setupOptions?.strategies?.map((strat) => (
            <option key={strat} value={strat}>{strat}</option>
          ))}
        </select>

        <select value={selectedTP} onChange={(e) => setSelectedTP(e.target.value)}>
          {setupOptions?.takeProfits?.map((tp) => (
            <option key={tp} value={tp}>{tp}</option>
          ))}
        </select>

        <select value={selectedSL} onChange={(e) => setSelectedSL(e.target.value)}>
          {setupOptions?.stopLosses?.map((sl) => (
            <option key={sl} value={sl}>{sl}</option>
          ))}
        </select>

        <button onClick={handleAddStrategy}>➕ Add Strategy</button>
        <button onClick={handleRunAll}>🚀 Run Backtests</button>
      </div>

      {error && <p className="error-text">❌ Error fetching backtest: {error}</p>}

      {/* --- Active Strategies Section --- */}
      <div className="strategies-grid">
        {activeStrategies.map((setup, idx) => {
          const res = results?.[`${setup.symbol}-${setup.strategy}-${idx}`];
          return (
            <div key={idx} className="strategy-card">
              <h3>
                {setup.symbol} - {setup.strategy} ({setup.timeframe})
              </h3>

              {res ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={res.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="step" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#82ca9d"
                      dot={false}
                      name="Equity Curve"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="placeholder-text">Run backtest to see results.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* --- Combined Equity Curve --- */}
      <div className="combined-chart">
        <h2>📈 Combined Equity Curve</h2>
        {combinedEquity.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={combinedEquity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="combinedEquity"
                stroke="#8884d8"
                dot={false}
                name="Total Equity"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="placeholder-text">No combined data yet.</p>
        )}
      </div>
    </div>
  );
}
