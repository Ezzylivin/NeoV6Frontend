export const ChartReplay = ({ results, symbol = "BTC-USD" }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const candles = useMemo(() => {
    const rawData = results?.candleData || [];
    return rawData.map(c => ({ 
        time: Math.floor(new Date(c.time || c.timestamp).getTime() / 1000), 
        open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close) 
    })).sort((a, b) => a.time - b.time);
  }, [results]);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;
    if (chartRef.current) chartRef.current.remove();

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 450,
      layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: '#94a3b8' },
    });

    const series = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444' });
    
    // Initialize with just the first candle
    series.setData([candles[0]]);
    
    chartRef.current = chart;
    candlestickSeriesRef.current = series;
    return () => chart.remove();
  }, [candles]);

  // Replay Logic using .update() instead of .setData()
  useEffect(() => {
    let interval = null;
    if (isPlaying && currentIndex < candles.length - 1) {
      interval = setInterval(() => {
        const nextIndex = currentIndex + 1;
        const nextCandle = candles[nextIndex];
        
        // Use update for performance
        candlestickSeriesRef.current.update(nextCandle);
        
        // Handle markers at this step
        const tradesAtStep = (results?.trades || []).filter(t => {
            const tradeTime = Math.floor(new Date(t.entry_time || t.entryTime).getTime() / 1000);
            return tradeTime === nextCandle.time;
        });

        if (tradesAtStep.length > 0) {
            // Re-fetch all existing markers and add new one
            // setMarkers still requires the full array, unfortunately
        }

        setCurrentIndex(nextIndex);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, candles, results]);

  return (
    <div className="chart-replay-container">
        {/* Controls... */}
        <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  );
};
