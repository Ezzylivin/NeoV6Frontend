import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({}); // Stores historical data for charts

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          "https://neov6backend.onrender.com/api/prices?symbols=BTCUSDT,ETHUSDT,BNBUSDT"
        );
        const data = await res.json();
        if (data.success) {
          setPrices(data.prices);

          // Update history with new prices
          setHistory((prevHistory) => {
            const newHistory = { ...prevHistory };
            for (const symbol in data.prices) {
              if (!newHistory[symbol]) {
                newHistory[symbol] = [];
              }
              // Add new data point with a timestamp
              newHistory[symbol].push({
                time: new Date().toLocaleTimeString(), // Or a more robust timestamp
                price: data.prices[symbol],
              });

              // Optional: Limit the number of data points to keep the chart manageable
              if (newHistory[symbol].length > 30) {
                newHistory[symbol].shift(); // Remove the oldest data point
              }
            }
            return newHistory;
          });
        }
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 flex gap-4">
      <div className="flex-1">
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

      {/* Charts on the right */}
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">📊 Price Charts</h2>
        {Object.entries(history).map(([symbol, symbolHistory]) => (
          <div key={symbol} className="mb-6 bg-white p-4 rounded-2xl shadow">
            <h3 className="font-bold mb-2">{symbol}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={symbolHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" /> {/* Use 'time' for X-axis */}
                <YAxis
                  domain={['auto', 'auto']} // Let Recharts determine the Y-axis scale dynamically
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#8884d8"
                  dot={false} // Optional: remove dots for a cleaner line chart
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
