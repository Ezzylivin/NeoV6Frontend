// File: src/pages/Strategies.jsx
import React, { useState, useEffect, useCallback } from 'react';
import * as strategyApi from '../api/strategy.js';

// A form for creating and editing a strategy
const StrategyForm = ({ selectedStrategy, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    params: { strategyType: 'SMA', fast: 10, slow: 20 }
  });

  useEffect(() => {
    // If we are editing an existing strategy, populate the form
    if (selectedStrategy) {
      setForm(selectedStrategy);
    } else {
      // Otherwise, reset to default
      setForm({ name: '', description: '', params: { strategyType: 'SMA', fast: 10, slow: 20 } });
    }
  }, [selectedStrategy]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      params: { ...prev.params, [name]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-gray-800 rounded-xl space-y-4">
      <h3 className="text-xl font-bold">{selectedStrategy ? 'Edit Strategy' : 'Create New Strategy'}</h3>
      <div>
        <label className="block text-sm font-medium text-gray-300">Strategy Name</label>
        <input type="text" name="name" value={form.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Description</label>
        <input type="text" name="description" value={form.description} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
      </div>
      {/* Add more inputs here for strategy parameters like fast, slow, period, etc. */}
      <div className="flex gap-4">
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Save Strategy</button>
        {selectedStrategy && <button type="button" onClick={onCancel} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md">Cancel Edit</button>}
      </div>
    </form>
  );
};

export default function Strategies() {
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    const data = await strategyApi.fetchAll();
    setStrategies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const handleSave = async (strategyData) => {
    await strategyApi.upsert(strategyData);
    setSelectedStrategy(null); // Reset form
    fetchStrategies(); // Refresh the list
  };

  const handleDelete = async (strategyId) => {
    await strategyApi.remove(strategyId);
    fetchStrategies(); // Refresh the list
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Strategy Management</h1>
      
      <StrategyForm 
        selectedStrategy={selectedStrategy}
        onSave={handleSave}
        onCancel={() => setSelectedStrategy(null)}
      />

      <div>
        <h2 className="text-2xl font-bold mb-4">Your Saved Strategies</h2>
        <div className="bg-gray-800 rounded-xl">
          {loading ? <p className="p-4">Loading strategies...</p> : strategies.map(s => (
            <div key={s._id} className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{s.name}</p>
                <p className="text-sm text-gray-400">{s.params?.strategyType}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedStrategy(s)} className="bg-yellow-600 text-white px-3 py-1 rounded">Edit</button>
                <button onClick={() => handleDelete(s._id)} className="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
              </div>
            </div>
          ))}
          {!loading && strategies.length === 0 && <p className="p-4 text-gray-400">You have not created any strategies yet.</p>}
        </div>
      </div>
    </div>
  );
}
