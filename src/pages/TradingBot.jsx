const handleWinnerSelect = (e) => {
    const winnerId = e.target.value;
    if (!winnerId) return;
    
    setSelectedWinnerId(winnerId);
    setSelectedSetupId(""); 

    const selectedWinner = liveWinners.find((w) => (w.botId || w.id) === winnerId);
    
    if (selectedWinner) {
        const config = selectedWinner.config || {};
        
        const safeStrategies = (config.strategies || []).map(s => ({
            code: s.code || "unknown",
            params: s.params || s.parameters || {}
        }));

        // 🛠 FIX: Extract Hybrid Mode safely from nested params
        const fileParams = config.params || config.comboConfig || {};
        const detectedHybridMode = fileParams.hybridMode || config.hybridMode || "AND";

        setFormConfig((prev) => ({
            ...prev,
            strategyId: "", 
            symbol: selectedWinner.symbol || prev.symbol,
            strategies: safeStrategies,
            mlMode: config.mlMode || "off",
            
            // ✅ FIX: Ensure Hybrid Mode populates
            hybridMode: detectedHybridMode,
            
            riskPercentage: config.riskPercentage || 1,
            mlModel: config.mlModel || prev.mlModel,
            riskManagementMode: config.riskManagementMode || prev.riskManagementMode
        }));
        toast.success(`Loaded: ${selectedWinner.symbol}`);
    }
  };
