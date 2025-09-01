// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [exchanges, setExchanges] = useState([]);
  const [selectedExchange, setSelectedExchange] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [candles, setCandles] = useState([]);
  const [loadingExchanges, setLoadingExchanges] = useState(true);
  const [loadingCandles, setLoadingCandles] = useState(false);

  // Fetch exchanges on mount
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        setLoadingExchanges(true);
        const res = await axios.get("https://neov6backend.onrender.com/api/exchanges");
        const exchangeList = res.data.exchanges || [];
        setExchanges(exchangeList);

        // Auto-select first exchange & symbol
        if (exchangeList.length > 0) {
          const firstEx = exchangeList[0];
          setSelectedExchange(firstEx.name);
          setSymbols(firstEx.symbols || []);
          if (firstEx.symbols?.length > 0) {
            setSelectedSymbol(firstEx.symbols[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching exchanges:", err);
      } finally {
        setLoadingExchanges(false);
      }
    };
    fetchExchanges();
  }, []);

  // Update symbols when exchange changes
  useEffect(() => {
    if (selectedExchange) {
      const ex = exchanges.find((e) => e.name === selectedExchange);
      setSymbols(ex?.symbols || []);
      if (ex?.symbols?.length > 0) {
        setSelectedSymbol(ex.symbols[0]);
      }
      setCandles([]);
    }
  }, [selectedExchange, exchanges]);

  // Auto-fetch candles when selectedSymbol changes
  useEffect(() => {
    if (selectedExchange && selectedSymbol) {
      fetchCandles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  // Fetch candles for selected symbol
  const fetchCandles = async () => {
    if (!selectedExchange || !selectedSymbol) return;
    setLoadingCandles(true);
    try {
      const res = await axios.get(
        `https://neov6backend.onrender.com/api/candles?exchange=${selectedExchange}&symbol=${selectedSymbol}&timeframe=1h`
      );
      setCandles(res.data || []);
    } catch (err) {
      console.error("Error fetching candles:", err);
    } finally {
      setLoadingCandles(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="mb-4 flex gap-4">
        {loadingExchanges ? (
          <p>Loading exchanges...</p>
        ) : (
          <>
            {/* Exchange Selector */}
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="border p-2"
            >
              <option value="">Select Exchange</option>
              {exchanges.map((ex) => (
                <option key={ex.name} value={ex.name}>
                  {ex.name}
                </option>
              ))}
            </select>

            {/* Symbol Selector */}
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="border p-2"
              disabled={!selectedExchange || symbols.length === 0}
            >
              <option value="">Select Symbol</option>
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={fetchCandles}
              className="bg-blue-500 text-white px-4 py-2 rounded"
              disabled={!selectedSymbol || loadingCandles}
            >
              {loadingCandles ? "Loading..." : "Fetch Chart"}
            </button>
          </>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 400 }}>
        {loadingCandles ? (
          <p>Loading chart data...</p>
        ) : candles.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={candles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
              />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
              />
              <Line type="monotone" dataKey="close" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          !loadingExchanges && <p>No chart data yet. Select exchange & symbol and click "Fetch Chart".</p>
        )}
      </div>
    </div>
  );
}
