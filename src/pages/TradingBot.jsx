import React, { useState, useEffect, useRef } from "react";
import axios from "axios"; 
import { useBot } from '../hooks/useBot.js';
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx"; 
import { UIModeProvider } from "../context/UIModeContext";
import TradingBotShell from "./TradingBotShell"; // The new Visual Router
import "./TradingBot.css"; // Base styles
import "../styles/Themes.css"; // The 5 Themes

// --- MAIN LOGIC CONTAINER ---
const TradingBotContainer = () => {
    // ... [KEEP ALL YOUR EXISTING LOGIC, STATE, AND USEEFFECTS HERE] ...
    // ... [handleStart, handleStop, fetchWinners, etc.] ...

    // 1. Gather all state and handlers into a single object
    const botProps = {
        botStatus,
        logs: persistentLogs, // Use the accumulated logs
        visibleLogs,
        loading: botLoading,
        isRunning,
        
        // Data
        liveWinners,
        setups,
        chartData,
        hasData,
        
        // Forms State
        formConfig,
        setFormConfig,
        selectedSetupId,
        selectedWinnerId,
        
        // Handlers
        handleStart,
        handleStop,
        handleSetupSelect,
        handleWinnerSelect,
        fetchWinners,
        scanningWinners,
        handleRefreshChart,
        handleClearLogs,
        
        // Refs
        logsContainerRef
    };

    return (
        <div className="trading-bot-root">
             {/* The Shell decides HOW to render this data */}
            <TradingBotShell {...botProps} />
        </div>
    );
};

// Wrap with Provider export
export default function TradingBot() {
    return (
        <UIModeProvider>
            <TradingBotContainer />
        </UIModeProvider>
    );
}
