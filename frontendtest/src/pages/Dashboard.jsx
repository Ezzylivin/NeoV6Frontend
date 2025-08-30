// File: src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({});

  // Fetch live prices every 5s
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          "https://neov6backend.onrender.com/api/prices?symbols=BTCUSDT,ETHUSDT,BNBUSDT"
        );
        const data = await res.json();
        if (data.success) setPrices(data.prices);
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch history for each symbol
  useEffect(() => {
    Object.keys(prices).forEach((symbol) => {
      if (!history[symbol]) fetchHistory(symbol);
    });
  }, [prices]);

  const fetchHistory = async (symbol) => {
    try {
      const res = await fetch(
        `https://neov6backend.onrender.com/api/prices/history?symbol=${symbol}&limit=20`
      );
      const data = await res.json();
      if (data.success) {
        setHistory((prev) => ({ ...prev, [symbol]: data.history }));
      }
    } catch (err) {
      console.error(`Failed to fetch history for ${symbol}:`, err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📈 Live Prices</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(prices).map(([symbol, price]) => (
          <div
            key={symbol}
            className="bg-white shadow rounded-2xl p-4 flex flex-row items-center"
            style={{ height: "120px" }}
          >
            {/* Left: Symbol & Price */}
            <div className="flex-1">
              <h3 className="font-bold text-lg">{symbol}</h3>
              <p className="text-2xl font-mono">
                ${price !== null ? price.toFixed(2) : "..."}
              </p>
            </div>

            {/* Right: Chart */}
            <div className="flex-1 h-full">
              {history[symbol] && history[symbol].length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history[symbol]}>
                    <XAxis dataKey="timestamp" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 mt-6">Loading chart...</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
