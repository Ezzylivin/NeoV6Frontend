import React from "react";
import { useBot } from "../hooks/useBot";

export default function TradingBot() {
  const {
    symbol,
    setSymbol,
    availableSymbols,
    status,
    logs,
    loading,
    error,
    startBot,
    stopBot,
    getBotStatus
  } = useBot();

  return (
    <div className="flex justify-center min-h-screen bg-black text-white">
      <div className="w-full max-w-3xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Dropdown for symbols */}
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-full p-2 mb-4 text-black rounded border"
        >
          <option value="">Select a symbol</option>
          {availableSymbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex gap-2 mb-4">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={startBot}
            disabled={loading}
          >
            {loading ? "Starting..." : "Start Bot"}
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={stopBot}
            disabled={loading}
          >
            {loading ? "Stopping..." : "Stop Bot"}
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={getBotStatus}
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </div>

        {error && <div className="text-red-500 mb-4"><strong>Error:</strong> {error}</div>}
        {status && <div className="mb-4"><strong>Status:</strong> {status}</div>}

        {logs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Logs:</h3>
            <ul className="list-disc list-inside">
              {logs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
