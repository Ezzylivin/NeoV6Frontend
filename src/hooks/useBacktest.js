// File: src/hooks/useBacktest.js
// ============================================================
// 🔧 FIX T4-15: Stripped to only working functionality
// ============================================================
// OLD: Called fetchOptions, fetchAll, fetchModels, fetchWinners on mount
//      — all 4 endpoints don't exist on backend → 4 silent failures
//      — Had reducer, pastBacktests, winners, delete — all dead
// NEW: Only exposes the streaming backtest runner.
//      Backtests.jsx already handles its own state with useState,
//      so this hook just provides the API call wrapper.

import { useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
    const runNewBacktest = useCallback(async (payload, onUpdate) => {
        return backtestApi.runStreamedBacktest('single', payload, (update) => {
            if (update.status === 'progress' && onUpdate) {
                onUpdate(update.percentage, update.message);
            }
        });
    }, []);

    const runComboBacktest = useCallback(async (payload, onUpdate) => {
        return backtestApi.runStreamedBacktest('combo', payload, (update) => {
            if (update.status === 'progress' && onUpdate) {
                onUpdate(update.percentage, update.message);
            }
        });
    }, []);

    return {
        runNewBacktest,
        runComboBacktest,
    };
}
