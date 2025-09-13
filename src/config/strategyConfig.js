export const strategies = {
  SMA: {
    name: 'Simple Moving Average (SMA) Crossover',
    description: 'A trend-following strategy that generates a buy signal when a short-term moving average crosses above a long-term one.',
    params: [
      { id: 'fast', label: 'Fast Period', type: 'number', defaultValue: 10, tooltip: 'The lookback period for the shorter, more reactive moving average.' },
      { id: 'slow', label: 'Slow Period', type: 'number', defaultValue: 20, tooltip: 'The lookback period for the longer, smoother moving average.' },
    ]
  },
  RSI: {
    name: 'Relative Strength Index (RSI)',
    description: 'A momentum strategy that buys when an asset is "oversold" and sells when it is "overbought".',
    params: [
      { id: 'period', label: 'RSI Period', type: 'number', defaultValue: 14, tooltip: 'The lookback period for calculating RSI. 14 is standard.' },
      { id: 'oversold', label: 'Oversold Threshold', type: 'number', defaultValue: 30, tooltip: 'The RSI level below which the asset is considered a potential buy. Usually 30.' },
      { id: 'overbought', label: 'Overbought Threshold', type: 'number', defaultValue: 70, tooltip: 'The RSI level above which the asset is considered a potential sell. Usually 70.' },
    ]
  },
  MACD: {
    name: 'Moving Average Convergence Divergence (MACD)',
    description: 'A trend-following momentum indicator that shows the relationship between two moving averages of a security’s price.',
    params: [
      { id: 'fast', label: 'Fast EMA Period', type: 'number', defaultValue: 12, tooltip: 'The period for the shorter-term Exponential Moving Average.' },
      { id: 'slow', label: 'Slow EMA Period', type: 'number', defaultValue: 26, tooltip: 'The period for the longer-term Exponential Moving Average.' },
      { id: 'signal', label: 'Signal Line Period', type: 'number', defaultValue: 9, tooltip: 'The period for the EMA of the MACD line itself.' },
    ]
  },
  BBANDS: {
    name: 'Bollinger Bands® Mean Reversion',
    description: 'A volatility-based strategy that buys when the price touches the lower band and sells when it touches the upper band, assuming it will revert to the mean.',
    params: [
      { id: 'period', label: 'Moving Average Period', type: 'number', defaultValue: 20, tooltip: 'The lookback period for the central moving average. 20 is standard.' },
      { id: 'stdDev', label: 'Standard Deviations', type: 'number', defaultValue: 2, tooltip: 'The number of standard deviations to place the upper and lower bands. 2 is standard.' },
    ]
  },
  STOCH: {
    name: 'Stochastic Oscillator',
    description: 'A momentum indicator comparing a particular closing price of a security to a range of its prices over a certain period of time to identify overbought and oversold signals.',
    params: [
        { id: 'kPeriod', label: '%K Period', type: 'number', defaultValue: 14, tooltip: 'The lookback period for the stochastic calculation.' },
        { id: 'dPeriod', label: '%D Period (Smoothing)', type: 'number', defaultValue: 3, tooltip: 'The smoothing period for the %K line, creating the %D line.' },
        { id: 'oversold', label: 'Oversold Threshold', type: 'number', defaultValue: 20, tooltip: 'The level below which the asset is considered a potential buy. Usually 20.' },
        { id: 'overbought', label: 'Overbought Threshold', type: 'number', defaultValue: 80, tooltip: 'The level above which the asset is considered a potential sell. Usually 80.' },
    ]
  },
};
