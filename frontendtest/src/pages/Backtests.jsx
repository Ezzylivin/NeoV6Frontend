import React, { useState, useEffect, useContext } from 'react';
import NavBar from '../components/NavBar.jsx';
import { useAuth } from '../contexts/AuthProvider'; // useAuth, not AuthContext directly
import { fetchBacktests, runBacktest } from '../api/backtests'; // your API functions

const Backtests = () => {
  const { token } = useAuth(); // ✅ Correct way to get token from context
  const [results, setResults] = useState([]);
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Fetch results (with optional filter)
  const fetchBacktestsResults = async () => {
    setLoading(true);
    try {
      const data = await fetchBacktests(token, timeframeFilter); // use filter if needed
      setResults(data.results || []);
    } catch (error) {
      console.error(error);
      alert('Error fetching backtest results');
    }
    setLoading(false);
  };

  // ✅ Run new backtest
  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const data = await runBacktest(token);
      if (data?.results) {
        setResults((prev) => [data.results, ...prev]);
      }
    } catch (error) {
      console.error(error);
      alert('Error running backtest');
    }
    setLoading(false);
  };

  // 🔁 Initial load
  useEffect(() => {
    if (token) fetchBacktestsResults();
  }, [token]);

  return (
    <>
      <NavBar />
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl mb-4">Backtest Results</h1>

        {/* Filter & Actions */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <input
            className="border p-2"
            placeholder="Filter by timeframe (e.g. 1h)"
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
          />
          <button
