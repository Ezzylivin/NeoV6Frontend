// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell, ResponsiveContainer
} from "recharts";

export default function Backtests() {
  const { fetchOptions, runBacktest, runBatchBacktests, runRealisticBacktest } = useBacktest();

  const [options, setOptions] = useState({
    symbols: [],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [],
    strategies: [],
    risks: [],
    takeProfits: [null,1,2,3,5,10],
    stopLosses: [null,0.5,1,2,3,5],
    positions: ["Long","Short","Both"]
  });

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [selectedBalance, setSelectedBalance] = useState(1000);
  const [selectedStrategy, setSelectedStrategy] = useState({ name: "", parameters: {} });
  const [selectedRisk, setSelectedRisk] = useState("Medium");
  const [selectedTP, setSelectedTP] = useState(null);
  const [selectedSL, setSelectedSL] = useState(null);
  const [positionSide, setPositionSide] = useState("Both");

  const [useNews, setUseNews] = useState(false);
  const [useSlippage, setUseSlippage] = useState(false);
  const [useSpread, setUseSpread] = useState(false);
  const [useRandomEvents, setUseRandomEvents] = useState(false);
  const [baseSlippageBps, setBaseSlippageBps] = useState(5);

  const [backtests, setBacktests] = useState([]);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState(null);
  const [collapsedLogs, setCollapsedLogs] = useState({});
  const [viewMode, setViewMode] = useState("chart");

  // Load options from backend
  useEffect(() => {
    async function loadOptions() {
      try {
        const resp = await fetchOptions();
        if (resp) {
          setOptions(prev => ({
            ...prev,
            symbols: resp.symbols ?? prev.symbols,
            strategies: resp.strategies?.map(s => s.name) ?? prev.strategies,
            risks: resp.risks ?? prev.risks,
            balances: resp.balances ?? prev.balances
          }));
          if (!selectedSymbol) setSelectedSymbol(resp.symbols?.[0] ?? "");
          if (!selectedStrategy.name && resp.strategies?.[0]) setSelectedStrategy({ name: resp.strategies[0].name, parameters: {} });
        }
      } catch (err) {
        console.error("Failed to fetch options:", err);
        setError("Could not load backtest options");
      }
    }
    loadOptions();
  }, [fetchOptions]);

  const normalizeNumber = val => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const formatTimestamp = ts => ts ? new Date(ts).toLocaleString() : "";
  const toggleLog = idx => setCollapsedLogs(prev => ({ ...prev, [idx]: !prev[idx] }));

  // Run single backtest
  const handleRunSingleBacktest = async (realistic = false) => {
    if (!selectedSymbol || !selectedStrategy.name) return;
    setLoadingSingle(true);
    setError(null);
    setBacktests([]);
    try {
      const fn = realistic ? runRealisticBacktest : runBacktest;
      const { saved = {}, metrics = {}, equityCurve = [], trades = [] } = await fn({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: normalizeNumber(selectedTP),
        stopLoss: normalizeNumber(selectedSL),
        positionSide,
        useNews,
        useSlippage,
        useSpread,
        useRandomEvents,
        baseSlippageBps
      });

      setBacktests([{
        saved,
        metrics: {
          netProfit: metrics.netProfit ?? 0,
          winRate: metrics.winRate ?? 0,
          maxDrawdown: metrics.maxDrawdown ?? 0,
          tradesCount: metrics.tradesCount ?? 0
        },
        equityCurve,
        trades,
        label: realistic ? "(Realistic)" : "(New)",
        params: {
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          balance: selectedBalance,
          strategy: selectedStrategy.name,
          risk: selectedRisk,
          takeProfit: selectedTP,
          stopLoss: selectedSL,
          positionSide,
          useNews,
          useSlippage,
          useSpread,
          useRandomEvents,
          baseSlippageBps
        }
      }]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoadingSingle(false);
    }
  };

  // Run batch backtests
  const handleRunBatchBacktests = async () => {
    setLoadingBatch(true);
    setError(null);
    setBacktests([]);
    try {
      const { results, usedCombos } = await runBatchBacktests({
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        initialBalance: selectedBalance,
        strategy: selectedStrategy,
        risk: selectedRisk,
        takeProfit: normalizeNumber(selectedTP),
        stopLoss: normalizeNumber(selectedSL),
        positionSide,
        useNews,
        useSlippage,
        useSpread,
        useRandomEvents,
        baseSlippageBps
      });

      const mapped = results.map((r, idx) => {
        const saved = r.saved || {};
        const metrics = r.metrics || {};
        return {
          saved,
          metrics: {
            netProfit: metrics.netProfit ?? 0,
            winRate: metrics.winRate ?? 0,
            maxDrawdown: metrics.maxDrawdown ?? 0,
            tradesCount: metrics.tradesCount ?? 0
          },
          equityCurve: r.equityCurve || saved.equityCurve || [],
          trades: r.trades || saved.tradeBreakdown || [],
          label: `(Batch #${idx + 1})`,
          params: usedCombos[idx] || {},
        };
      });

      setBacktests(mapped);
    } catch (err) {
      console.error("Batch run failed:", err);
      setError("Batch backtests failed");
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Backtests</h2>
      {error && <p className="text-red-500">{error}</p>}

      {/* === Controls === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label>Symbol</label>
          <select value={selectedSymbol} onChange={e=>setSelectedSymbol(e.target.value)}>
            {options.symbols?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label>Timeframe</label>
          <select value={selectedTimeframe} onChange={e=>setSelectedTimeframe(e.target.value)}>
            {options.timeframes?.map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>

        <div>
          <label>Balance</label>
          <select value={selectedBalance} onChange={e=>setSelectedBalance(Number(e.target.value))}>
            {options.balances?.map(b => <option key={b} value={b}>${b}</option>)}
          </select>
        </div>

        <div>
          <label>Strategy</label>
          <select value={selectedStrategy.name} onChange={e=>setSelectedStrategy({name:e.target.value, parameters:{}})}>
            {options.strategies?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label>Risk</label>
          <select value={selectedRisk} onChange={e=>setSelectedRisk(e.target.value)}>
            {options.risks?.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label>Position</label>
          <select value={positionSide} onChange={e=>setPositionSide(e.target.value)}>
            {options.positions?.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label>Take Profit (%)</label>
          <select value={selectedTP??""} onChange={e=>setSelectedTP(normalizeNumber(e.target.value))}>
            {options.takeProfits?.map(tp => <option key={tp??"none"} value={tp??""}>{tp!==null?tp+"%":"None"}</option>)}
          </select>
        </div>

        <div>
          <label>Stop Loss (%)</label>
          <select value={selectedSL??""} onChange={e=>setSelectedSL(normalizeNumber(e.target.value))}>
            {options.stopLosses?.map(sl => <option key={sl??"none"} value={sl??""}>{sl!==null?sl+"%":"None"}</option>)}
          </select>
        </div>

        {/* Realism toggles */}
        <div>
          <label><input type="checkbox" checked={useNews} onChange={e=>setUseNews(e.target.checked)}/> Use News</label>
        </div>
        <div>
          <label><input type="checkbox" checked={useSlippage} onChange={e=>setUseSlippage(e.target.checked)}/> Use Slippage</label>
        </div>
        <div>
          <label><input type="checkbox" checked={useSpread} onChange={e=>setUseSpread(e.target.checked)}/> Use Spread</label>
        </div>
        <div>
          <label><input type="checkbox" checked={useRandomEvents} onChange={e=>setUseRandomEvents(e.target.checked)}/> Random Events</label>
        </div>
        <div>
          <label>Base Slippage (bps)</label>
          <input type="number" value={baseSlippageBps} onChange={e=>setBaseSlippageBps(Number(e.target.value))} />
        </div>

        <div>
          <button onClick={()=>handleRunSingleBacktest(false)} disabled={loadingSingle}>{loadingSingle?"Running...":"Run Single"}</button>
        </div>
        <div>
          <button onClick={()=>handleRunSingleBacktest(true)} disabled={loadingSingle}>{loadingSingle?"Running...":"Run Realistic"}</button>
        </div>
        <div>
          <button onClick={handleRunBatchBacktests} disabled={loadingBatch}>{loadingBatch?"Running...":"Run Batch"}</button>
        </div>
        <div>
          <button onClick={()=>setViewMode(viewMode==="chart"?"table":"chart")}>Switch to {viewMode==="chart"?"Table":"Charts"}</button>
        </div>
      </div>

      {/* === Backtest Results === */}
      {backtests.map((bt, idx) => (
        <div key={idx} className="border p-3 rounded mt-4">
          <h3 onClick={()=>toggleLog(idx)} style={{cursor:"pointer"}}>
            {bt.saved?.symbol || bt.params?.symbol || "N/A"} 
            ({bt.saved?.strategy?.name || bt.params?.strategy}) {bt.label} {collapsedLogs[idx]?"[+]":"[-]"}
          </h3>

          {!collapsedLogs[idx] && (
            <>
              {/* Metrics */}
              <div className="flex gap-2 flex-wrap my-2">
                <div className={`p-2 rounded ${bt.metrics.netProfit>=0?"bg-green-200":"bg-red-200"}`}>Net Profit: {bt.metrics.netProfit}</div>
                <div className="p-2 rounded bg-gray-200">Win Rate: {bt.metrics.winRate}%</div>
                <div className="p-2 rounded bg-gray-200">Max Drawdown: {bt.metrics.maxDrawdown}%</div>
                <div className="p-2 rounded bg-gray-200">Trades: {bt.metrics.tradesCount}</div>
              </div>

              {viewMode==="chart" ? (
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
                      <Bar dataKey="profit">
                        {bt.trades.map((t,i)=><Cell key={i} fill={t.profit>=0?"#4caf50":"#f44336"}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <table className="w-full border-collapse border">
                  <thead>
                    <tr>
                      <th>Exit Time</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bt.trades.map((t,i)=>(
                      <tr key={i} className={t.profit>=0?"bg-green-100":"bg-red-100"}>
                        <td className="border p-1">{formatTimestamp(t.exitTime)}</td>
                        <td className="border p-1">{t.profit}</td>
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
