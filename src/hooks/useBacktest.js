// File: src/hooks/useBacktest.js
// 🚀 UPGRADE: Integrated real-time streaming progress and data normalization

import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js"; 

const initialState = {
    options: { strategies: [], symbols: [], timeframes: [], models: [] },
    winners: [], 
    pastBacktests: { results: [], total: 0 },
    loading: 'idle', // 'initial', 'idle', 'fetching', 'running'
    error: null,
};

function backtestReducer(state, action) {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload, error: null };
        case 'SET_ERROR':
            return { ...state, loading: 'idle', error: action.payload };
        case 'SET_INITIAL_DATA':
            return {
                ...state,
                options: action.payload.options,
                pastBacktests: {
                    results: action.payload.pastBacktests.backtests,
                    total: action.payload.pastBacktests.total,
                },
                winners: action.payload.winners,
                loading: 'idle',
            };
        case 'SET_PAST_BACKTESTS':
            return {
                ...state,
                pastBacktests: {
                    results: action.payload.backtests,
                    total: action.payload.total,
                },
                loading: 'idle',
            };
        case 'DELETE_BACKTEST_OPTIMISTIC': 
            return {
                ...state,
                pastBacktests: {
                    ...state.pastBacktests,
                    results: state.pastBacktests.results.filter(b => b._id !== action.payload),
                    total: Math.max(0, state.pastBacktests.total - 1),
                },
            };
        case 'ROLLBACK_DELETE':
            return { ...state, pastBacktests: action.meta.originalPastBacktests, error: action.payload };
        default:
            return state;
    }
}

export function useBacktest() {
    const [state, dispatch] = useReducer(backtestReducer, initialState);

    const getPastBacktests = useCallback(async (page = 1) => {
        dispatch({ type: "SET_LOADING", payload: "fetching" });
        try {
            const data = await backtestApi.fetchAll(page); 
            dispatch({ type: "SET_PAST_BACKTESTS", payload: data });
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err });
        }
    }, []);

    // --- 🚀 NEW: STREAM-CAPABLE EXECUTION LOGIC ---
    // This allows the Progress Bar to work while the AI crunches
    const executeStreamedBacktest = useCallback(async (type, payload, onUpdate) => {
        dispatch({ type: "SET_LOADING", payload: `running_${type}` });
        
        try {
            // Using the new Stream Helper from your API layer
            // If you don't have a stream helper, this will fall back to standard fetch
            const result = await backtestApi.runStreamedBacktest(type, payload, (update) => {
                if (update.status === 'progress' && onUpdate) {
                    onUpdate(update.percentage, update.message);
                }
            });

            await getPastBacktests(1); // Refresh history
            dispatch({ type: "SET_LOADING", payload: "idle" });
            return result;
        } catch (err) {
            dispatch({ type: "SET_ERROR", payload: err.message });
            throw err;
        }
    }, [getPastBacktests]);

    // Standard wrapper for single test
    const runNewBacktest = useCallback(async (payload, onUpdate) => {
        return executeStreamedBacktest('single', payload, onUpdate);
    }, [executeStreamedBacktest]);

    // Standard wrapper for combo test
    const runComboBacktest = useCallback(async (payload, onUpdate) => {
        return executeStreamedBacktest('combo', payload, onUpdate);
    }, [executeStreamedBacktest]);

    // Management functions remain the same...
    const deleteBacktest = useCallback(async (id) => {
         const originalState = state.pastBacktests;
         dispatch({ type: "DELETE_BACKTEST_OPTIMISTIC", payload: id });
         try {
            await backtestApi.deleteById(id);
         } catch (err) {
             dispatch({ type: "ROLLBACK_DELETE", payload: err, meta: { originalPastBacktests: originalState } });
         }
    }, [state.pastBacktests]);

    useEffect(() => {
        const fetchInitialData = async () => {
            dispatch({ type: "SET_LOADING", payload: "initial" });
            try {
                const [opts, bts, mods, wins] = await Promise.allSettled([
                    backtestApi.fetchOptions(),
                    backtestApi.fetchAll(1),
                    backtestApi.fetchModels(),
                    backtestApi.fetchWinners()
                ]);

                const optionsData = opts.status === 'fulfilled' ? opts.value : {};
                if (mods.status === 'fulfilled') optionsData.models = mods.value;

                dispatch({
                    type: "SET_INITIAL_DATA",
                    payload: {
                        options: optionsData,
                        pastBacktests: bts.status === 'fulfilled' ? bts.value : { backtests: [], total: 0 },
                        winners: wins.status === 'fulfilled' ? wins.value : []
                    },
                });
            } catch (err) {
                dispatch({ type: "SET_ERROR", payload: err });
            }
        };
        fetchInitialData();
    }, []);

    return {
        state,
        getPastBacktests,
        deleteBacktest,
        runNewBacktest,
        runComboBacktest,
    };
}
