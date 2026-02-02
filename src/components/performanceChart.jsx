import React, { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType } from "lightweight-charts";

export function PerformanceChart({ results }) {
    const chartContainerRef = useRef(null);

    const data = useMemo(() => {
        if (!results?.equityCurve || !results?.candleData) return { strategy: [], buyHold: [] };
        
        const initialPrice = parseFloat(results.candleData[0].open);
        const initialBalance = results.initialBalance || 1000;

        const strategy = results.equityCurve.map(pt => ({
            time: Number(pt.time),
            value: parseFloat(pt.value || pt.balance)
        })).sort((a, b) => a.time - b.time);

        const buyHold = results.candleData.map(c => ({
            time: Number(c.time),
            value: initialBalance * (parseFloat(c.close) / initialPrice)
        })).sort((a, b) => a.time - b.time);

        return { strategy, buyHold };
    }, [results]);

    useEffect(() => {
        if (!chartContainerRef.current || data.strategy.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
            grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
        });

        const strategyLine = chart.addLineSeries({ color: "#fbbf24", lineWidth: 3, title: "Strategy" });
        const bhLine = chart.addLineSeries({ color: "#4b5563", lineWidth: 2, lineStyle: 2, title: "Buy & Hold" });

        strategyLine.setData(data.strategy);
        bhLine.setData(data.buyHold);

        chart.timeScale().fitContent();
        return () => chart.remove();
    }, [data]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
