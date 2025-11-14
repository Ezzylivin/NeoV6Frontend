// src/config/strategyConfig.js

/**
 * This file centralizes all static strategy definitions.
 * - title: Display name
 * - whatItIs: Guide text
 * - howItWorks: Guide text
 * - combineWith: Guide text
 * - defaultParams: The parameters for a new strategy, now using
 * robust, adaptive exits (tslAtrMult) instead of fixed SL/TP.
 */
export const strategyDefinitions = {
    "Moving Average Crossover": {
        title: "SMA Crossover",
        whatItIs: "A trend-following strategy using a fast and slow moving average.",
        howItWorks: "Buy when the fast MA crosses above the slow MA (a 'golden cross'). Sell when it crosses below (a 'death cross').",
        combineWith: "Combine with ATR for volatility-based stops or RSI to avoid entries in choppy markets.",
        defaultParams: { strategyType: "Moving Average Crossover", shortPeriod: 10, longPeriod: 50, tslAtrMult: 3.5 }
    },
    "RSI": {
        title: "RSI (Relative Strength Index)",
        whatItIs: "A momentum oscillator indicating overbought (>70) or oversold (<30) conditions.",
        howItWorks: "Buy when RSI crosses up from below 30. Sell when it crosses down from above 70.",
        combineWith: "Best used in range-bound markets. Combine with SMAs to confirm the overall trend.",
        defaultParams: { strategyType: "RSI", rsiPeriod: 14, overbought: 70, oversold: 30, tslAtrMult: 2.5 }
    },
    "MACD": {
        title: "MACD",
        whatItIs: "Shows trend direction and momentum using two moving averages and a signal line.",
        howItWorks: "Buy when the MACD line crosses above its Signal line. Sell when it crosses below.",
        combineWith: "Combine with ATR or Bollinger Bands to filter out weak signals.",
        defaultParams: { strategyType: "MACD", fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, tslAtrMult: 3.0 }
    },
    "Bollinger Bands": {
        title: "Bollinger Bands",
        whatItIs: "Bollinger Bands use a moving average plus two standard deviations to form upper and lower bands.",
        howItWorks: "A common mean-reversion strategy is to buy when the price touches the lower band and sell when it touches the upper band.",
        combineWith: "Combine with RSI or a Stochastic Oscillator to confirm overbought/oversold conditions.",
        defaultParams: { strategyType: "Bollinger Bands", period: 20, stdDev: 2, tslAtrMult: 2.0 }
    },
    "Stochastic Oscillator": {
        title: "Stochastic Oscillator",
        whatItIs: "A momentum indicator comparing a closing price to its high-low range over a period.",
        howItWorks: "Buy when the %K line crosses above the %D line in the oversold area (<20). Sell when %K crosses below %D in the overbought area (>80).",
        combineWith: "Use with MACD to filter out false signals in strongly trending markets.",
        defaultParams: { strategyType: "Stochastic Oscillator", period: 14, signalPeriod: 3, overbought: 80, oversold: 20, tslAtrMult: 2.5 }
    },
    "Parabolic SAR": {
        title: "Parabolic SAR",
        whatItIs: "Places dots on the chart that trail the price, indicating trend direction.",
        howItWorks: "Buy when the dots flip from being above the price to below it. Sell when they flip from below to above.",
        combineWith: "Excellent for trend-following. Use a long-period SMA to confirm the overall trend direction.",
        defaultParams: { strategyType: "Parabolic SAR", step: 0.02, max: 0.2, tslAtrMult: 4.0 }
    },
    "On-Balance Volume": {
        title: "On-Balance Volume (OBV)",
        whatItIs: "Tracks cumulative buying and selling pressure by adding or subtracting volume based on price moves.",
        howItWorks: "A rising OBV confirms a price uptrend. Look for divergences between OBV and price to anticipate potential reversals.",
        combineWith: "Use with an SMA on the OBV line itself; trade crossovers of the OBV and its own moving average.",
        defaultParams: { strategyType: "On-Balance Volume", obvPeriod: 20, tslAtrMult: 3.0 }
    },
    "CCI": {
        title: "CCI (Commodity Channel Index)",
        whatItIs: "A momentum oscillator used to identify cyclical trends.",
        howItWorks: "Buy signals can be generated when CCI rises above -100 from oversold conditions. Sell signals when CCI falls below +100 from overbought.",
        combineWith: "Use with trend indicators like SMAs to trade only in the direction of the larger trend.",
        defaultParams: { strategyType: "CCI", cciPeriod: 20, overbought: 100, oversold: -100, tslAtrMult: 2.5 }
    },
    "ATR": {
        title: "ATR (Average True Range)",
        whatItIs: "ATR measures market volatility. It does not indicate price direction.",
        howItWorks: "A breakout strategy can be used: buy when the price closes above the previous close + (ATR * multiplier).",
        combineWith: "Best used as a tool for setting stop-loss levels or position sizing for other strategies.",
        defaultParams: { strategyType: "ATR", atrPeriod: 14, atrMultiplier: 2.0, tslAtrMult: 3.0 }
    },
    "Ichimoku Cloud": {
        title: "Ichimoku Cloud",
        whatItIs: "A comprehensive, all-in-one indicator showing trend, momentum, and support/resistance.",
        howItWorks: "A common bullish signal is when the price is above the cloud, and the conversion line crosses above the base line.",
        combineWith: "It's a complete system, but can be paired with RSI to confirm entries.",
        defaultParams: { strategyType: "Ichimoku Cloud", conversionPeriod: 9, basePeriod: 26, spanPeriod: 52, displacement: 26, tslAtrMult: 5.0 }
    }
};

// Also export the initial state for the form
export const initialStrategyParams = strategyDefinitions["Moving Average Crossover"].defaultParams;
