import React, { useState, useEffect } from 'react';
import api, { setAuthToken } from './api'; // Ensure the path is correct

const Strategies = () => {
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Retrieve the token from local storage and set it for all Axios requests.
    const token = localStorage.getItem('userToken'); // Use your actual key
    if (token) {
      setAuthToken(token);
    }

    const fetchStrategies = async () => {
      try {
        // Use the configured 'api' instance for the GET request.
        // Axios automatically handles the JSON parsing and error responses.
        const response = await api.get("/strategy"); 
        
        // Axios places the data directly on the 'data' property of the response object.
        let data = response.data;

        // Your backend returns an object with a `strategies` key.
        if (data && Array.isArray(data.strategies)) {
          setStrategies(data.strategies);
        } else {
          // Fallback if the response format is different than expected.
          console.warn("API response format was unexpected.");
          setStrategies([]);
        }

      } catch (e) {
        // Axios provides a more detailed error object
        setError(e.response?.data?.message || e.message);
        console.error("Failed to fetch strategies:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategies();
  }, []); 

  // Conditional rendering remains the same
  if (isLoading) {
    return <div>Loading strategies...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Trading Strategies</h1>
      {strategies.length > 0 ? (
        <ul>
          {strategies.map((strategy) => (
            <li key={strategy._id}>{strategy.name || "Unnamed Strategy"}</li>
          ))}
        </ul>
      ) : (
        <div>No strategies found.</div>
      )}
    </div>
  );
};

export default Strategies;
