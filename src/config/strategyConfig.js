// File: src/config/strategyConfig.js

// This file is the single source of truth for all strategy information.
// It makes the UI dynamic and easy to update.
export const strategies = {
  SMA: {
    name: 'Simple Moving Average (SMA) Crossover',
    description: 'A classic strategy that generates a buy signal when a short-term moving average crosses above a long-term one, and a sell signal on the reverse.',
    params: [
      { id: 'fast', label: 'Fast Period', type: 'number', defaultValue: 10, tooltip: 'The lookback period for the shorter, more reactive moving average. Common values are 10, 12, or 20.' },
      { id: 'slow', label: 'Slow Period', type: 'number', defaultValue: 20, tooltip: 'The lookback period for the longer, smoother moving average. Common values are 20, 50, or 100.' },
    ]
  },
  RSI: {
    name: 'Relative Strength Index (RSI)',
    description: 'A momentum oscillator that measures the speed and change of price movements. It generates a buy signal when the asset is "oversold" and a sell signal when it is "overbought".',
    params: [
      { id: 'period', label: 'RSI Period', type: 'number', defaultValue: 14, tooltip: 'The lookback period for calculating RSI. 14 is the most common value.' },
      { id: 'oversold', label: 'Oversold Threshold', type: 'number', defaultValue: 30, tooltip: 'The RSI level below which the asset is considered oversold (a potential buy signal). Usually 30.' },
      { id: 'overbought', label: 'Overbought Threshold', type: 'number', defaultValue: 70, tooltip: 'The RSI level above which the asset is considered overbought (a potential sell signal). Usually 70.' },
    ]
  },
  // You can easily add more strategies here in the future
};
