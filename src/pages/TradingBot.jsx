import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import { useBot } from "../hooks/useBot";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup";
import { UIModeProvider } from "../context/UIModeContext";
import DeskLayout from "../components/layouts/DeskLayout"; 
import "./TradingBot.css";
import "../styles/Themes.css";

const TradingBotContainer = () => {
  const { botStatus, logs, loading: botLoading, startBot, stopBot } = useBot();
  const { setups } = useBacktestSetupFunction();
  const { isConnected, address } = useAccount();

  // --- 1. CONFIGURATION STATE ---
  const [formConfig, setFormConfig] = useState({
    strategyId: "",
    symbol: "BTC-USD",
    timeframe: "1h",
    capitalAllocation: 1000,
    tradingMode: "paper",
    strategies: [], // Stores active logic modules
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

  // --- 2. DROPDOWN OPTIONS (Defined here, passed to Child) ---
  const symbolOptions = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "BNB-USD", "ADA-USD"];
  const timeframeOptions = ["1m", "5m", "15m", "1h", "4h", "1d"];
  const modelOptions = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" },
    { id: "sol_15m_lstm", name: "SOL 15m LSTM" }
  ];

  // --- 3. FETCH ALPHA FILES ---
  const fetchWinners = async () => {
    if (!isConnected) return;
    setScanningWinners(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("https://neov6backend.onrender.com/api/bot/winners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLiveWinners(Array.isArray(response.data) ? response.data : []);
      toast.success("Strategies Loaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to load alpha files");
    } finally {
      setScanningWinners(false);
    }
  };

  useEffect(() => {
    if (isConnected) fetchWinners();
  }, [isConnected]);

  // --- 4. HANDLERS (Populate Form) ---

  const handleSetupSelect = (e) => {
    const setupId = e.target.value;
    setSelectedSetupId(setupId);
    setSelectedWinnerId(""); 

    const selectedSetup = setups.find((s) => s._id === setupId);
    if (selectedSetup) {
      setFormConfig((prev) => ({
        ...prev,
        strategyId: setupId,
        symbol: selectedSetup.symbol || "BTC-USD",
        timeframe: selectedSetup.timeframe || "1h",
        // Normalize strategies for the Visual Cards
        strategies: (selectedSetup.strategies || []).map(s => ({
            code: s.code || s.name,
            params: s.params || s.parameters || {}
        })),
        mlMode: selectedSetup.mlMode || "off"
      }));
    }
  };

  const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    if (!winnerId) return;
    
    setSelectedWinnerId(winnerId);
    setSelectedSetupId(""); 

    const selectedWinner = liveWinners.find((w) => (w.botId || w.id) === winnerId);
    
    if (selectedWinner) {
        const config = selectedWinner.config || {};
        
        // Normalize strategies from file
        const safeStrategies = (config.strategies || []).map(s => ({
            code: s.code || "unknown",
            params: s.params || s.parameters || {}
        }));

        setFormConfig((prev) => ({
            ...prev,
            strategyId: "", 
            symbol: selectedWinner.symbol || prev.symbol,
            strategies: safeStrategies,
            mlMode: config.mlMode || "off",
            riskPercentage: config.riskPercentage || 1,
            mlModel: config.mlModel || prev.mlModel,
            riskManagementMode: config.riskManagementMode || prev.riskManagementMode
        }));
        toast.success(`Loaded: ${selectedWinner.symbol}`);
    }
  };

  const handleStart = async (e) => {
    if (e) e.preventDefault();
    if (!address) return toast.error("Wallet not connected");
    try {
        const payload = {
            ...formConfig,
            userId: address,
            // Construct the combo config for the backend
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

  const handleClearLogs = () => { /* Logic handled in hook/layout usually */ };

  // --- 5. PREPARE PROPS FOR LAYOUT ---
  
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

  // ✅ CRITICAL: Pass the option arrays here!
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
    botStatus: patchedStatus,
    logs,
    visibleLogs: logs,
    chartData,
    
    // 👇 THESE WERE MISSING
    symbolOptions,
    timeframeOptions,
    modelOptions
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
