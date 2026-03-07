useEffect(() => {
    // 1. Guard: Don't run if no container or no data
    if (!chartContainerRef.current || !candles || candles.length === 0) return;

    // 2. Manual Cleanup: If a chart already exists in the ref, remove it first
    if (chartRef.current) {
        try {
            chartRef.current.remove();
        } catch (e) {
            console.warn("Pre-cleanup failed:", e);
        }
        chartRef.current = null;
    }

    // 3. Create the Chart
    const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500,
        layout: { 
            background: { type: ColorType.Solid, color: "transparent" }, 
            textColor: "#94a3b8" 
        },
        grid: { 
            vertLines: { color: "rgba(255, 255, 255, 0.05)" }, 
            horzLines: { color: "rgba(255, 255, 255, 0.05)" } 
        },
        timeScale: { 
            timeVisible: true, 
            borderColor: "#374151",
            barSpacing: 10, 
            rightOffset: 5
        },
        crosshair: { mode: CrosshairMode.Normal },
    });

    // 4. Setup Series
    const candleSeries = chart.addCandlestickSeries({ 
        upColor: "#10b981", 
        downColor: "#ef4444", 
        borderVisible: false, 
        wickVisible: true 
    });
    
    candleSeries.setData(candles);
    candleSeries.setMarkers(markers);

    const tradeLineSeries = chart.addLineSeries({
        color: 'rgba(255, 255, 255, 0.6)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
    });
    
    // Save to refs
    chartRef.current = chart;
    tradeLineSeriesRef.current = tradeLineSeries;

    // 5. Legend Helper
    const updateLegend = (data) => {
        if (!data) return;
        const dateStr = new Date(data.time * 1000).toLocaleDateString();
        setLegend({
            open: data.open, high: data.high, low: data.low, close: data.close,
            timeStr: dateStr
        });
    };

    const lastCandle = candles[candles.length - 1];
    if (lastCandle) updateLegend(lastCandle);

    // 6. Crosshair Movement (Defensive check)
    chart.subscribeCrosshairMove((param) => {
        // Guard: If chart was disposed by React during movement, exit
        if (!chartRef.current) return;

        if (param.time) {
            const data = param.seriesData.get(candleSeries);
            if (data) updateLegend(data);

            const trade = tradeLookup[param.time];
            if (trade) {
                let points = [];
                if (trade.exitMatch) {
                    points = [
                        { time: trade.time, value: trade.price },
                        { time: trade.exitMatch.time, value: trade.exitMatch.price }
                    ];
                } else if (trade.entryMatch) {
                    points = [
                        { time: trade.entryMatch.time, value: trade.entryMatch.price },
                        { time: trade.time, value: trade.price }
                    ];
                }
                
                if (points.length === 2) {
                    points.sort((a,b) => a.time - b.time);
                    tradeLineSeries.setData(points);
                } else {
                    tradeLineSeries.setData([]);
                }
            } else {
                tradeLineSeries.setData([]);
            }
        } else {
            if (lastCandle) updateLegend(lastCandle);
            tradeLineSeries.setData([]);
        }
    });

    // 7. Scroll Viewport to START
    requestAnimationFrame(() => {
        if (chartRef.current) {
            chart.timeScale().setVisibleLogicalRange({ from: 0, to: 150 });
        }
    });

    // 8. Resize Listener (Defensive)
    const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ 
                width: chartContainerRef.current.clientWidth 
            });
        }
    };
    window.addEventListener('resize', handleResize);

    // 9. Final Cleanup
    return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
            try {
                chartRef.current.remove();
            } catch (err) {
                // Silently handle if library already disposed of it
            }
            chartRef.current = null;
        }
    };
}, [candles, markers, tradeLookup]);
