import api from "./apiClient.js"; // Your main configured Axios client
import axios from "axios";       // Import axios directly for the external ML call

// The URL for your Python ML server, pulled from environment variables
const ML_API_BASE_URL ="https://74.208.28.77:8000"

/**
 * Normalizes the API response for backtest options.
 */
const normalizeOptions = (raw) => ({
    strategies: raw?.strategies || [],
    symbols: raw?.symbols || [],
    timeframes: raw?.timeframes || [],
});

/**
 * Normalizes the API response for a list of past backtests.
 */
const normalizePastBacktests = (raw) => ({
    backtests: raw?.backtests || [],
    total: raw?.total || 0,
});

/**
 * A consistent error handler for all API calls.
 */
const handleError = (error, functionName) => {
    const message = error.response?.data?.detail || error.response?.data?.message || error.message || "An unknown error occurred.";
    console.error(`${functionName}(): failed`, message);
    throw {
        status: error.response?.status || 500,
        message: message,
    };
};

// --- Main Backend API Functions ---

export async function fetchOptions() {
    try {
        const response = await api.get("/backtest/options");
        return normalizeOptions(response.data);
    } catch (error) {
        handleError(error, "fetchOptions");
    }
}

export async function fetchAll(page = 1) {
    try {
        const response = await api.get(`/backtest?page=${page}`);
        return normalizePastBacktests(response.data);
    } catch (error) {
        handleError(error, "fetchAll");
    }
}

export async function fetchById(id) {
    try {
        const { data } = await api.get(`/backtest/${id}`);
        return data;
    } catch (error) {
        handleError(error, "fetchById");
    }
}

export async function deleteById(id) {
    try {
        const { data } = await api.delete(`/backtest/${id}`);
        return data;
    } catch (error) {
        handleError(error, "deleteById");
    }
}

export async function runBacktest(payload) {
    if (!payload.code) throw new Error("A strategy 'code' is required.");
    try {
        const { data } = await api.post("/backtest/run", payload);
        return data;
    } catch (error) {
        handleError(error, "runBacktest");
    }
}

export async function previewStrategy(payload) {
    if (!payload.code) throw new Error("A strategy 'code' is required.");
    try {
        const { data } = await api.post("/backtest/preview", payload);
        return data;
    } catch (error) {
        handleError(error, "previewStrategy");
    }
}

export async function runComboBacktest(payload) {
    if (!payload.strategies || payload.strategies.length === 0) {
        throw new Error("Payload must contain a non-empty 'strategies' array.");
    }
    try {
        const { data } = await api.post("/backtest/combo", payload);
        return data;
    } catch (error) {
        handleError(error, "runComboBacktest");
    }
}

// --- Machine Learning Server API Functions ---

/**
 * ✅ NEW: Fetches the list of available ML model names from the server.
 */
export async function fetchModels() {
    try {
        // We use axios to call the ML server, which may be different from the main API.
        const response = await axios.get(`${ML_API_BASE_URL}/api/ml/models`);
        return response.data;
    } catch (error) {
        handleError(error, "fetchModels");
    }
}

/**
 * Calls the external ML server to get predictions.
 * @param {object} featuresPayload - The data required by your model (e.g., { symbol, features }).
 */


// backtest.js (or wherever your API call is located)

// Function to safely retrieve the token
const getAuthToken = () => {
    // ⚠️ ASSUMPTION: The token is stored in localStorage under the key 'authToken'
    return localStorage.getItem('token'); 
};


export async function getMlPredictions(predictionData) {
    // --- STEP 1: Get the token ---
    const token = getAuthToken();

    // --- STEP 2: Check if the token exists ---
    if (!token) {
        // If no token, we know we'll get a 401. Log the error and stop the request.
        console.error("Authentication token not found. User needs to log in.");
        // This line is crucial, as it matches your existing custom error logging:
        throw new Error("Not authenticated"); 
    }

    // --- STEP 3: Define the request configuration ---
    const config = {
        method: 'POST',
        url: 'https://74.208.28.77:8000/api/ml/predict',
        data: predictionData, // The body of your request
        // --- STEP 4: Add the Authorization Header ---
        headers: {
            'Content-Type': 'application/json',
            // This is the fix for the 401 error!
            'Authorization': `Bearer ${token}` 
        }
    };

    try {
        // ⚠️ ASSUMPTION: Using Axios or a similar library
        const response = await axios(config); 
        
        // Success: 200 OK
        return response.data; 
    } catch (error) {
        // Log a more detailed error for debugging
        console.error("API call to /api/ml/predict failed:", error);

        // If the error response status is 401, throw the custom message.
        if (error.response && error.response.status === 401) {
            // This will trigger the 'Not authenticated' message in backtest.js:29
            throw new Error("Not authenticated"); 
        }

        // Re-throw any other errors
        throw error;
    }
}
