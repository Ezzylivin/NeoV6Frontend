// Dashboard.jsx
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

  // Fetch live prices
  useEffect(() => {
    const fetchPrices = async () => {
      const res = await fetch(
        "https://neov6backend.onrender.com/api/prices?symbols=BTCUSDT,ETHUSDT,BNBUSDT"
      );
      const data = await res.json();
      if (data.success) setPrices(data.prices);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Fetch historical prices for each symbol
  useEffect(() => {
    const fetchHistory = async () => {
      const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];
      let histData = {};
      for (const s of symbols) {
        const res = await fetch(
          `https://neov6backend.onrender.com/api/prices/history?symbol=${s}&limit=20`
        );
        const data = await res.json();
        if (data.success) {
          histData[s] = data.history
            .map((p) => ({
              time: new Date(p.timestamp).toLocaleTimeString(),
              price: p.price,
            }))
            .reverse(); // oldest first
        }
      }
      setHistory(histData);
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📈 Live Prices</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(prices).map(([symbol, price]) => (
          <div
            key={symbol}
            className="bg-white shadow rounded-2xl p-4 text-center"
          >
            <h3 className="font-bold text-lg">{symbol}</h3>
            <p className="text-2xl font-mono mb-2">
              ${price ? price.toFixed(2) : "..."}
            </p>

            {history[symbol] && (
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={history[symbol]}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#2563eb" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
