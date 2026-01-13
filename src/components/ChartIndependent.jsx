// 🟢 NEW: DRAW VISUAL TRADE LINES
if (results?.tradeLines) {
    results.tradeLines.forEach(line => {
        const lineSeries = chart.addLineSeries({
            color: line.color,
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            lineType: 0,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        // This creates a segment between Entry and Exit
        lineSeries.setData([
            { time: line.from.time, value: line.from.price },
            { time: line.to.time, value: line.to.price }
        ]);
    });
}
