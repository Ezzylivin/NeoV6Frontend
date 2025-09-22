// File: src/hooks/useStrategy.js
// UPGRADED: Correctly handles authenticated API requests without sending userId.

import { useState, useEffect, useCallback } from "react";
import api from "../api/apiClient"; // Import your configured axios instance

// The API endpoint for strategies
const API_BASE = "/strategies";

export function useStrategy() {
    const [strategies, setStrategies] = useState([]); // Should be an array
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch all strategies for the authenticated user
    const fetchStrategies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // FIX: The endpoint doesn't need a userId; the server knows who the user is from the token.
            const response = await api.get(API_BASE);
            // The backend returns an array directly, no need to check 'success' flag
            setStrategies(response.data);
        } catch (err) {
            const message = err.response?.data?.message || "Error fetching strategies";
            setError(message);
            console.error("fetchStrategies error", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Save a new strategy for the authenticated user
    const saveStrategy = async (strategyData) => {
        setLoading(true);
        setError(null);
        try {
            // FIX: The endpoint is just the base URL. The body contains the new strategy data.
            // The userId is not needed in the payload.
            const response = await api.post(API_BASE, strategyData);
            
            // Add the new strategy to the local state to update the UI instantly
            setStrategies(prevStrategies => [...prevStrategies, response.data]);
        } catch (err) {
            const message = err.response?.data?.message || "Error saving strategy";
            setError(message);
            console.error("saveStrategy error", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch strategies on initial component mount
    useEffect(() => {
        fetchStrategies();
    }, [fetchStrategies]);

    return { strategies, loading, error, fetchStrategies, saveStrategy };
}
