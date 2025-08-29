// File: src/pages/Dashboard.jsx
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [prices, setPrices] = useState({});

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

    fetchPrices(); // initial fetch
    const interval = setInterval(fetchPrices, 5000); // refresh every 5s
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
            <p className="text-2xl font-mono">
              ${price !== null ? price.toFixed(2) : "..."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
