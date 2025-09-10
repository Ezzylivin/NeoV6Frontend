// File: src/components/StrategyForm.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const StrategyForm = ({ strategyId, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    params: { symbol: "BTCUSDT", timeframe: "1h", strategyType: "SMA" },
    realism: { useNews: true, useSlippage: true, useSpread: true, useRandomEvents: true },
  });

  useEffect(() => {
    if (strategyId) {
      // If editing, fetch the strategy data
      axios.get(`/api/strategies/${strategyId}`).then((response) => {
        setFormData(response.data);
      });
    }
  }, [strategyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);  // Submit the form data to the parent component
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Name:</label>
      <input type="text" name="name" value={formData.name} onChange={handleChange} />

      <label>Description:</label>
      <input type="text" name="description" value={formData.description} onChange={handleChange} />

      {/* Add other fields for params and realism */}
      {/* For example, symbol, timeframe, strategyType, stopLoss, takeProfit, etc. */}

      <button type="submit">Save Strategy</button>
    </form>
  );
};

export default StrategyForm;
