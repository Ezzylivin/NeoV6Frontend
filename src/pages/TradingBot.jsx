import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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

  const [liveWinners, setLiveWinners] = useState([]);
  const [strategyOptions, setStrategyOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [symbolOptions, setSymbolOptions] = useState(["BTC-USD", "ETH-USD", "SOL-USD"]);
  const [timeframeOptions, setTimeframeOptions] = useState(["1m", "5m", "1h", "4h", "1d"]);
  
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [selectedSetupId, setSelectedSetupId] = useState("");
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Fetch live winners dynamically from /api/bot/winners
  useEffect(() => {
    const fetchWinners = async () => {
      setLoadingDropdowns(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLiveWinners(response.data || []);
      } catch (error) {
        toast.error("Failed to load optimizer results");
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchWinners();
  }, []);

  // Handle saved strategy selection
  const handleSetupSelect = (e) => {
    const setupId = e.target.value;
    setSelectedSetupId(setupId);
    const selectedSetup = setups.find((setup) => setup._id === setupId);
    if (selectedSetup) {
      setFormConfig((prev) => ({
        ...prev,
        ...selectedSetup,
        symbol: selectedSetup.symbol || "BTC-USD",
        timeframe: selectedSetup.timeframe || "1h",
        parameters: selectedSetup.params || {},
      }));
    }
  };

  // Handle live winner selection
  const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    setSelectedWinnerId(winnerId);
    const selectedWinner = liveWinners.find((winner) => winner.id === winnerId);
    if (selectedWinner) {
      setFormConfig((prev) => ({
        ...prev,
        ...selectedWinner.config,
        symbol: selectedWinner?.symbol || "BTC-USD",
        timeframe: selectedWinner?.timeframe || "1h",
        strategies: selectedWinner?.config?.strategies || [],
      }));
    }
  };

  // Handle generic form updates
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="trading-bot-root">
      <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />

      <div className="form-container">
        {/* 1. Strategy Type Dropdown */}
        <div className="form-group">
          <label htmlFor="strategyId">Strategy</label>
          <select
            name="strategyId"
            id="strategyId"
            value={formConfig.strategyId}
            onChange={handleFormChange}
            className="form-input"
          >
            <option value="">-- Select Strategy --</option>
            {strategyOptions.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Symbol Dropdown */}
        <div className="form-group">
          <label htmlFor="symbol">Symbol</label>
          <select
            name="symbol"
            id="symbol"
            value={formConfig.symbol}
            onChange={handleFormChange}
            className="form-input"
          >
            {symbolOptions.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Timeframe Dropdown */}
        <div className="form-group">
          <label htmlFor="timeframe">Timeframe</label>
          <select
            name="timeframe"
            id="timeframe"
            value={formConfig.timeframe}
            onChange={handleFormChange}
            className="form-input"
          >
            {timeframeOptions.map((timeframe) => (
              <option key={timeframe} value={timeframe}>
                {timeframe}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Risk Mode Dropdown */}
        <div className="form-group">
          <label htmlFor="riskManagementMode">Risk Mode</label>
          <select
            name="riskManagementMode"
            id="riskManagementMode"
            value={formConfig.riskManagementMode}
            onChange={handleFormChange}
            className="form-input"
          >
            <option value="static">Static</option>
            <option value="dynamic">Dynamic</option>
          </select>
        </div>

        {/* 5. ML Mode Dropdown */}
        <div className="form-group">
          <label htmlFor="mlMode">Machine Learning Mode</label>
          <select
            name="mlMode"
            id="mlMode"
            value={formConfig.mlMode}
            onChange={handleFormChange}
            className="form-input"
          >
            <option value="off">Off</option>
            <option value="predictions">Hybrid</option>
            <option value="on">Pure ML</option>
          </select>
        </div>

        {/* (Conditional) 6. ML Hybrid Mode Dropdown */}
        {formConfig.mlMode === "predictions" && (
          <div className="form-group">
            <label htmlFor="hybridMode">ML Hybrid Mode</label>
            <select
              name="hybridMode"
              id="hybridMode"
              value={formConfig.hybridMode}
              onChange={handleFormChange}
              className="form-input"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
              <option value="REGIME">REGIME</option>
            </select>
          </div>
        )}

        {/* 7. ML Model Dropdown */}
        <div className="form-group">
          <label htmlFor="mlModel">ML Model</label>
          <select
            name="mlModel"
            id="mlModel"
            value={formConfig.mlModel}
            onChange={handleFormChange}
            className="form-input"
          >
            <option value="">-- Select ML Model --</option>
            {modelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* 8. Optimizer Results Dropdown */}
        <div className="form-group">
          <label htmlFor="selectedWinnerId">Optimizer Results</label>
          <select
            name="selectedWinnerId"
            id="selectedWinnerId"
            value={selectedWinnerId}
            onChange={handleWinnerSelect}
            className="form-input"
            disabled={loadingDropdowns}
          >
            <option value="">-- Select Optimizer Result --</option>
            {liveWinners.map((winner) => (
              <option key={winner.id} value={winner.id}>
                {winner.name} (ROI: {winner.roi}%)
              </option>
            ))}
          </select>
        </div>
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
