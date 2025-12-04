// File: src/components/ChartIndependent.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import './ChartIndependent.css';

export const ChartIndependent = ({ results, symbol }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const tradeLineSeriesRef = useRef(null);
  
  const [highlightedTrade, setHighlightedTrade] = useState(null);
  
  // --- 1. DATA PARSING ---
  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      if (typeof t === 'number' && t < 10000000000) return t; 
      const d = new Date(t);
      return isNaN(d.getTime()) ? null : d.getTime() / 1000;
  };

  const candles = useMemo(() => {
    if (!results?.candleData) return [];
    return results.candleData.map(c => ({
      time: parseTime(c.timestamp || c.time || c.datetime || c.date), 
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
    })).filter(c => c.time).sort((a, b) => a.time - b.time);
  }, [results]);

  const trades = useMemo(() => {
    if (!results?.tradeBreakdown) return [];
    return results.tradeBreakdown.map((t, i) => ({
      id: i,
      entryTime: parseTime(t.entryTime),
      exitTime: parseTime(t.exitTime),
      entryPrice: parseFloat(t.price || t.entryPrice),
      exitPrice: parseFloat(t.exitPrice),
      profit: parseFloat(t.profit),
      position: (t.position || 'long').toLowerCase(),
      duration: t.exitTime && t.entryTime ? ((new Date(t.exitTime) - new Date(t.entryTime)) / (1000 * 60 * 60)).toFixed(1) : '0'
    })).sort((a, b) => a.entryTime - b.entryTime);
  }, [results]);

  const totalPnL = trades.reduce((acc, t) => acc + t.profit, 0);

  // --- 2. CHART INITIALIZATION ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    if (chartRef.current) chartRef.current.remove();

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { backgroundColor: '#0f172a', textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      timeScale: { borderColor: '#334155', timeVisible: true },
      rightPriceScale: { borderColor: '#334155' },
      crosshair: { mode: CrosshairMode.Normal },
    });

    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    candleSeriesRef.current.setData(candles);

    tradeLineSeriesRef.current = chartRef.current.addLineSeries({
        color: '#fbbf24',
        lineWidth: 2,
        crosshairMarkerVisible: false,
        lineStyle: 2, 
        lastValueVisible: false,
        priceLineVisible: false,
    });

    const markers = [];
    trades.forEach(t => {
        markers.push({
            time: t.entryTime,
            position: t.position === 'long' ? 'belowBar' : 'aboveBar',
            color: t.position === 'long' ? '#3b82f6' : '#ec4899',
            shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
            text: 'E',
            size: 0.5 
        });
        if (t.exitTime) {
            markers.push({
                time: t.exitTime,
                position: t.position === 'long' ? 'aboveBar' : 'belowBar',
                color: t.profit > 0 ? '#22c55e' : '#ef4444',
                shape: 'circle',
                text: 'X',
                size: 0.5 
            });
        }
    });
    markers.sort((a, b) => a.time - b.time);
    candleSeriesRef.current.setMarkers(markers);

    chartRef.current.timeScale().fitContent();

    const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ 
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight
            });
        }
    };
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) chartRef.current.remove();
    };
  }, [candles, trades]);


  // --- 3. LASER LINE & AUTO-FOCUS LOGIC ---
  useEffect(() => {
    if (!tradeLineSeriesRef.current || !chartRef.current) return;

    if (highlightedTrade) {
        // A. Draw the Laser Line
        const lineData = [
            { time: highlightedTrade.entryTime, value: highlightedTrade.entryPrice },
            { time: highlightedTrade.exitTime, value: highlightedTrade.exitPrice }
        ];
        tradeLineSeriesRef.current.setData(lineData);
        
        const isWin = highlightedTrade.profit > 0;
        tradeLineSeriesRef.current.applyOptions({
            color: isWin ? '#4ade80' : '#f87171', 
            lineWidth: 3,
            lineStyle: 0 
        });

        // B. AUTO-FOCUS LOGIC (Pan & Zoom to Trade)
        const duration = highlightedTrade.exitTime - highlightedTrade.entryTime;
        
        // Calculate "Breathing Room" (Padding)
        // If duration is 0 (same bar exit), use ~20 bars padding (assuming hourly: 20 * 3600)
        // Otherwise use 50% of the trade duration as padding on each side
        let padding = duration === 0 ? 3600 * 20 : duration * 0.5;
        
        // Enforce a minimum padding of 10 hours so we don't zoom in excessively on quick scalps
        padding = Math.max(padding, 3600 * 10); 

        chartRef.current.timeScale().setVisibleRange({
            from: highlightedTrade.entryTime - padding,
            to: highlightedTrade.exitTime + padding
        });
        
    } else {
        tradeLineSeriesRef.current.setData([]);
    }
  }, [highlightedTrade]);

  if (!results) return <div className="loading-chart">No Data Available</div>;

  return (
    <div className="independent-container">
      {/* HEADER */}
      <div className="independent-header">
          <h2>
             <span style={{fontSize:'1.2rem'}}>🔭</span> 
             Independent Trade Inspector 
             <span className="stat-badge">{symbol}</span>
          </h2>
          <div style={{display:'flex', gap:'12px', fontSize:'0.9rem'}}>
              <span style={{color:'#94a3b8'}}>Trades: <b style={{color:'#fff'}}>{trades.length}</b></span>
              <span style={{color:'#94a3b8'}}>Net PnL: <b style={{color: totalPnL >= 0 ? '#4ade80' : '#f87171'}}>${totalPnL.toFixed(2)}</b></span>
          </div>
      </div>

      {/* BODY */}
      <div className="independent-body">
          
          {/* LEFT: CHART */}
          <div className="chart-section">
             <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
             
             {highlightedTrade && (
                 <div className={`chart-hud ${highlightedTrade.profit > 0 ? 'win' : 'loss'}`}>
                     <div className="hud-title">Trade #{highlightedTrade.id + 1} Analysis</div>
                     <div className="hud-row">
                         <span>Status</span>
                         <span className="hud-val" style={{color: highlightedTrade.profit > 0 ? '#4ade80' : '#f87171'}}>
                            {highlightedTrade.profit > 0 ? 'WIN' : 'LOSS'}
                         </span>
                     </div>
                     <div className="hud-row">
                         <span>Entry</span>
                         <span className="hud-val">${highlightedTrade.entryPrice.toFixed(2)}</span>
                     </div>
                     <div className="hud-row">
                         <span>Exit</span>
                         <span className="hud-val">${highlightedTrade.exitPrice.toFixed(2)}</span>
                     </div>
                     <div className="hud-row" style={{marginTop:'8px', borderTop:'1px solid #334155', paddingTop:'4px'}}>
                         <span>Realized PnL</span>
                         <span className="hud-val" style={{fontSize:'1rem', color: highlightedTrade.profit > 0 ? '#4ade80' : '#f87171'}}>
                             {highlightedTrade.profit > 0 ? '+' : ''}{highlightedTrade.profit.toFixed(2)}
                         </span>
                     </div>
                 </div>
             )}
          </div>

          {/* RIGHT: LIST */}
          <div className="list-section">
              <div className="trade-list-header">
                  <span>Signal</span>
                  <span style={{textAlign:'right'}}>Entry</span>
                  <span style={{textAlign:'right'}}>Result</span>
              </div>
              <div className="trade-list-scroll">
                  {trades.map((t) => (
                      <div 
                        key={t.id}
                        className={`trade-row ${highlightedTrade?.id === t.id ? 'active' : ''}`}
                        onMouseEnter={() => setHighlightedTrade(t)}
                        onMouseLeave={() => setHighlightedTrade(null)}
                      >
                          <div>
                              <span className={`badge ${t.position}`}>
                                  {t.position}
                              </span>
                              <div className="date-sub">
                                  {new Date(t.entryTime * 1000).toLocaleDateString(undefined, {month:'numeric', day:'numeric', year:'2-digit'})}
                              </div>
                          </div>
                          <div className="price-cell">
                              ${t.entryPrice.toFixed(0)}
                              <div className="date-sub">{t.duration}h hold</div>
                          </div>
                          <div className={`pnl-cell ${t.profit > 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                              {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};
