// File: src/components/StrategyList.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const StrategyList = () => {
  const [strategies, setStrategies] = useState([]);
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    axios.get(`/api/strategies/user/${userId}`).then((response) => {
      setStrategies(response.data);
    });
  }, [userId]);

  const handleDelete = (strategyId) => {
    axios.delete(`/api/strategies/${strategyId}`).then(() => {
      setStrategies(strategies.filter((strategy) => strategy._id !== strategyId));
    });
  };

  return (
    <div>
      <h3>Your Strategies</h3>
      <ul>
        {strategies.map((strategy) => (
          <li key={strategy._id}>
            {strategy.name} 
            <button onClick={() => handleDelete(strategy._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StrategyList;
