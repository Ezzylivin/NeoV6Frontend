// File: src/pages/Dashboard.jsx
import { useEffect, useState, useRef } from "react";
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
  ReferenceDot,
} from "recharts";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

export default function Dashboard() {
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({});
  const [zoomWindow, setZoomWindow] = useState({});
  const targetZoom = useRef({});

  // Round timestamp to 5 minutes
  const roundToFiveMinutes = (date) => {
    const ms = 1000 * 60 * 5;
    return new Date(Math.floor(date.getTime() / ms) * ms);
  };

  // Animate zoom smoothly
  useEffect(() => {
    const anim = setInterval(() => {
      setZoomWindow((prev) => {
        const newZoom = { ...prev };
        let changed = false;
        for (const symbol of SYMBOLS) {
          if (!prev[symbol] || !targetZoom.current[symbol]) continue;
          const { start: currStart, end: currEnd } = prev[symbol];
          const { start: targetStart, end: targetEnd } = targetZoom.current[symbol];

          const step = Math.ceil((targetEnd - targetStart) / 10);
          const newStart =
            currStart < targetStart ? Math.min(currStart + step, targetStart) :
            currStart > targetStart ? Math.max(currStart - step, targetStart) :
            currStart;
          const newEnd =
            currEnd < targetEnd ? Math.min(currEnd + step, targetEnd) :
            currEnd > targetEnd ? Math.max(currEnd - step, targetEnd) :
            currEnd;

          if (newStart !== currStart || newEnd !== currEnd) changed = true;
          newZoom[symbol] = { start: newStart, end: newEnd };
        }
        if (!changed) clearInterval(anim);
        return newZoom;
      });
    }, 30);
    return () => clearInterval(anim);
  }, []);

  // Fetch 24h historical data
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/prices/history?symbols=${SYMBOLS.join(",")}&period=24h`
        );
        const data = await res.json();
        if (data.success) {
          const aggregated = {};
          const initialZoom = {};

          SYMBOLS.forEach(symbol => {
            aggregated[symbol] = [];
            const bucket = {};
            for (const point of data.history[symbol] || []) {
              const time = roundToFiveMinutes(new Date(point.timestamp)).toLocaleTimeString("en-US", {
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
            initialZoom[symbol] = { start: 0, end: aggregated[symbol].length };
          });

          setHistory(aggregated);
          setZoomWindow(initialZoom);
          targetZoom.current = initialZoom;
        }
      } catch (err) {
        console.error("Failed to fetch 24h history:", err);
      }
    };
    fetchHistory();
  }, []);

  // Fetch live prices every minute
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/prices?symbols=${SYMBOLS.join(",")}`);
        const data = await res.json();
        if (data.success) {
          setPrices(data.prices);
          setHistory(prevHistory => {
            const newHistory = { ...prevHistory };
            const now = roundToFiveMinutes(new Date());
            const timeLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            SYMBOLS.forEach(symbol => {
              if (!newHistory[symbol]) newHistory[symbol] = [];
              const lastPoint = newHistory[symbol][newHistory[symbol].length - 1];
              if (lastPoint && lastPoint.time === timeLabel) {
                lastPoint.price = (lastPoint.price + data.prices[symbol]) / 2;
              } else {
                newHistory[symbol].push({ time: timeLabel, price: data.prices[symbol] });
              }
              if (newHistory[symbol].length > 288) newHistory[symbol].shift();
            });

            return newHistory;
          });
        }
      } catch (err) {
        console.error("Failed to fetch live prices:", err);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const setTarget = (symbol, start, end) => {
    targetZoom.current[symbol] = { start, end };
  };

  const zoomIn = (symbol) => {
    const { start, end } = zoomWindow[symbol];
    const delta = Math.floor((end - start) / 4);
    setTarget(symbol, start + delta, end - delta);
  };

  const zoomOut = (symbol) => {
    const fullLength = history[symbol]?.length || 0;
    const { start, end } = zoomWindow[symbol];
    const delta = Math.floor((end - start) / 2);
    setTarget(symbol, Math.max(0, start - delta), Math.min(fullLength, end + delta));
  };

  const resetZoom = (symbol) => {
    const fullLength = history[symbol]?.length || 0;
    setTarget(symbol, 0, fullLength);
  };

  return (
    <div className="p-6 flex flex-col gap-8 bg-black text-white min-h-screen">
      {/* Live Prices */}
      <div>
        <h2 className="text-xl font-bold mb-4">📈 Live Prices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SYMBOLS.map(symbol => (
            <div key={symbol} className="bg-white shadow rounded-2xl p-4 text-center">
              <h3 className="font-bold text-lg">{symbol}</h3>
              <p className="text-2xl font-mono">${prices[symbol]?.toFixed(2) || "..."}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-xl font-bold mb-4">📊 Price Charts (24h)</h2>
        {SYMBOLS.map(symbol => {
          const symbolHistory = history[symbol] || [];
          const { start, end } = zoomWindow[symbol] || { start: 0, end: symbolHistory.length };
          const latestPoint = symbolHistory[symbolHistory.length - 1];

          return (
            <div key={symbol} className="mb-6 bg-white p-4 rounded-2xl shadow">
              <h3 className="font-bold mb-2">{symbol}</h3>
              <div className="mb-2 flex gap-2">
                <button className="px-2 py-1 bg-blue-500 text-white rounded" onClick={() => zoomIn(symbol)}>Zoom In</button>
                <button className="px-2 py-1 bg-blue-500 text-white rounded" onClick={() => zoomOut(symbol)}>Zoom Out</button>
                <button className="px-2 py-1 bg-gray-500 text-white rounded" onClick={() => resetZoom(symbol)}>Reset</button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={symbolHistory.slice(start, end)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={timeStr => {
                      const [hour, minute] = timeStr.split(":");
                      return minute === "00" ? `${hour}:00` : "";
                    }}
                    interval={0}
                  />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
                  {latestPoint && <ReferenceDot x={latestPoint.time} y={latestPoint.price} r={5} fill="red" stroke="none" />}
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
