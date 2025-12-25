import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import { useBot } from "../hooks/useBot";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup";
import { UIModeProvider } from "../context/UIModeContext";
import TradingBotShell from "./TradingBotShell";
import "./TradingBot.css";
import "../styles/Themes.css";

const TradingBotContainer = () => {
  const { botStatus, logs, loading: botLoading, startBot, stopBot, refreshBotData } = useBot();
  const { setups } = useBacktestSetupFunction();
  const { isConnected, address } = useAccount();

  // --- Configuration State ---
  const [formConfig, setFormConfig] = useState({
    strategyId: "",
    symbol: "BTC-USD",
    timeframe: "1h",
    capitalAllocation: 1000,
    tradingMode: "paper",
    parameters: {},
    strategies: [],
    mlMode: "off",
    mlModel: "",
    mlThreshold: 0.5,
    riskManagementMode: "static",
    riskPercentage: 1,
    hybridMode: "AND",
    growthCapitalTarget: 2000,
    maxDailyLoss: 5,
    maxDrawdown: 10,
    maxTradesPerDay: 20,
    minAtrPct: 0.1,
    minAdxLevel: 0,
    tslAtrMult: 2,
    trendFilterPeriod: 10,
  });

  // --- Dropdown Options State ---
  const [liveWinners, setLiveWinners] = useState([]);
  const [strategyOptions, setStrategyOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" }
  ]);
  const [symbolOptions] = useState(["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"]);
  const [timeframeOptions] = useState(["1m", "5m", "15m", "1h", "4h", "1d"]);
  
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // --- 1. Populate Strategy Dropdown from DB ---
  useEffect(() => {
    if (setups && setups.length > 0) {
      setStrategyOptions(setups.map(s => ({
        id: s._id,
        name: s.name || `${s.symbol} ${s.timeframe} (Auto)`
      })));
    }
  }, [setups]);

  // --- 2. Fetch Live Winners (Optimizer Results) ---
  useEffect(() => {
    const fetchWinners = async () => {
      setLoadingDropdowns(true);
      try {
        const token = localStorage.getItem("token");
        // Ensure no double slashes in URL
        const response = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLiveWinners(response.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load optimizer results");
      } finally {
        setLoadingDropdowns(false);
      }
    };

    if (isConnected) fetchWinners();
  }, [isConnected]);

  // --- Handlers ---

  const handleSetupSelect = (e) => {
    const setupId = e.target.value;
    const selectedSetup = setups.find((setup) => setup._id === setupId);
    if (selectedSetup) {
      setFormConfig((prev) => ({
        ...prev,
        strategyId: setupId,
        symbol: selectedSetup.symbol || "BTC-USD",
        timeframe: selectedSetup.timeframe || "1h",
        parameters: selectedSetup.params || {},
        strategies: selectedSetup.strategies || []
      }));
    }
  };

  const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    setSelectedWinnerId(winnerId);
    // Handle both 'botId' and 'id' formats
    const selectedWinner = liveWinners.find((w) => (w.botId || w.id) === winnerId);
    
    if (selectedWinner) {
        const config = selectedWinner.config || {};
        setFormConfig((prev) => ({
            ...prev,
            symbol: selectedWinner.symbol || prev.symbol,
            strategies: config.strategies || [],
            mlMode: config.mlMode || "off",
            riskPercentage: config.riskPercentage || 1,
            // Spread other config params if they exist
            ...config
        }));
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStart = async () => {
    if (!address) return toast.error("Wallet not connected");
    try {
        await startBot({ ...formConfig, userId: address });
        toast.success("Bot Started!");
    } catch (e) {
        toast.error("Failed to start bot");
    }
  };

  // --- Prepare Data for Shell ---
  const isRunning = botStatus?.status === 'running';
  
  // Safe Chart Data Mapping
  const chartData = useMemo(() => ({
    candleData: botStatus?.candles || [],
    tradeBreakdown: (botStatus?.trades || []).map(t => ({
        ...t,
        price: t.entry_price || t.price,
        exitPrice: t.exit_price || t.exitPrice
    }))
  }), [botStatus]);

  // Patch bot status for UI consistency
  const patchedStatus = {
      ...botStatus,
      currentPosition: botStatus?.activePosition || botStatus?.currentPosition || null,
      positions: botStatus?.activePositions || []
  };

  return (
    <div className="trading-bot-root">
      <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />

      {/* --- USER INPUTS & DROPDOWNS --- */}
      <div className="form-container" style={{ padding: '20px', background: '#111', borderBottom: '1px solid #333' }}>
        <h3 style={{ color: '#10b981', marginBottom: '15px' }}>Mission Control</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
            
            {/* 1. Strategy Type Dropdown */}
            <div className="form-group">
            <label htmlFor="strategyId">Strategy (DB)</label>
            <select
                name="strategyId"
                id="strategyId"
                value={formConfig.strategyId}
                onChange={handleSetupSelect}
                className="form-input"
                disabled={isRunning}
            >
                <option value="">-- Select Strategy --</option>
                {strategyOptions.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                </option>
                ))}
            </select>
            </div>

            {/* 2. Optimizer Results Dropdown */}
            <div className="form-group">
            <label htmlFor="selectedWinnerId">Optimizer Results (File)</label>
            <select
                name="selectedWinnerId"
                id="selectedWinnerId"
                value={selectedWinnerId}
                onChange={handleWinnerSelect}
                className="form-input"
                disabled={loadingDropdowns || isRunning}
            >
                <option value="">-- Load Top Performer --</option>
                {liveWinners.map((winner) => {
                    const id = winner.botId || winner.id;
                    const roi = winner.roi ? (winner.roi * 100).toFixed(0) : 0;
                    return (
                        <option key={id} value={id}>
                            {winner.symbol} (ROI: {roi}%)
                        </option>
                    );
                })}
            </select>
            </div>

            {/* 3. Symbol Dropdown */}
            <div className="form-group">
            <label htmlFor="symbol">Symbol</label>
            <select
                name="symbol"
                id="symbol"
                value={formConfig.symbol}
                onChange={handleFormChange}
                className="form-input"
                disabled={isRunning}
            >
                {symbolOptions.map((symbol) => (
                <option key={symbol} value={symbol}>
                    {symbol}
                </option>
                ))}
            </select>
            </div>

            {/* 4. Timeframe Dropdown */}
            <div className="form-group">
            <label htmlFor="timeframe">Timeframe</label>
            <select
                name="timeframe"
                id="timeframe"
                value={formConfig.timeframe}
                onChange={handleFormChange}
                className="form-input"
                disabled={isRunning}
            >
                {timeframeOptions.map((timeframe) => (
                <option key={timeframe} value={timeframe}>
                    {timeframe}
                </option>
                ))}
            </select>
            </div>

            {/* 5. Risk Mode Dropdown */}
            <div className="form-group">
            <label htmlFor="riskManagementMode">Risk Mode</label>
            <select
                name="riskManagementMode"
                id="riskManagementMode"
                value={formConfig.riskManagementMode}
                onChange={handleFormChange}
                className="form-input"
                disabled={isRunning}
            >
                <option value="static">Static</option>
                <option value="dynamic">Dynamic</option>
            </select>
            </div>

            {/* 6. ML Mode Dropdown */}
            <div className="form-group">
            <label htmlFor="mlMode">Machine Learning Mode</label>
            <select
                name="mlMode"
                id="mlMode"
                value={formConfig.mlMode}
                onChange={handleFormChange}
                className="form-input"
                disabled={isRunning}
            >
                <option value="off">Off</option>
                <option value="predictions">Hybrid</option>
                <option value="on">Pure ML</option>
            </select>
            </div>

            {/* 7. ML Model Dropdown */}
            <div className="form-group">
            <label htmlFor="mlModel">ML Model</label>
            <select
                name="mlModel"
                id="mlModel"
                value={formConfig.mlModel}
                onChange={handleFormChange}
                className="form-input"
                disabled={isRunning}
            >
                <option value="">-- Select ML Model --</option>
                {modelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                    {model.name}
                </option>
                ))}
            </select>
            </div>

            {/* Action Buttons */}
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                {!isRunning ? (
                    <button onClick={handleStart} className="primary-btn" disabled={botLoading}>
                        {botLoading ? "Starting..." : "START ENGINE"}
                    </button>
                ) : (
                    <button onClick={stopBot} className="danger-btn" disabled={botLoading}>
                        STOP ENGINE
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* --- RENDER SHELL (Chart, Logs, etc.) --- */}
      <div style={{ height: 'calc(100vh - 250px)' }}>
        <TradingBotShell 
            botStatus={patchedStatus}
            logs={logs}
            chartData={chartData}
            isRunning={isRunning}
            hasData={chartData.candleData.length > 0}
            // Pass minimal props since we control config above
            formConfig={formConfig}
            setFormConfig={setFormConfig}
            handleStart={handleStart} 
            handleStop={stopBot}
        />
      </div>
    </div>
  );
};

export default function TradingBot() {
  return (
    <UIModeProvider>
      <TradingBotContainer />
    </UIModeProvider>
  );
}
