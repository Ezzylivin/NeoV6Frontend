// File: src/pages/Strategies.jsx
import React, { useState, useEffect, useCallback } from 'react';
import * as strategyApi from '../api/strategy.js';
import { strategies as strategyConfig } from '../config/strategyConfig.js'; // Import our new config

// Helper component for tooltips
const Tooltip = ({ text }) => (
  <span className="ml-2 text-gray-400 cursor-help" title={text}>ⓘ</span>
);

const StrategyForm = ({ selectedStrategy, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    params: { strategyType: 'SMA' }
  });

  // Set default parameters when the strategy type changes
  useEffect(() => {
    if (selectedStrategy) {
      setForm(selectedStrategy);
    } else {
      const strategyType = form.params.strategyType;
      const defaults = strategyConfig[strategyType].params.reduce((acc, p) => {
        acc[p.id] = p.defaultValue;
        return acc;
      }, {});
      setForm({
        name: '', description: '', params: { strategyType, ...defaults }
      });
    }
  }, [form.params.strategyType, selectedStrategy]);

  const handleTypeChange = (e) => {
    setForm(prev => ({ ...prev, params: { strategyType: e.target.value } }));
  };

  const handleParamChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      params: { ...prev.params, [name]: type === 'number' ? Number(value) : value }
    }));
  };
  
  const currentConfig = strategyConfig[form.params.strategyType];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="p-6 bg-gray-800 rounded-xl space-y-4">
      <h3 className="text-xl font-bold">{selectedStrategy ? 'Edit Strategy' : 'Create New Strategy'}</h3>
      
      {/* --- Strategy Type Selector --- */}
      <div>
        <label className="block text-sm font-medium text-gray-300">Strategy Type</label>
        <select value={form.params.strategyType} onChange={handleTypeChange} className="mt-1 block w-full bg-gray-700 rounded-md p-2">
          {Object.keys(strategyConfig).map(key => (
            <option key={key} value={key}>{strategyConfig[key].name}</option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-400">{currentConfig.description}</p>
      </div>

      <hr className="border-gray-600"/>

      <div>
        <label className="block text-sm font-medium text-gray-300">Custom Name</label>
        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., My Aggressive BTC Strategy" required className="mt-1 block w-full bg-gray-700 rounded-md p-2"/>
      </div>

      {/* --- Dynamic Parameter Inputs --- */}
      {currentConfig.params.map(param => (
        <div key={param.id}>
          <label className="block text-sm font-medium text-gray-300">
            {param.label}
            <Tooltip text={param.tooltip} />
          </label>
          <input 
            type={param.type}
            name={param.id}
            value={form.params[param.id] || ''}
            onChange={handleParamChange}
            required
            className="mt-1 block w-full bg-gray-700 rounded-md p-2"
          />
        </div>
      ))}
      
      <div className="flex gap-4 pt-4">
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
    setSelectedStrategy(null);
    fetchStrategies();
  };

  const handleDelete = async (strategyId) => {
    await strategyApi.remove(strategyId);
    fetchStrategies();
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
          {loading ? <p className="p-4">Loading...</p> : strategies.map(s => (
            <div key={s._id} className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{s.name}</p>
                <p className="text-sm text-gray-400">{strategyConfig[s.params.strategyType]?.name || s.params.strategyType}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedStrategy(s)} className="bg-yellow-600 text-white px-3 py-1 rounded">Edit</button>
                <button onClick={() => handleDelete(s._id)} className="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
              </div>
            </div>
          ))}
          {!loading && strategies.length === 0 && <p className="p-4 text-gray-400">Create your first strategy using the form above.</p>}
        </div>
      </div>
    </div>
  );
}
