export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  const [showTradeLines, setShowTradeLines] = useState(true);
  const [legend, setLegend] = useState({
    open: "--", high: "--", low: "--", close: "--", color: "#94a3b8"
  });

  const candles = useMemo(() => {
    const rawData = results?.candleData || results?.combinedResult?.candleData || [];
    return rawData.map((c) => ({
      time: Number(c.time), 
      open: parseFloat(c.open || 0),
      high: parseFloat(c.high || 0),
      low: parseFloat(c.low || 0),
      close: parseFloat(c.close || 0),
    })).sort((a, b) => a.time - b.time);
  }, [results]);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    
    // Cleanup previous instance
    if (chartRef.current) {
        chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(255, 255, 255, 0.05)" }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
      timeScale: { timeVisible: true, borderColor: "rgba(52, 211, 153, 0.2)" },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981", downColor: "#ef4444", borderVisible: false,
      wickUpColor: "#10b981", wickDownColor: "#ef4444",
    });

    // 1. Set Candle Data First
    candleSeries.setData(candles);

    // 2. Draw Trade Lines (Paths)
    if (showTradeLines) {
      const tradeLines = results?.tradeLines || results?.combinedResult?.tradeLines || [];
      tradeLines.forEach(line => {
        const lineSeries = chart.addLineSeries({
          color: line.color || "#34d399",
          lineWidth: 1,
          lineStyle: 2, 
          lastValueVisible: false,
          priceLineVisible: false,
        });
        lineSeries.setData([
          { time: Number(line.from.time), value: parseFloat(line.from.price) },
          { time: Number(line.to.time), value: parseFloat(line.to.price) }
        ].sort((a, b) => a.time - b.time));
      });
    }

    // 3. Set Markers
    const rawTrades = results?.trades || results?.combinedResult?.trades || [];
    if (rawTrades.length > 0) {
      const markers = rawTrades.map(t => ({
        time: Number(t.time),
        position: t.side === "long" ? "belowBar" : "aboveBar",
        color: t.side === "long" ? "#10b981" : "#f59e0b",
        shape: t.side === "long" ? "arrowUp" : "arrowDown",
        text: t.label || "E"
      })).sort((a, b) => a.time - b.time); // CRITICAL: Sorted markers
      candleSeries.setMarkers(markers);
    }

    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const data = param.seriesData.get(candleSeries);
        if (data) setLegend({
          open: data.open?.toFixed(2), high: data.high?.toFixed(2), 
          low: data.low?.toFixed(2), close: data.close?.toFixed(2), 
          color: data.close >= data.open ? "#10b981" : "#ef4444"
        });
      }
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;
    return () => chart.remove();
  }, [candles, results, showTradeLines]);

  if (candles.length === 0) return (
    <div className="h-[450px] flex items-center justify-center text-zinc-500 font-mono text-xs uppercase">
       Waiting for simulation data...
    </div>
  );

  return (
    <div className="independent-container relative w-full h-full">
      <div className="chart-hud absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-black/80 p-3 rounded-xl border border-white/10 font-mono text-[10px]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
             {/* Open, High, Low, Close items... */}
          </div>
        </div>
        <button onClick={() => setShowTradeLines(!showTradeLines)} className="...">
          <Activity size={12} /> {showTradeLines ? "HIDE PATHS" : "SHOW PATHS"}
        </button>
      </div>
      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
}
