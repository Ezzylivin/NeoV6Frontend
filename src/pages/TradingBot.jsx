// File: src/pages/TradingBot.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import { useBot } from "../hooks/useBot";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup";
import { UIModeProvider } from "../context/UIModeContext";
import DeskLayout from "../components/layouts/DeskLayout"; // Import the layout directly
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
    strategies: [], // Array of { code: string, params: object }
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
  });

  const [liveWinners, setLiveWinners] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [selectedSetupId, setSelectedSetupId] = useState("");
  const [scanningWinners, setScanningWinners] = useState(false);

  // --- Fetch Data ---
  const fetchWinners = async () => {
    if (!isConnected) return;
    setScanningWinners(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLiveWinners(Array.isArray(response.data) ? response.data : []);
      toast.success("Alpha Files Loaded");
    } catch (error) {
      toast.error("Failed to load alpha files");
    } finally {
      setScanningWinners(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchWinners();
  }, [isConnected]);

  // --- Handlers (The Fix Logic) ---

  const handleSetupSelect = (e) => {
    const setupId = e.target.value;
    setSelectedSetupId(setupId);
    setSelectedWinnerId(""); // Reset file selection

    const selectedSetup = setups.find((s) => s._id === setupId);
    if (selectedSetup) {
      // Normalize Strategies
      const safeStrategies = (selectedSetup.strategies || []).map(s => ({
        code: s.code || s.name || "unknown",
        params: s.params || s.parameters || {}
      }));

      setFormConfig((prev) => ({
        ...prev,
        strategyId: setupId,
        symbol: selectedSetup.symbol || "BTC-USD",
        timeframe: selectedSetup.timeframe || "1h",
        strategies: safeStrategies,
        mlMode: selectedSetup.mlMode || "off"
      }));
    }
  };

  const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    if (!winnerId) return;
    
    setSelectedWinnerId(winnerId);
    setSelectedSetupId(""); // Reset DB selection

    const selectedWinner = liveWinners.find((w) => (w.botId || w.id) === winnerId);
    
    if (selectedWinner) {
        const config = selectedWinner.config || {};
        
        // 🛠 FIX: Normalize Strategies from File
        const rawStrats = config.strategies || [];
        const safeStrategies = rawStrats.map(s => ({
            code: s.code || "unknown",
            params: s.params || s.parameters || {}
        }));

        setFormConfig((prev) => ({
            ...prev,
            strategyId: "", 
            symbol: selectedWinner.symbol || prev.symbol,
            strategies: safeStrategies, // <--- Now guaranteed to be correct format
            mlMode: config.mlMode || "off",
            riskPercentage: config.riskPercentage || 1,
            mlModel: config.mlModel || prev.mlModel,
            riskManagementMode: config.riskManagementMode || prev.riskManagementMode
        }));

        toast.success(`Loaded: ${selectedWinner.symbol} (${safeStrategies.length} Strategies)`);
    }
  };

  const handleStart = async (e) => {
    if (e) e.preventDefault();
    if (!address) return toast.error("Wallet not connected");
    
    try {
        const payload = {
            ...formConfig,
            userId: address,
            // Ensure combo config is built if multiple strategies exist
            comboConfig: {
                strategyCodes: formConfig.strategies.map(s => s.code),
                combinationRule: formConfig.hybridMode || 'AND'
            }
        };
        await startBot(payload);
        toast.success("Bot Started!");
    } catch (err) {
        toast.error("Start Failed: " + err.message);
    }
  };

  const handleClearLogs = () => { /* Logic to clear logs */ };

  // --- Render Props for Layout ---
  const layoutProps = {
    formConfig, setFormConfig,
    setups, liveWinners,
    selectedSetupId, handleSetupSelect,
    selectedWinnerId, handleWinnerSelect,
    scanningWinners, fetchWinners,
    isRunning: botStatus?.status === 'running',
    botLoading,
    handleStart, 
    handleStop: stopBot,
    handleClearLogs,
    botStatus: { ...botStatus, positions: botStatus?.activePositions || [] },
    logs,
    visibleLogs: logs, // Can filter here if needed
  };

  return (
    <UIModeProvider>
      <div className="trading-bot-root">
        <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
        <DeskLayout {...layoutProps} />
      </div>
    </UIModeProvider>
  );
};

export default TradingBotContainer;
