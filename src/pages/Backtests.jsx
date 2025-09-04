// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
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

  const [backtests, setBacktests] = useState([]);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [viewMode, setViewMode] = useState("chart"); // chart or table

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

  const normalizeNumber = val => val === null || val === "" || val === undefined ? null : Number(val);
  const formatTimestamp = ts => new Date(ts).toLocaleString();
  const toggleCollapse = idx => setCollapsed(prev => ({ ...prev, [idx]: !prev[idx] }));

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
        stopLoss: normalizeNumber(selectedSL)
      });

      setBacktests([{
        saved, metrics,
        equityCurve, trades,
        label: "(New)",
        params: { symbol: selectedSymbol, timeframe: selectedTimeframe, balance: selectedBalance, strategy: selectedStrategy.name, risk: selectedRisk, takeProfit: selectedTP, stopLoss: selectedSL }
      }]);
    } catch (err) {
      console.error(err);
      setError("Single backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleRunBatchBacktests = async () => {
    setLoadingBatch(true);
    setError(null);
    setBacktests([]);
    try {
      const { results, usedCombos } = await runBatchBacktests({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance
      });

      setBacktests(results.map((r, idx) => ({
        saved: r.saved,
        metrics: r.metrics,
        equityCurve: r.saved?.equityCurve || [],
        trades: r.saved?.tradeBreakdown || [],
        label: `(Batch #${idx + 1})`,
        params: usedCombos[idx]
      })));
    } catch (err) {
      console.error(err);
      setError("Batch backtests failed");
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div>
      <h2>Backtests</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Selectors */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
        {/* symbol, timeframe, balance, strategy, risk, TP, SL */}
        {["Symbol","Timeframe","Balance","Strategy","Risk","Take Profit","Stop Loss"].map((label,i) => {
          const key = label.replace(/ /g,"").toLowerCase();
          let value, setter, list;
          switch(key){
            case "symbol": value=selectedSymbol; setter=setSelectedSymbol; list=options.symbols; break;
            case "timeframe": value=selectedTimeframe; setter=setSelectedTimeframe; list=options.timeframes; break;
            case "balance": value=selectedBalance; setter=setSelectedBalance; list=options.balances; break;
            case "strategy": value=selectedStrategy.name; setter=v=>setSelectedStrategy({name:v,parameters:{}}); list=options.strategies; break;
            case "risk": value=selectedRisk; setter=setSelectedRisk; list=options.risks; break;
            case "takeprofit": value=selectedTP ?? ""; setter=setSelectedTP; list=options.takeProfits; break;
            case "stoploss": value=selectedSL ?? ""; setter=setSelectedSL; list=options.stopLosses; break;
            default: return null;
          }
          return (
            <div key={i}>
              <label>{label}: </label>
              <select value={value} onChange={e=>setter(key==="balance"?Number(e.target.value):normalizeNumber(e.target.value)||e.target.value)}>
                {list.map(opt=>(
                  <option key={opt ?? "none"} value={opt ?? ""}>{opt!==null?opt:"None"}</option>
                ))}
              </select>
            </div>
          )
        })}
        <div><button onClick={handleRunSingleBacktest} disabled={loadingSingle}>{loadingSingle?"Running...":"Run Single Backtest"}</button></div>
        <div><button onClick={handleRunBatchBacktests} disabled={loadingBatch}>{loadingBatch?"Running...":"Run Batch Backtests"}</button></div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ marginBottom: "15px" }}>
        <button onClick={()=>setViewMode("chart")} disabled={viewMode==="chart"}>Charts</button>
        <button onClick={()=>setViewMode("table")} disabled={viewMode==="table"}>Table</button>
      </div>

      {/* Backtests */}
      {backtests.map((bt, idx)=>(
        <div key={idx} style={{ marginBottom:"40px", border:"1px solid #ccc", padding:"10px" }}>
          <h3 onClick={()=>toggleCollapse(idx)} style={{ cursor:"pointer" }}>
            {bt.saved?.symbol||"N/A"} ({bt.saved?.strategy?.name || bt.params?.strategy?.name}) {bt.label} {collapsed[idx]?"[+]":"[-]"}
          </h3>
          {!collapsed[idx] && (
            <>
              <div style={{ display:"flex",gap:"10px", flexWrap:"wrap", marginBottom:"10px" }}>
                {["Net Profit","Win Rate","Max Drawdown","Trades"].map((m,i)=>{
                  const val=bt.metrics?.[m.replace(/ /g,"").toLowerCase()]??0;
                  const color = m==="Net Profit"? (val>=0?"#4caf50":"#f44336"):"#fff";
                  return (
                    <div key={i} style={{padding:"10px",borderRadius:"8px",background:"#1e1e1e",color:color}}>
                      <b>{m}:</b> {val}{m!=="Net Profit"?"":""}
                    </div>
                  )
                })}
              </div>
              <p><b>Parameters:</b> Strategy={bt.params?.strategy?.name||bt.params?.strategy} | Risk={bt.params?.risk} | TP={bt.params?.takeProfit??"None"} | SL={bt.params?.stopLoss??"None"}</p>

              {viewMode==="chart" && (
                <>
                  <h4>Equity Curve</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={bt.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="time" tickFormatter={formatTimestamp}/>
                      <YAxis/>
                      <Tooltip labelFormatter={formatTimestamp}/>
                      <Legend/>
                      <Line type="monotone" dataKey="equity" stroke="#8884d8" dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>

                  <h4>Trades P/L</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bt.trades}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="exitTime" tickFormatter={formatTimestamp}/>
                      <YAxis/>
                      <Tooltip labelFormatter={formatTimestamp}/>
                      <Legend/>
                      <Bar dataKey="profit" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}

              {viewMode==="table" && (
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr><th style={{border:"1px solid #ccc",padding:"5px"}}>Exit Time</th><th style={{border:"1px solid #ccc",padding:"5px"}}>Profit</th></tr>
                  </thead>
                  <tbody>
                    {bt.trades.map((t,i)=>(
                      <tr key={i} style={{background:t.profit>=0?"#e8f5e9":"#ffebee"}}>
                        <td style={{border:"1px solid #ccc",padding:"5px"}}>{formatTimestamp(t.exitTime)}</td>
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
  )
}
