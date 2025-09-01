// File: src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [exchanges, setExchanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        setLoading(true);
        const res = await axios.get("https://neov6backend.onrender.com/api/exchanges");
        
        // The new data is merged: { coinbase: [...], kraken: [...], ... }
        setExchanges(res.data.exchanges || res.data); // fallback for older format
        setLoading(false);
      } catch (err) {
        console.error("Error fetching exchanges:", err);
        setError(err.message || "Failed to fetch exchanges");
        setLoading(false);
      }
    };

    fetchExchanges();
  }, []);

  if (loading) return <div>Loading exchanges...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Available Exchanges & USD Pairs</h2>
      {Object.keys(exchanges).length === 0 && <p>No exchanges available</p>}
      {Object.entries(exchanges).map(([exchange, symbols]) => (
        <div key={exchange} style={{ marginBottom: "20px" }}>
          <h3>{exchange.toUpperCase()}</h3>
          <ul>
            {symbols.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
