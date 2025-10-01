import axios from "./api"; // your token-aware axios instance

export async function fetchOptions() {
    const res = await axios.get("/backtests/options");
    return res.data; // { strategies: [...], symbols: [...], timeframes: [...] }
}

export async function fetchAll(page = 1) {
    const res = await axios.get(`/backtests?page=${page}`);
    return res.data; // { backtests: [...], total: N }
}

export async function fetchById(id) {
    const res = await axios.get(`/backtests/${id}`);
    return res.data;
}

export async function deleteById(id) {
    const res = await axios.delete(`/backtests/${id}`);
    return res.data;
}

export async function runBacktest(payload) {
    const res = await axios.post("/backtests/run-single", payload);
    return res.data;
}

export async function runComboBacktest(payload) {
    const res = await axios.post("/backtests/run-combo", payload);
    return res.data;
}

export async function previewStrategy(payload) {
    const res = await axios.post("/backtests/preview", payload);
    return res.data;
}
