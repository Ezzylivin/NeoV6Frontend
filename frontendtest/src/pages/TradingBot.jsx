import React, { useState } from "react";
import { useBot } from "../hooks/useBot";

const SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT"];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w'];
const BALANCES = [1000, 5000, 10000, 50000];

export default function TradingBot() {
  const {
    status, logs, loading, error,
    handleStart, handleStop, handleStatus
  } = useBot();

  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);

  const onStart = () => {
    handleStart({ symbol, timeframes: [timeframe], initialBalance });
  };

  return (
    <div className="flex justify-center min-h-screen bg-black text-white p-4">
      <div className="w-full max-w-3xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Trading Bot</h1>

        {/* Dropdown contr*
