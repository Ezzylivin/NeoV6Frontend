import React, { useContext, useEffect, useState } from 'react';
import { AuthProvider } from './hooks/useAuth.jsx';
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
   }
setLoading(false);
};

useEffect(() => {
fetchBacktests();
}, []);

return (
<>
<NavBar />
<div className="p-4 max-w-4xl mx-auto">
<h1 className="text-2xl mb-4">Backtest Results</h1>
<div className="mb-4">
<input
className="border p-2"
placeholder="Filter by timeframe (e.g. 1h)"
value={timeframeFilter}
onChange={(e) => setTimeframeFilter(e.target.value)}
/>
<button className="ml-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={fetchBacktests}>
Apply
</button>
</div>
{loading ? (
<p>Loading...</p>
) : (
<table className="table-auto w-full text-sm">
<thead>
<tr className="bg-gray-200">
<th>Timeframe</th>
<th>Initial</th>
<th>Final</th>
<th>Profit</th>
<th>Trades</th>
<th>Tested Candles</th>
<th>Date</th>
</tr>
</thead>
<tbody>
{results.map((b) => (
<tr key={b._id}>
<td>{b.timeframe}</td>
<td>{b.initialBalance}</td>
<td>{b.finalBalance}</td>
<td>{b.profit}</td>
<td>{b.totalTrades}</td>
<td>{b.candlesTested}</td>
<td>{new Date(b.createdAt).toLocaleDateString()}</td>
</tr>
))}
</tbody>
</table>
)}
</div>
</>
);
};

export default Backtests;
