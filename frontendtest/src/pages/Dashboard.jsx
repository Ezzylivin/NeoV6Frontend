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
  Brush,
} from "recharts";

export default function Dashboard() {
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({});
  const [zoomWindow, setZoomWindow] = useState({}); // tracks zoom for each symbol
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

  const roundToFiveMinutes = (date) => {
    const ms = 1000 * 60 * 5;
    return new Date(Math.floor(date.getTime() / ms) * ms);
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `https://neov6backend.onrender.com/api/prices/history?symbols=${symbols.join(
            ","
          )}&period=24h`
        );
        const data = await res.json();
        if (data.success) {
          const aggregated = {};
          const initialZoom = {};
          for (const symbol of symbols) {
            aggregated[symbol] = [];
            const bucket = {};
            for (const point of data.history[symbol]) {
              const time = roundToFiveMinutes(new Date(point.time)).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              if (!bucket[time]) bucket[time] = [];
              bucket[time].push(point.price);
            }
            for (const time in bucket) {
              const avg = bucket[time].reduce((a, b) => a + b, 0) / bucket[time].length;
              aggregated[symbol].push({ time, price: avg });
            }
            initialZoom[symbol] = { start: 0, end: aggregated[symbol].length }; // full zoom
          }
          setHistory(aggregated);
          setZoomWindow(initialZoom);
        }
      } catch (err) {
        console.error("Failed to fetch 24h history:", err);
      }
    };

    const fetchPrices = async () => {
      try {
        const res = await fetch(
          `https://neov6backend.onrender.com/api/prices?symbols=${symbols.join(",")}`
        );
        const data = await res.json();
        if (data.success) {
          setPrices(data.prices);

          setHistory((prevHistory) => {
            const newHistory = { ...prevHistory };
            const now = roundToFiveMinutes(new Date());
            const timeLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            for (const symbol of symbols) {
              if (!newHistory[symbol]) newHistory[symbol] = [];
              const lastPoint = newHistory[symbol][newHistory[symbol].length - 1];
              if (lastPoint && lastPoint.time === timeLabel) {
                lastPoint.price = (lastPoint.price + data.prices[symbol]) / 2;
              } else {
                newHistory[symbol].push({ time: timeLabel, price: data.prices[symbol] });
              }
              if (newHistory[symbol].length > 288) newHistory[symbol].shift();
            }
            return newHistory;
          });
        }
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    };

    fetchHistory();
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const zoomIn = (symbol) => {
    setZoomWindow((prev) => {
      const { start, end } = prev[symbol];
      const delta = Math.floor((end - start) / 4);
      return { ...prev, [symbol]: { start: start + delta, end: end - delta } };
    });
  };

  const zoomOut = (symbol) => {
    setZoomWindow((prev) => {
      const fullLength = history[symbol]?.length || 0;
      const { start, end } = prev[symbol];
      const delta = Math.floor((end - start) / 2);
      return {
        ...prev,
        [symbol]: {
          start: Math.max(0, start - delta),
          end: Math.min(fullLength, end + delta),
        },
      };
    });
  };

  const resetZoom = (symbol) => {
    setZoomWindow((prev) => ({
      ...prev,
      [symbol]: { start: 0, end: history[symbol]?.length || 0 },
    }));
  };

  return (
    <div className="p-6 flex gap-4">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">📈 Live Prices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(prices).map(([symbol, price]) => (
            <div key={symbol} className="bg-white shadow rounded-2xl p-4 text-center">
              <h3 className="font-bold text-lg">{symbol}</h3>
              <p className="text-2xl font-mono">
                ${price !== null ? price.toFixed(2) : "..."}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">📊 Price Charts (24h)</h2>
        {Object.entries(history).map(([symbol, symbolHistory]) => {
          const { start, end } = zoomWindow[symbol] || { start: 0, end: symbolHistory.length };
          return (
            <div key={symbol} className="mb-6 bg-white p-4 rounded-2xl shadow">
              <h3 className="font-bold mb-2">{symbol}</h3>
              {/* Zoom controls */}
              <div className="mb-2 flex gap-2">
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                  onClick={() => zoomIn(symbol)}
                >
                  Zoom In
                </button>
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                  onClick={() => zoomOut(symbol)}
                >
                  Zoom Out
                </button>
                <button
                  className="px-2 py-1 bg-gray-500 text-white rounded"
                  onClick={() => resetZoom(symbol)}
                >
                  Reset
                </button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={symbolHistory.slice(start, end)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
                  <Brush dataKey="time" height={30} stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
