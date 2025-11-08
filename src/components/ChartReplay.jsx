// File: src/components/ChartReplay.jsx
//
// 🚀 UPGRADED VERSION 🚀
// - Adds a "Heads-Up Display (HUD)" for bot status and live PnL.
// - Adds a "Bot Thinking" display for ML probabilities.
// - 🔧 FIX: Removes all 'transclusion' and 'section-divider' errors.
// - ✨ POLISH: Adds icons to playback buttons.

import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Line, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  ReferenceDot, ErrorBar
} from 'recharts';
import './ChartReplay.css'; // We will need to create this CSS file

// How many candles to show on screen at once.
const WINDOW_SIZE = 150;

// --- Helper Components for Chart ---

// 1. A custom bar shape for Candlesticks (red/green)
const CustomCandleBar = (props) => {
  const { x, y, width, height, payload } = props;
  const isBullish = payload.openClose[1] >= payload.openClose[0];
  const fill = isBullish ? '#22c55e' : '#ef4444';
  return <path d={`M ${x},${y} h ${width} v ${height} h ${-width} Z`} fill={fill} />;
};

// 2. A custom SVG for the "Buy" arrow
const BuyArrow = ({ cx, cy }) => {
  if (isNaN(cx) || isNaN(cy)) {
    return null;
  }
  return (
    <svg x={cx - 8} y={cy + 8} width="16" height="16" fill="#22c55e" viewBox="0 0 1024 1024">
      <path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35.1 18.5 35.1h656.8c19.7 0 30.7-20.9 18.5-35.1z" />
    </svg>
  );
};

// 3. A custom SVG for the "Sell" arrow
const SellArrow = ({ cx, cy }) => {
  if (isNaN(cx) || isNaN(cy)) {
    return null;
  }
  return (
    <svg x={cx - 8} y={cy - 24} width="16" height="16" fill="#ef4444" viewBox="0 0 1024 1024">
      <path d="M840.4 300H183.6c-19.7 0-30.7 20.9-18.5 35.1l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335.1c12.2-14.2 1.2-35.1-18.5-35.1z" />
    </svg>
  );
};

// 4. A custom SVG for the "Bot" icon
const BotIcon = ({ cx, cy }) => {
  if (isNaN(cx) || isNaN(cy)) {
    return null;
  }
  return (
    <svg x={cx - 10} y={cy - 10} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect x="4" y="12" width="16" height="10" rx="2" />
      <path d="M2 12h20" />
      <path d="M12 12v-4" />
    </svg>
  );
};

