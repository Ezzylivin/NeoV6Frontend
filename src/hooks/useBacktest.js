// File: src/hooks/useBacktest.js
// UPGRADED: Handles single + batch backtests, loading, errors, and metrics properly.

import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
    const [options, setOptions] = useState({
        strategies: [],
        symbols: [],
        timeframes: [],
        takeProfits: [],
        stopLosses: [],
    });
    const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch options
    const getOptions = useCallback(async () => {
        try {
            const data = await backtestApi.fetchOptions();
            setOptions(data);
        } catch (err) {
            console.error("Failed to load options:", err);
            setError("Failed to load backtest options.");
        }
    }, []);

    // Fetch past backtests
    const getPastBacktests = useCallback(async (page = 1) => {
        try {
            const data = await backtestApi.fetchAll(page);
            setPastBacktests({ results: data.backtests, total: data.total });
        } catch (err) {
            console.error("Failed to load past backtests:", err);
            setError(err.response?.data?.message || "Failed to load past backtests.");
        }
    }, []);

    // Run single backtest (simulateOnly default true)
    const runNewBacktest = useCallback(
        async (payload, simulateOnly = true) => {
            setLoading(true);
            setError(null);
            try {
                const response = await backtestApi.runBacktest({ ...payload, simulateOnly });
                if (!simulateOnly) await getPastBacktests();
                return response.data;
            } catch (err) {
                const errorMessage = err.response?.data?.message || "Failed to run backtest.";
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [getPastBacktests]
    );

    // Run batch backtests
    const runNewBatchBacktest = useCallback(
        async (configs) => {
            setLoading(true);
            setError(null);
            try {
                const response = await backtestApi.runBatch(configs);
                if (response?.data) await getPastBacktests();
                return response.data;
            } catch (err) {
                const errorMessage = err.response?.data?.message || "Failed to run batch backtests.";
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [getPastBacktests]
    );

    // Initial load
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([getOptions(), getPastBacktests()]);
            setLoading(false);
        };
        loadInitialData();
    }, [getOptions, getPastBacktests]);

    return {
        options,
        pastBacktests,
        loading,
        error,
        getPastBacktests,
        runNewBacktest,
        runNewBatchBacktest,
    };
}
