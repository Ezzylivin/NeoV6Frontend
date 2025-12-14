// File: src/components/LiveTradingChart.jsx
// 🚀 UPGRADE: v66.0 - "TradingView Stability Patch"
// Fixes:
// 1. Prevents chart refresh / snap by calling setData() only once
// 2. Uses update() for live candles
// 3. Separates marker updates from price updates
// 4. Stabilizes marker IDs (no Math.random)

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './LiveTradingChart.css';

const LiveTradingChart = ({ candles = [], trades = [], activePositions = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const hasInitializedDataRef = useRef(false);

  // --- TIME PARSER (seconds only) ---
  const parseTime = (t) => {
    if (!t) return null;
    if (typeof t === 'object' && t.$date) t = t.$date;
    const d = new Date(t);
    if (isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  };

  // --- TRADE LOG ---
  const tradeLog = useMemo(() => {
    const closed = trades.map(t => ({
      type: 'CLOSED',
      side: t.position || t.side,
      price: t.exitPrice,
      profit: t.profit,
      time: t.exitTime || t.entryTime,
      id: `closed-${t.entryTime}-${t.exitTime}`,
    }));

    const open = activePositions.map(p => ({
      type: 'OPEN',
      side: p.side,
      price: p.entry_price,
      profit: 0,
      time: p.entry_time,
      id: `open-${p.entry_time}`,
    }));

    return [...open, ...closed]
      .filter(t => t.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [trades, activePositions]);

  // --- CANDLE DATA ---
  const chartData = useMemo(() => {
    if (!candles.length) return [];
    const map = new Map();

    candles.forEach(c => {
      const time = parseTime(c.timestamp || c.time || c.datetime || c.Date);
      if (!time) return;

      map.set(time, {
        time,
        open: +c.open,
        high: +c.high,
        low: +c.low,
        close: +c.close,
      });
    });

    return [...map.values()].sort((a, b) => a.time - b.time);
  }, [candles]);

  // --- MARKERS ---
  const markers = useMemo(() => {
    const m = [];

    trades.forEach(t => {
      const e = parseTime(t.entryTime);
      const x = parseTime(t.exitTime);
      if (e) m.push({ time: e, position: 'belowBar', color: '#2196F3', shape: 'arrowUp', text: 'BUY' });
      if (x) m.push({ time: x, position: 'aboveBar', color: t.profit > 0 ? '#4CAF50' : '#EF4444', shape: 'arrowDown', text: 'EXIT' });
    });

    activePositions.forEach(p => {
      const e = parseTime(p.entry_time);
      if (e) m.push({ time: e, position: 'belowBar', color: '#F59E0B', shape: 'arrowUp', text: 'OPEN' });
    });

    const validTimes = new Set(chartData.map(c => c.time));
    return m.filter(x => validTimes.has(x.time)).sort((a, b) => a.time - b.time);
  }, [trades, activePositions, chartData]);

  // --- INIT CHART ---
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: { backgroundColor: '#000', textColor: '#00ff41' },
      grid: { vertLines: { color: '#111' }, horzLines: { color: '#111' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#00ff41', timeVisible: true },
    });

    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#00ff41',
      downColor: '#ff0055',
      borderVisible: false,
      wickUpColor: '#00ff41',
      wickDownColor: '#ff0055',
    });

    const resize = () => {
      chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- PRICE DATA UPDATE ---
  useEffect(() => {
    if (!seriesRef.current || !chartData.length) return;

    if (!hasInitializedDataRef.current) {
      seriesRef.current.setData(chartData);
      chartRef.current.timeScale().fitContent();
      hasInitializedDataRef.current = true;
    } else {
      seriesRef.current.update(chartData[chartData.length - 1]);
    }
  }, [chartData]);

  // --- MARKER UPDATE (NO DATA RESET) ---
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setMarkers(markers);
    }
  }, [markers]);

  // --- ZOOM CONTROLS ---
  const handleFitContent = () => chartRef.current?.timeScale().fitContent();

  const zoom = (factor) => {
    const ts = chartRef.current?.timeScale();
    const r = ts?.getVisibleLogicalRange();
    if (!r) return;
    const mid = (r.from + r.to) / 2;
    const size = (r.to - r.from) * factor;
    ts.setVisibleLogicalRange({ from: mid - size / 2, to: mid + size / 2 });
  };

  const btnStyle = {
    background: 'rgba(0,255,65,0.1)',
    border: '1px solid #00ff41',
    color: '#00ff41',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '4px',
    marginLeft: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  };

  return (
    <div className="live-chart-wrapper">
      <div className="chart-trade-overlay">
        <div className="overlay-header">
          <h4 style={{ margin: 0, color: '#00ff41' }}>Live Feed</h4>
          <div>
            <button onClick={() => zoom(1.25)} style={btnStyle}>-</button>
            <button onClick={() => zoom(0.8)} style={btnStyle}>+</button>
            <button onClick={handleFitContent} style={btnStyle}>⤢</button>
          </div>
        </div>

        <div className="overlay-list">
          {tradeLog.length === 0 ? (
            <div className="empty">Waiting for trades…</div>
          ) : tradeLog.map(t => (
            <div key={t.id} className={`overlay-item ${t.type}`}>
              <div className="row-top">
                <span className={`badge ${t.type}`}>{t.type}</span>
                <span className={`side ${t.side}`}>{t.side?.toUpperCase()}</span>
                <span className="time">{new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="row-bot">
                <span>@ {t.price?.toFixed(2)}</span>
                {t.profit !== undefined && (
                  <span className={t.profit > 0 ? 'win' : 'loss'}>
                    {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {chartData.length === 0 && (
        <div className="chart-placeholder">
          <div className="spinner" />
          <p>Acquiring Exchange Data…</p>
        </div>
      )}

      <div ref={chartContainerRef} className="live-chart-container" />
    </div>
  );
};

export default LiveTradingChart;
