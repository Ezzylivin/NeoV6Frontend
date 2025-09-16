// CryptoDataComponent.js
// This component fetches data from your working API.

import React, { useState, useEffect } from 'react';

function CryptoDataComponent() {
  // Set up states for each coin's data array
  const [btcData, setBtcData] = useState(null);
  const [ethData, setEthData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use "https" - Render.com provides SSL
        const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // --- THIS IS THE KEY FIX ---
        // Log the full response to your console to inspect it
        console.log("Full response from API:", result);

        // The 'result' is an object: {"BTC-USD": [...], "ETH-USD": [...]}
        // We must access the arrays by their keys.
        
        const btcArray = result['BTC-USD'];
        const ethArray = result['ETH-USD'];
        
        // 3. Save the *arrays* to their respective states
        setBtcData(btcArray);
        setEthData(ethArray);
        
      } catch (e) {
        // 4. Catch any errors and save them
        console.error("Failed to fetch or parse data:", e);
        setError(e.message);
      } finally {
        // 5. Always stop loading
        setLoading(false);
      }
    };

    fetchData();
  }, []); // The empty array [] means this runs only once

  // 6. Render based on the current state
  if (loading) {
    return <div>Loading crypto data from your API...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // 7. Success! Render the data
  return (
    <div>
      {/* Render BTC Data if it exists */}
      {btcData && (
        <div>
          <h2>BTC-USD</h2>
          <ul>
            {/* Map over the btcData *array*.
              Note the 'cpi' and 'fed_funds_rate' are NaN for many entries,
              but they are populated for '2025-07-01'.
            */}
            {btcData.map((obs) => (
              <li key={obs.start}>
                {obs.time}: 
                <strong> Close ${obs.close}</strong> | 
                Fed Rate: {obs.fed_funds_rate} |
                CPI: {obs.cpi}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Render ETH Data if it exists */}
      {ethData && (
        <div>
          <h2>ETH-USD</h2>
          <ul>
            {ethData.map((obs) => (
              <li key={obs.start}>
                {obs.time}: 
                <strong> Close ${obs.close}</strong> | 
                Fed Rate: {obs.fed_funds_rate} |
                CPI: {obs.cpi}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CryptoDataComponent;