// --- Main Replay Component ---
export const ChartReplay = ({ results }) => {
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(50); // Milliseconds

  // --- 1. Prepare Data ---
  const { combinedData, tradeData, yDomain } = useMemo(() => {
    const candleData = results?.candleData || [];
    const predData = results?.mlPredictions || [];
    const tradeData = results?.tradeBreakdown || [];

    // Create a fast lookup map for predictions
    const predMap = new Map();
    predData.forEach(p => predMap.set(p.timestamp, p));
    
    let minY = Infinity;
    let maxY = -Infinity;

    // Combine candle and prediction data
    const combined = candleData.map(candle => {
      const pred = predMap.get(candle.timestamp) || {};
      
      // For candlestick wicks
      const highLow = [candle.low, candle.high];
      // For candlestick body
      const openClose = [candle.open, candle.close];

      // Update Y-axis domain
      if (candle.high > maxY) maxY = candle.high;
      if (candle.low < minY) minY = candle.low;

      return {
        ...candle,
        timestamp: new Date(candle.timestamp).getTime(),
        highLow,
        openClose,
        prob_buy: pred.prob_buy || 0,
        prob_sell: pred.prob_sell || 0,
        prob_hold: 1 - (pred.prob_buy || 0) - (pred.prob_sell || 0), // Calculate hold
      };
    });

    // Add padding to the Y-axis
    const padding = (maxY - minY) * 0.1;
    const yDomain = [Math.floor(minY - padding), Math.ceil(maxY + padding)];

    // 🔧 FIX: Removed stray 'transclusion-block-end'
    return { combinedData: combined, tradeData, yDomain };
  }, [results]);

  // --- 2. Animation Loop ---
  useEffect(() => {
    if (isPlaying && playbackIndex < combinedData.length - 1) {
      const timer = setTimeout(() => {
        setPlaybackIndex(prevIndex => prevIndex + 1);
      }, playbackSpeed);
      return () => clearTimeout(timer);
    } else if (playbackIndex >= combinedData.length - 1) {
      setIsPlaying(false); // Stop at the end
    }
  }, [isPlaying, playbackIndex, combinedData.length, playbackSpeed]);

  // --- 3. Sliced Data for Animation ---
  // This is the "Sliding Window"
  const currentData = useMemo(() => {
    // Calculate the start of our window
    const startIndex = Math.max(0, playbackIndex - WINDOW_SIZE + 1);
    // Calculate the end of our window
    const endIndex = playbackIndex + 1;
    // Slice the data to only get this window
    return combinedData.slice(startIndex, endIndex);
  }, [combinedData, playbackIndex]);

  // 🔧 FIX: Removed stray 'section-divider'

  // Find trades that are visible in the current view
  const visibleTrades = useMemo(() => {
    if (!currentData.length) return [];
    const lastVisibleTime = currentData[currentData.length - 1].timestamp;
    
    return tradeData.filter(trade => {
      const entryTime = new Date(trade.entryTime).getTime();
      // Filter out invalid trades that would cause a crash
      return entryTime <= lastVisibleTime && typeof trade.entryPrice === 'number';
    });
  }, [tradeData, currentData]);
  
  // Find the bot's current position
  const currentBotPosition = useMemo(() => {
    const lastCandle = currentData[currentData.length - 1];
    if (!lastCandle) return null;
    
    return {
      x: lastCandle.timestamp,
      y: lastCandle.close, // Bot sits on the 'close' price
    };
  }, [currentData]);

  // 💡 --- NEW HUD #1: Bot Status & PnL ---
  const botStatus = useMemo(() => {
    const lastCandle = currentData[currentData.length - 1];
    if (!lastCandle) return { status: 'FLAT', pnl: 0, pnlPct: 0 };

    // Find the last trade that has been entered
    const lastTrade = [...tradeData]
      .reverse()
      .find(trade => new Date(trade.entryTime).getTime() <= lastCandle.timestamp);

    if (!lastTrade) {
      return { status: 'FLAT', pnl: 0, pnlPct: 0 };
    }

    const isExited = lastTrade.exitTime && new Date(lastTrade.exitTime).getTime() <= lastCandle.timestamp;
    
    // If the last trade is already exited, we are flat
    if (isExited) {
      return { status: 'FLAT', pnl: 0, pnlPct: 0 };
    }

    // If we are here, the trade is open
    const entryPrice = lastTrade.entryPrice;
    const currentPrice = lastCandle.close;
    const size = lastTrade.size;
    const position = lastTrade.position; // "long" or "short"
    const entryValue = entryPrice * size;

    let pnl = 0;
    if (position === 'long') {
      pnl = (currentPrice - entryPrice) * size;
    } else {
      pnl = (entryPrice - currentPrice) * size;
    }
    
    const pnlPct = (pnl / entryValue) * 100;

    return { status: position.toUpperCase(), pnl: pnl, pnlPct: pnlPct };

  }, [currentData, tradeData]);

  // 💡 --- NEW HUD #2: "Bot is Thinking" ---
  const botThought = useMemo(() => {
    const lastCandle = currentData[currentData.length - 1];
    if (!lastCandle || !results?.mlPredictions?.length > 0) return null;

    const { prob_buy, prob_sell, prob_hold } = lastCandle;

    if (prob_buy > prob_sell && prob_buy > prob_hold && prob_buy > 0.4) {
      return { thought: 'BUY', prob: prob_buy, color: '#22c55e' };
    }
    if (prob_sell > prob_buy && prob_sell > prob_hold && prob_sell > 0.4) {
      return { thought: 'SELL', prob: prob_sell, color: '#ef4444' };
    }
    return { thought: 'HOLD', prob: prob_hold, color: '#9ca3af' };

  }, [currentData, results?.mlPredictions]);

  // --- 4. Handlers ---
  const handlePlayPause = () => {
    if (playbackIndex >= combinedData.length - 1) {
      setPlaybackIndex(0);
    }
    // 🔧 FIX: Removed stray 'transclusion-block-end'
    setIsPlaying(prev => !prev);
  };
  const handleReset = () => {
    setIsPlaying(false);
    setPlaybackIndex(0);
  };
  const handleSpeedChange = (e) => {
    // 💡 POLISH: Invert slider so left=slow, right=fast
    const newSpeed = 200 - e.target.value; 
    setPlaybackSpeed(Math.max(10, newSpeed)); // 10ms is fastest
  };

  if (!combinedData.length) {
    return <div>Preparing replay data...</div>;
  }

  const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  };

  // 💡 Helper to format PnL color
  const getPnlColor = (pnl) => (pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : '#9ca3af');

  return (
    <div className="chart-replay-container">
      <h3>Chart Replay</h3>
      
      {/* --- 5. Playback Controls --- */}
      <div className="playback-controls">
        {/* 💡 POLISH: Added icons to buttons */}
        <button onClick={handlePlayPause}>{isPlaying ? '⏸️' : '▶️'}</button>
        <button onClick={handleReset}>🔄</button>
        <label>
          Slow
          <input 
            type="range"
            min="0" 
            max="190" // 200ms (slow) to 10ms (fast)
            defaultValue={150} 
            onChange={handleSpeedChange} 
          />
          Fast
        </label>
        <span className="candle-counter">Candle: {playbackIndex + 1} / {combinedData.length}</span>
      </div>

      {/* 💡 --- NEW HUD SECTION --- 💡 */}
      <div className="replay-hud">
        <div className="hud-item">
          <span className="hud-label">Position</span>
          <span className="hud-value" style={{ color: botStatus.status === 'LONG' ? '#22c55e' : botStatus.status === 'SHORT' ? '#ef4444' : '#9ca3af' }}>
            {botStatus.status}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Open PnL</span>
          <span className="hud-value" style={{ color: getPnlColor(botStatus.pnl) }}>
            ${botStatus.pnl.toFixed(2)}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Open PnL (%)</span>
          <span className="hud-value" style={{ color: getPnlColor(botStatus.pnlPct) }}>
            {botStatus.pnlPct.toFixed(2)}%
          </span>
        </div>
        {botThought && (
          <div className="hud-item">
            <span className="hud-label">Bot is Thinking...</span>
            <span className="hud-value" style={{ color: botThought.color }}>
              {botThought.thought} ({(botThought.prob * 100).toFixed(0)}%)
            </span>
          </div>
        )}
      </div>
      {/* 💡 --- END NEW HUD SECTION --- 💡 */}


      {/* --- 6. The Candlestick Chart --- */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={currentData} syncId="replayChart">
          <CartesianGrid stroke="#333" />
          <XAxis 
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatChartDate} 
            minTickGap={60}
          />
          <YAxis 
            scale="linear"
            domain={yDomain} 
            orientation="right" 
            tickFormatter={(tick) => `$${tick.toLocaleString()}`}
          />
          <Tooltip />
          
          {/* Wicks (ErrorBar) - must come before Bar */}
          <Bar dataKey="highLow" fill="none" isAnimationActive={false}>
            <ErrorBar dataKey="highLow" width={1} stroke="#aaa" direction="y" />
          </Bar>

          {/* Body (Bar) */}
          <Bar 
            dataKey="openClose"
            shape={<CustomCandleBar />} 
            isAnimationActive={false} 
            barCategoryGap={1} // 🚀 FIX: Adds a 1px gap between candles
          />

          {/* Draw Trades */}
          {visibleTrades.map((trade, i) => (
            <ReferenceDot
              key={`entry-${i}`}
              x={new Date(trade.entryTime).getTime()}
              y={trade.entryPrice}
              label={trade.position === 'long' ? <BuyArrow /> : <SellArrow />}
            />
          ))}
          
          {/* Draw the Bot */}
          {currentBotPosition && (
            <ReferenceDot
              x={currentBotPosition.x}
              y={currentBotPosition.y}
              label={<BotIcon />}
              isFront={true}
            />
          )}
    </ComposedChart>
      </ResponsiveContainer>

      {/* --- 7. The "ML Brain" Chart --- */}
      {results?.mlPredictions?.length > 0 && (
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={currentData} syncId="replayChart">
            <CartesianGrid stroke="#333" />
            <XAxis 
              dataKey="timestamp" 
              type="number" 
              domain={['dataMin', 'dataMax']} 
              tickFormatter={() => ''} 
            />
            <YAxis domain={[0, 1]} hide />
            <Tooltip />
            <Area type="monotone" dataKey="prob_buy" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} isAnimationActive={false} />
            <Area type="monotone" dataKey="prob_sell" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
