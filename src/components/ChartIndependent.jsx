import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

export const ChartIndependent = ({ results, symbol }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const tradeLineSeriesRef = useRef(null); // The "Laser Line"
  
  const [highlightedTrade, setHighlightedTrade] = useState(null);
  const [chartWidth, setChartWidth] = useState(800);

  // --- 1. PARSE DATA ---
  const parseTime = (t) => {
      if (!t) return null;
      if (typeof t === 'object' && t.$date) t = t.$date;
      if (typeof t === 'number' && t < 10000000000) return t; // UNIX seconds
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
      position: t.position,
      duration: t.exitTime && t.entryTime ? ((new Date(t.exitTime) - new Date(t.entryTime)) / (1000 * 60 * 60)).toFixed(1) : '0'
    })).sort((a, b) => a.entryTime - b.entryTime); // Sort chronologically
  }, [results]);

  // --- 2. INIT CHART ---
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Cleanup old chart
    if (chartRef.current) chartRef.current.remove();

    // Create Chart
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { backgroundColor: '#16161e', textColor: '#d1d5db' },
      grid: { vertLines: { color: '#2b2b3b' }, horzLines: { color: '#2b2b3b' } },
      timeScale: { borderColor: '#485c7b', timeVisible: true },
    });

    // 1. Candle Series
    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#4ade80', downColor: '#f87171',
        borderVisible: false, wickUpColor: '#4ade80', wickDownColor: '#f87171',
    });
    candleSeriesRef.current.setData(candles);

    // 2. The "Laser Line" Series (Hidden by default, shown on hover)
    tradeLineSeriesRef.current = chartRef.current.addLineSeries({
        color: '#fbbf24', // Amber for visibility
        lineWidth: 3,
        crosshairMarkerVisible: false,
        lineStyle: 0, // Solid
        lastValueVisible: false,
        priceLineVisible: false,
    });

    // 3. Add Static Markers for ALL Entries/Exits
    const markers = [];
    trades.forEach(t => {
        // Entry Marker
        markers.push({
            time: t.entryTime,
            position: t.position === 'long' ? 'belowBar' : 'aboveBar',
            color: t.position === 'long' ? '#2196F3' : '#E91E63',
            shape: t.position === 'long' ? 'arrowUp' : 'arrowDown',
            text: `E` // Simple E for Entry
        });
        // Exit Marker
        if (t.exitTime) {
            markers.push({
                time: t.exitTime,
                position: t.position === 'long' ? 'aboveBar' : 'belowBar',
                color: t.profit > 0 ? '#4CAF50' : '#F44336',
                shape: 'circle',
                text: `X` // X for Exit
            });
        }
    });
    // Sort markers by time
    markers.sort((a, b) => a.time - b.time);
    candleSeriesRef.current.setMarkers(markers);

    chartRef.current.timeScale().fitContent();

    // Resize Handler
    const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
            setChartWidth(chartContainerRef.current.clientWidth);
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    };
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) chartRef.current.remove();
    };
  }, [candles, trades]);


  // --- 3. HOVER EFFECT (The Laser Line Logic) ---
  useEffect(() => {
    if (!tradeLineSeriesRef.current) return;

    if (highlightedTrade) {
        // 1. Prepare Line Data
        // We only want a line from Entry to Exit.
        // Lightweight charts interpolates. So we just give it two points.
        const lineData = [
            { time: highlightedTrade.entryTime, value: highlightedTrade.entryPrice },
            { time: highlightedTrade.exitTime, value: highlightedTrade.exitPrice }
        ];

        // 2. Set Data
        tradeLineSeriesRef.current.setData(lineData);

        // 3. Update Options (Color based on Profit)
        tradeLineSeriesRef.current.applyOptions({
            color: highlightedTrade.profit > 0 ? '#4ade80' : '#f87171', // Green or Red laser
            lineStyle: 0 // Solid
        });
        
        // 4. Optional: Zoom/Pan to trade (Distracting? Let's skip auto-zoom, just highlight)
        
    } else {
        // Clear Line
        tradeLineSeriesRef.current.setData([]);
    }
  }, [highlightedTrade]);

  if (!results) return <div>No Data</div>;

  return (
    <div className="flex flex-col gap-4 bg-[#1e1e2e] p-4 rounded-lg text-gray-200">
      <div className="flex justify-between items-center pb-2 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Independent Bot Visualizer</h2>
          <div className="text-sm text-gray-400">Hover over the list to trace specific trades</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[600px]">
          {/* LEFT: The Chart */}
          <div className="flex-1 relative border border-gray-700 rounded bg-[#16161e]">
             <div ref={chartContainerRef} className="w-full h-full" />
             {highlightedTrade && (
                 <div className="absolute top-4 left-4 bg-black/80 p-2 rounded border border-gray-600 z-10 text-xs">
                     <div className="font-bold text-yellow-400">TRACING TRADE #{highlightedTrade.id + 1}</div>
                     <div>Entry: ${highlightedTrade.entryPrice.toFixed(2)}</div>
                     <div>Exit: ${highlightedTrade.exitPrice.toFixed(2)}</div>
                     <div className={highlightedTrade.profit > 0 ? 'text-green-400' : 'text-red-400'}>
                        PnL: ${highlightedTrade.profit.toFixed(2)}
                     </div>
                 </div>
             )}
          </div>

          {/* RIGHT: The Independent Trade List */}
          <div className="w-full lg:w-80 overflow-y-auto border-l border-gray-700 bg-[#1e1e2e] pr-2">
              <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-[#2d2d3f] z-10 text-xs uppercase text-gray-400">
                      <tr>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-right">Entry</th>
                          <th className="p-2 text-right">PnL</th>
                      </tr>
                  </thead>
                  <tbody>
                      {trades.map((t) => (
                          <tr 
                            key={t.id}
                            className={`border-b border-gray-700 cursor-pointer transition-colors
                                ${highlightedTrade?.id === t.id ? 'bg-gray-700' : 'hover:bg-[#2a2a35]'}
                            `}
                            onMouseEnter={() => setHighlightedTrade(t)}
                            onMouseLeave={() => setHighlightedTrade(null)}
                          >
                              <td className="p-2">
                                  <div className={`font-bold text-xs ${t.position === 'long' ? 'text-blue-400' : 'text-pink-400'}`}>
                                      {t.position.toUpperCase()}
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                      {new Date(t.entryTime * 1000).toLocaleDateString()}
                                  </div>
                              </td>
                              <td className="p-2 text-right">
                                  ${t.entryPrice.toFixed(0)}
                                  <div className="text-[10px] text-gray-500">{t.duration}h</div>
                              </td>
                              <td className={`p-2 text-right font-mono ${t.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
