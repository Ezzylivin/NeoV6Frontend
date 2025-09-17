import React, { useState, useEffect } from 'react';

// Documentation: This component fetches and displays a list of trading strategies from an API.
// It handles loading states and ensures the data is an array before rendering.

const Strategies = () => {
  // Use state to store the fetched strategies, loading status, and any errors.
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // This effect runs once when the component mounts.
    const fetchStrategies = async () => {
      try {
        // Step 1: Fetch data from the API endpoint.
        const response = await fetch("https://neov6backend.onrender.com/api/strategy");
        
        // Check if the response was successful.
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Step 2: Parse the JSON response.
        let data = await response.json();

        // Step 3: Crucial Fix: Check if the fetched data is an array.
        // If the data is not an array, we wrap it in an array to prevent the TypeError.
        // This handles cases where the API returns a single object instead of a list.
        if (!Array.isArray(data)) {
          console.warn("API response was not an array. Wrapping it in an array.");
          data = [data]; 
        }

        // Step 4: Update the state with the fetched data.
        setStrategies(data);
      } catch (e) {
        // Handle any errors during the fetch process.
        setError(e.message);
        console.error("Failed to fetch strategies:", e);
      } finally {
        // Always set loading to false once the fetch is complete.
        setIsLoading(false);
      }
    };

    fetchStrategies();
  }, []); // The empty dependency array ensures this effect runs only once.

  // Conditional rendering based on the component state.
  if (isLoading) {
    return <div>Loading strategies...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // The rendering logic for when we have strategies to display.
  // We can now safely use .map() because we've confirmed `strategies` is an array.
  return (
    <div>
      <h1>Trading Strategies</h1>
      {strategies.length > 0 ? (
        <ul>
          {strategies.map((strategy, index) => (
            // A key prop is essential for list items in React for performance and stability.
            // Using a unique ID from the strategy is better if available.
            <li key={strategy.id || index}>{strategy.name || `Strategy ${index + 1}`}</li>
          ))}
        </ul>
      ) : (
        <div>No strategies found.</div>
      )}
    </div>
  );
};

export default Strategies;
