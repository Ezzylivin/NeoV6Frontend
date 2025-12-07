// 🚀 UNIVERSAL WINNER ADAPTER (Works for Backtest & Live Bot)
    const handleWinnerSelect = (e) => {
        const filename = e.target.value;
        setSelectedWinnerId(filename);
        setSelectedSetupId(""); // Clear the other dropdown

        // 1. Find the file data
        const selectedWinner = liveWinners.find(w => w.id === filename);
        
        if (!selectedWinner || !selectedWinner.config) {
            console.warn("⚠️ Winner file not found or empty:", filename);
            return;
        }

        const data = selectedWinner.config;
        console.log("🏆 Loading Alpha File:", filename, data);

        // --- A. PARSE SYMBOL & TIMEFRAME ---
        // Priority: Config JSON > Filename > Defaults
        let symbol = data.symbol || "BTC-USD";
        let timeframe = data.timeframe || "1h";

        if (!data.symbol && filename.includes('_')) {
             const parts = filename.split('_');
             // Try to guess format: strategy_SYMBOL_TF_...
             if (parts[1] && parts[1].includes('-')) symbol = parts[1];
             if (parts[2] && ['1m','5m','15m','1h','4h','1d'].includes(parts[2])) timeframe = parts[2];
        }

        // --- B. PARSE STRATEGIES ---
        // Handle: List of Strings, List of Objects, or Single Object
        let rawStrategies = [];
        if (Array.isArray(data.strategies)) rawStrategies = data.strategies;
        else if (Array.isArray(data)) rawStrategies = data; // Legacy format where root is array
        
        const cleanStrategies = rawStrategies.map(s => {
            // Case 1: Simple String ("macd_crossover")
            if (typeof s === 'string') return { code: s, params: {} };
            
            // Case 2: Object ({ code: "...", params: {...} })
            return {
                code: s.code || s.trend_strategy || "unknown",
                params: s.params || s // Fallback: use entire object as params if 'params' key missing
            };
        });

        // --- C. PARSE ML SETTINGS ---
        let mlMode = data.mlMode || "off";
        let mlModel = data.mlModel || "";
        // Check deep params for overrides
        if (data.params?.mlModel) mlModel = data.params.mlModel;
        if (mlModel && mlMode === "off") mlMode = "predictions";

        // --- D. PARSE GLOBAL PARAMS (Risk, Pyramiding) ---
        // Merge root params and nested params
        const globalParams = { ...data.params };
        
        // Extract critical keys that might be at root level
        if (data.riskManagementMode) globalParams.riskManagementMode = data.riskManagementMode;
        if (data.riskPercentage) globalParams.riskPercentage = Number(data.riskPercentage);
        if (data.maxPyramiding) globalParams.maxPyramiding = Number(data.maxPyramiding);
        if (data.initialBalance) globalParams.initialBalance = Number(data.initialBalance);

        // --- E. UPDATE FORM STATE ---
        // Note: 'setConfig' is used in Backtest.jsx, 'setFormConfig' in TradingBot.jsx.
        // I will detect which one is available or you can rename this block.
        
        const newState = {
            symbol: symbol.toUpperCase(),
            timeframe: timeframe,
            isCombo: true,
            strategies: cleanStrategies,
            comboConfig: { 
                strategyCodes: cleanStrategies.map(s => s.code),
                combinationRule: globalParams.hybridMode || 'OR' 
            },
            mlMode,
            mlModel: mlModel || 'btc_1h_xgboost_model', // Default fallback
            mlThreshold: Number(data.mlThreshold) || 0.5,
            params: globalParams
        };

        // Apply to State (Detecting which hook function exists)
        if (typeof setConfig === 'function') {
            // Backtest.jsx context
            setConfig(prev => ({ ...prev, ...newState, initialBalance: globalParams.initialBalance || prev.initialBalance }));
        } else if (typeof setFormConfig === 'function') {
            // TradingBot.jsx context
            setFormConfig(prev => ({ 
                ...prev, ...newState, 
                capitalAllocation: globalParams.initialBalance || 1000 // Map initialBalance to capital
            }));
        }
    };
