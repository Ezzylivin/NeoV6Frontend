// File: src/context/StrategyContext.jsx
// UPGRADED: A simple state container for strategies.

import React, { createContext, useState, useContext } from "react";

export const StrategyContext = createContext();

export const StrategyProvider = ({ children }) => {
    // --- State Management ---
    // This context holds the data, but the component will be responsible for fetching it.
    const [strategies, setStrategies] = useState([]);
    const [comboStrategies, setComboStrategies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // --- The value provided to all consuming components ---
    const contextValue = {
        strategies,
        setStrategies, // ✅ Provide the setter function
        comboStrategies,
        setComboStrategies, // ✅ Provide the setter function
        loading,
        setLoading,
        error,
        setError,
        success,
        setSuccess,
    };

    return (
        <StrategyContext.Provider value={contextValue}>
            {children}
        </StrategyContext.Provider>
    );
};

// Custom hook for easy consumption
export const useStrategies = () => {
    return useContext(StrategyContext);
};
