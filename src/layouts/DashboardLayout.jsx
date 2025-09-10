// File: src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import StrategyList from "../components/strategyList.jsx";
import StrategyForm from "../components/strategyForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Dashboard = () => {
  const { user } = useAuth(); // Using AuthContext to get the user data
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [strategies, setStrategies] = useState([]);

  // Fetch user strategies when the component mounts
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await axios.get(`/api/strategies/user/${user._id}`);
        setStrategies(response.data.strategies);
      } catch (error) {
        console.error("Error fetching strategies:", error);
      }
    };

    if (user) fetchStrategies();
  }, [user]);

  const handleEditStrategy = (strategyId) => {
    setSelectedStrategyId(strategyId);
  };

  const handleSubmitStrategy = async (formData) => {
    try {
      // If `selectedStrategyId` is set, update the existing strategy
      if (selectedStrategyId) {
        await axios.put(`/api/strategies/${selectedStrategyId}`, formData);
      } else {
        // Otherwise, create a new strategy
        await axios.post("/api/strategies", formData);
      }

      // After submission, fetch the updated strategy list
      const response = await axios.get(`/api/strategies/user/${user._id}`);
      setStrategies(response.data.strategies);
      setSelectedStrategyId(null); // Reset selected strategy
    } catch (error) {
      console.error("Error submitting strategy:", error);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      
      {/* Strategy List and Form */}
      <StrategyList strategies={strategies} onEdit={handleEditStrategy} />
      <StrategyForm strategyId={selectedStrategyId} onSubmit={handleSubmitStrategy} />
    </div>
  );
};

export default Dashboard;
