// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell, ResponsiveContainer
} from "recharts";

export default function Backtests() {
  const { fetchOptions, runBacktest, runBatchBacktests } = useBacktest();

  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [100,500,1000,5000,10000],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low","Medium","High"],
    takeProfits: [null,1,2,3,5,10],
    stopLosses: [null,0.5,1,2,3,5]
  });

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "SMA", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);

  // NEW: date range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [backtests, setBacktests] = useState([]);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState(null);
  const [collapsedLogs, setCollapsedLogs] = useState({});
  const [viewMode, setViewMode] = useState("chart");

  useEffect(() => {
    async function loadOptions() {
      try {
        const resp = await fetchOptions();
        if (resp?.success && resp?.options) {
          setOptions(prev => ({ ...prev, ...resp.options }));
          if (!selectedSymbol) setSelectedSymbol(resp.options.symbols?.[0] || "BTCUSDT");
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
        setError("Could not load backtest options");
      }
    }
    loadOptions();
  }, [fetchOptions]);

  const normalizeNumber = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const formatTimestamp = ts => ts ? new Date(ts).toLocaleString() : "";
  const toggleLog = idx => setCollapsedLogs(prev => ({ ...prev, [idx]: !prev[idx] }));

  const handleRunSingleBacktest = async () => {
    if (!selectedSymbol) return;
    setLoadingSingle(true);
    setError(null);
    setBacktests([]);
    try {
      const { saved, metrics, equityCurve, trades } = await runBacktest({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: normalizeNumber(selectedTP),
        stopLoss: normalizeNumber(selectedSL),
        startDate: startDate || null,
        endDate: endDate || null
      });

      setBacktests([{
        saved,
        metrics: {
          netProfit: metrics?.netProfit ?? 0,
          winRate: metrics?.winRate ?? 0,
          maxDrawdown: metrics?.maxDrawdown ?? 0,
          tradesCount: metrics?.tradesCount ?? 0
        },
        equityCurve: equityCurve || [],
        trades: trades || [],
        label: "(New)",
        params: { symbol: selectedSymbol, timeframe: selectedTimeframe, balance: selectedBalance, strategy: selectedStrategy.name, risk: selectedRisk, takeProfit: selectedTP, stopLoss: selectedSL, startDate, endDate }
      }]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleRunBatchBacktests = async () => {
    setLoadingBatch(true);
    setError(null);
    setBacktests([]);
    try {
      await runBatchBacktests({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        startDate: startDate || null,
        endDate: endDate || null
      }, (progress) => {
        // Live update for each combo
        const { idx, total, currentResult, resultsSoFar } = progress;
        setBacktests([...resultsSoFar]);
      });
    } catch (err) {
      console.error("Batch run failed:", err);
      setError("Batch backtests failed");
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div>
      <h2>Backtests</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Controls */}
      <div style={{ display:"flex", gap:"15px", flexWrap:"wrap", marginBottom:"15px" }}>
        {/* ... your existing controls ... */}
        <div><button onClick={handleRunSingleBacktest} disabled={loadingSingle}>{loadingSingle?"Running...":"Run Single Backtest"}</button></div>
        <div><button onClick={handleRunBatchBacktests} disabled={loadingBatch}>{loadingBatch?"Running...":"Run Batch Backtests"}</button></div>
        <div><button onClick={()=>setViewMode(viewMode==="chart"?"table":"chart")}>Switch to {viewMode==="chart"?"Table":"Charts"}</button></div>
      </div>

      {/* Backtest Results */}
      {backtests.map((bt, idx)=>(
        <div key={idx} style={{marginBottom:"40px",border:"1px solid #ccc",padding:"10px"}}>
          <h3 style={{cursor:"pointer"}} onClick={()=>toggleLog(idx)}>
            {bt.saved?.symbol || bt.params?.symbol || "N/A"} 
            ({bt.saved?.strategy?.name || bt.params?.strategy?.name || bt.params?.strategy}) 
            {bt.label} {collapsedLogs[idx] ? "[+]" : "[-]"}
          </h3>

          {!collapsedLogs[idx] && (
            <>
              {/* Metrics */}
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"10px"}}>
                <div style={{padding:"10px",borderRadius:"8px",background:"#1e1e1e",color:bt.metrics.netProfit>=0?"#4caf50":"#f44336"}}><b>Net Profit:</b> {bt.metrics.netProfit}</div>
                <div style={{padding:"10px",borderRadius:"8px",background:"#1e1e1e",color:"#ccc"}}><b>Win Rate:</b> {bt.metrics.winRate}%</div>
                <div style={{padding:"10px",borderRadius:"8px",background:"#1e1e1e",color:"#ccc"}}><b>Max Drawdown:</b> {bt.metrics.maxDrawdown}%</div>
                <div style={{padding:"10px",borderRadius:"8px",background:"#1e1e1e",color:"#ccc"}}><b>Trades:</b> {bt.metrics.tradesCount}</div>
              </div>

              <p><b>Parameters:</b> Strategy={bt.params.strategy?.name||bt.params.strategy} | Risk={bt.params.risk} | TP={bt.params.takeProfit??"None"} | SL={bt.params.stopLoss??"None"} | Start={bt.params.startDate||"All"} | End={bt.params.endDate||"All"}</p>

              {viewMode==="chart" ? (
                <>
                  <h4>Equity Curve</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={bt.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="time" tickFormatter={ts => ts ? new Date(ts).toLocaleTimeString() : ""}/>
                      <YAxis/>
                      <Tooltip labelFormatter={ts => ts ? new Date(ts).toLocaleString() : ""}/>
                      <Legend/>
                      <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>

                  <h4>Trades P/L</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bt.trades}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="exitTime" tickFormatter={ts => ts ? new Date(ts).toLocaleTimeString() : ""}/>
                      <YAxis/>
                      <Tooltip labelFormatter={ts => ts ? new Date(ts).toLocaleString() : ""}/>
                      <Legend/>
                      <Bar dataKey="profit">
                        {bt.trades.map((t,i)=><Cell key={i} fill={t.profit>=0?"#4caf50":"#f44336"}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th>Exit Time</th><th>Profit</th></tr></thead>
                  <tbody>
                    {bt.trades.map((t,i)=>(
                      <tr key={i} style={{background:t.profit>=0?"#e8f5e9":"#ffebee"}}>
                        <td style={{border:"1px solid #ccc",padding:"5px",color:"#333"}}>{t.exitTime ? new Date(t.exitTime).toLocaleString() : ""}</td>
                        <td style={{border:"1px solid #ccc",padding:"5px",color:t.profit>=0?"#4caf50":"#f44336"}}>{t.profit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
