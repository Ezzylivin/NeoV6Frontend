// File: src/hooks/useBacktest.js
import { useReducer, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js"; 

const initialState = {
    options: { strategies: [], symbols: [], timeframes: [], models: [] },
    winners: [], // 🚀 Added winners to state
    pastBacktests: { results: [], total: 0 },
    loading: 'initial', 
    error: null,
};

function backtestReducer(state, action) {
    switch (action.type) {
        // ... other cases ...
        case 'SET_INITIAL_DATA':
            return {
                ...state,
                options: action.payload.options,
                winners: action.payload.winners, // 🚀 Set winners
                pastBacktests: action.payload.pastBacktests,
                loading: 'idle',
                error: null,
            };
        // ...
        default: return state;
    }
}

export function useBacktest() {
    const [state, dispatch] = useReducer(backtestReducer, initialState);

    // ... existing functions ...

    useEffect(() => {
        const fetchInitialData = async () => {
            dispatch({ type: "SET_LOADING", payload: "initial" });
            try {
                const results = await Promise.allSettled([
                    backtestApi.fetchOptions(),
                    backtestApi.fetchAll(1),
                    backtestApi.fetchModels(),
                    backtestApi.fetchWinners() // 🚀 Fetch winners
                ]);

                // ... handle other results ...

                // Process Winners
                const winnersResult = results[3];
                const winnersData = winnersResult.status === 'fulfilled' ? winnersResult.value : [];

                dispatch({
                    type: "SET_INITIAL_DATA",
                    payload: {
                        options: { ... }, // (Your existing logic)
                        pastBacktests: { ... }, // (Your existing logic)
                        winners: winnersData // 🚀 Payload
                    },
                });

            } catch (err) {
                console.error("Error:", err);
                dispatch({ type: "SET_ERROR", payload: err });
            }
        };
        fetchInitialData();
    }, []);

    return { state, ... };
}
