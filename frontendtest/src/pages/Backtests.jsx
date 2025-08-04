import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import NavBar from '../components/NavBar.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const Backtests = () => {
  const { token } = useContext(AuthContext);
  const [results, setResults] = useState([]);
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchBacktests = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/backtest/results`);
      if (timeframeFilter) url.searchParams.append('timeframe', timeframeFilter);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch backtests');
      const data = await res.json();
      setResults(data);
    } catch {
      alert('Error fetching backtests');
   
