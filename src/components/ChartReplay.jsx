// File: src/components/ChartReplay.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';

// Helper to format timestamps for the chart
const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

export const ChartReplay = ({ results }) => {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(50); // Milliseconds

  // Extract and prepare data
  const candleData = useMemo(() => results.equityCurve, [results]);
  const tradeData = useMemo(() => results.tradeBreakdown, [results]);

  // --- This is the Animation Loop ---
  useEffect(() => {
    if (isPlaying && playbackIndex < candleData.length - 1) {
      // Set a timeout to advance to the next "frame" (candle)
      const timer = setTimeout(() => {
        setPlaybackIndex(prevIndex => prevIndex + 1);
      }, playbackSpeed);

      // Clean up the timer if the component unmounts or playback stops
      return () => clearTimeout(timer);
    }
  }, [isPlaying, playbackIndex, candleData, playbackSpeed]);

  // --- Data for the chart ---
  const currentCandleData = useMemo(() => {
    return candleData.slice(0, playbackIndex + 1);
  }, [candleData, playbackIndex]);

  // --- Trades to be drawn on the chart ---
  const visibleTrades = useMemo(() => {
    if (!currentCandleData.length) return [];
    const lastVisibleTime = new Date(currentCandleData[currentCandleData.length - 1].timestamp).getTime();
    
    return tradeData.filter(trade => {
      const entryTime = new Date(trade.entryTime).getTime();
      return entryTime <= lastVisibleTime;
    });
  }, [tradeData, currentCandleData]);

  // --- The Bot's Current Position ---
  const lastCandle = currentCandleData[currentCandleData.length - 1];
  const botIcon = lastCandle ? "🤖" : "";
  const botY = lastCandle ? lastCandle.balance : 0;
  const botX = lastCandle ? lastCandle.timestamp : 0;

  // --- Handlers ---
  const handlePlayPause = () => {
    if (playbackIndex >= candleData.length - 1) {
      setPlaybackIndex(0); // Restart if at end
    }
    setIsPlaying(prev => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPlaybackIndex(0);
  };

  const handleSpeedChange = (e) => {
    // Speed is inverse, so 200ms is "slower" than 50ms
    setPlaybackSpeed(200 - e.target.value); 
  };


  return (
    <div className="chart-replay-container">
      <h3>Chart Replay</h3>
      
      {/* Playback Controls */}
      <div className="playback-controls">
        <button onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
        <button onClick={handleReset}>Reset</button>
        <label>
          Speed:
          <input 
            type="range" 
            min="0" 
            max="190" // 200ms (slow) to 10ms (fast)
            defaultValue={150} // Default 50ms
            onChange={handleSpeedChange} 
          />
        </label>
        <span>{playbackIndex + 1} / {candleData.length}</span>
      </div>

      {/* The Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={currentCandleData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey="timestamp" tickFormatter={formatChartDate} />
          <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <CartesianGrid stroke="#555" strokeDasharray="3 3"/>
          <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} strokeWidth={2} isAnimationActive={false} />

          {/* Draw the "Bot" Icon */}
          <ReferenceDot 
            x={botX} 
            y={botY} 
            r={10} 
            fill="#8884d8" 
            stroke="none"
          >
             <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="12px">{botIcon}</text>
          </ReferenceDot>

          {/* Draw the Trades */}
          {visibleTrades.map((trade, index) => (
            <ReferenceDot
              key={`trade-${index}`}
              x={trade.entryTime}
              y={trade.entryPrice}
              r={8}
              fill={trade.position === 'long' ? '#22c55e' : '#ef4444'}
              stroke="white"
            >
              <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10px">
                {trade.position === 'long' ? 'B' : 'S'}
              </text>
            </ReferenceDot>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
