# File: /root/Project/ML/ml_server_api.py
#
# UPGRADES:
# - 🚀 [FIX 1] Added 'ml_mode' and 'kwargs' to run_backtest definition to fix crash.
# - 🚀 [FIX 2] Re-hydrated the final response to match the Mongoose schema.
# - 🚀 [FIX 3] Fixed KeyError by changing metric filter from .startswith('sell') to == 'sell'.

import os
import json
import pandas as pd
import numpy as np
import pandas_ta as ta
import joblib
import logging
import typing
import math
from datetime import datetime, timezone
import time
import ccxt
import sys # 🚀 Added sys import
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import warnings

# --- 🚀 New Imports (Required for new models/metrics) ---
import lightgbm as lgb
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
# --- End New Imports ---

# Suppress warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=FutureWarning)
pd.options.mode.chained_assignment = None

# --- Configuration ---
MODEL_DIR = '/root/Project/ML/app/models'
DATA_DIR = '/root/Project/ML/data'
LOG_LEVEL = logging.INFO
EXCHANGES_TO_TRY = ['binanceus', 'coinbase', 'kraken', 'gemini'] 
SLIPPAGE_PCT = 0.0005  # 🚀 0.05% slippage (adjust as needed)
RISK_FREE_RATE = 0.02 # 🚀 2% annual risk-free rate for Sharpe

# --- Setup Logging ---
logging.basicConfig(level=LOG_LEVEL, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(__name__)
CORS(app)

# --- (Data Download & Save functions are identical to train_models.py) ---
def fetch_all_historical_data(symbol, timeframe, start_date='2017-01-01'):
    try: since_timestamp = int(datetime.strptime(start_date, '%Y-%m-%d').replace(tzinfo=timezone.utc).timestamp() * 1000)
    except ValueError: logging.error(f"Invalid start_date: {start_date}. Using 2017-01-01."); since_timestamp = int(datetime(2017, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
    best_data = []; best_exchange_id = None
    for exchange_id in EXCHANGES_TO_TRY:
        logging.info(f"[{exchange_id}] Checking download for {symbol} ({timeframe})...")
        exchange = None; all_candles = []; current_since = since_timestamp
        try:
            exchange = getattr(ccxt, exchange_id)();
            if not exchange.has['fetchOHLCV']: logging.warning(f"[{exchange_id}] skip: no fetchOHLCV."); continue
            if timeframe not in exchange.timeframes: logging.warning(f"[{exchange_id}] skip: TF '{timeframe}' not supported."); continue
            limit = 1000; timeframe_ms = exchange.parse_timeframe(timeframe) * 1000
            while True:
                current_time_ms = exchange.milliseconds()
                if current_since >= current_time_ms: logging.info(f"[{exchange_id}] Reached current time."); break
                new_candles = exchange.fetchOHLCV(symbol, timeframe, since=current_since, limit=limit)
                if new_candles:
                    if exchange_id == 'kraken' and len(new_candles) < limit and (current_time_ms - new_candles[-1][0]) > (timeframe_ms * limit):
                        logging.warning(f"[{exchange_id}] Returned only {len(new_candles)} candles (Kraken bug). Trying next exchange."); all_candles = []; break 
                    all_candles.extend(new_candles); new_since_timestamp = new_candles[-1][0] + timeframe_ms
                    if new_since_timestamp <= current_since: logging.warning("Timestamp stalled. Stop."); break
                    current_since = new_since_timestamp;
                    time.sleep(exchange.rateLimit / 1000)
                else: logging.info(f"[{exchange_id}] No more candles returned."); break
        except Exception as e: logging.warning(f"[{exchange_id}] Download attempt failed: {e}"); continue
        if all_candles:
            if len(all_candles) > len(best_data):
                logging.info(f"[{exchange_id}] Found NEW BEST data: {len(all_candles)} candles (previous best: {len(best_data)}).")
                best_data = all_candles; best_exchange_id = exchange_id
            else: logging.info(f"[{exchange_id}] Found {len(all_candles)} candles, but not better than {len(best_data)} from {best_exchange_id}.")
    if best_data:
        logging.info(f"--- Selected BEST data from [{best_exchange_id}] with {len(best_data)} candles ---")
        df = pd.DataFrame(best_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df.drop_duplicates(subset=['timestamp'], inplace=True); df.sort_values(by='timestamp', inplace=True)
        logging.info(f"Total unique candles after de-dupe: {len(df)}"); return df.values.tolist()
    logging.error(f"Failed to fetch {symbol} {timeframe} from ALL exchanges: {EXCHANGES_TO_TRY}"); return []
def save_data_to_csv(candles, output_path):
    if not candles: logging.warning(f"No candles to save {output_path}"); return False
    try:
        df = pd.DataFrame(candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume']); df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms', utc=True); df.set_index('datetime', inplace=True)
        os.makedirs(os.path.dirname(output_path), exist_ok=True); df.to_csv(output_path)
        logging.info(f"Data saved: {output_path}"); return True
    except Exception as e: logging.error(f"CSV Save Fail {output_path}: {e}"); return False

# --- Helpers ---
def convert_numpy_types(obj):
    if isinstance(obj, (np.floating, np.float64)): return float(obj)
    if isinstance(obj, (np.integer, np.int64)): return int(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, (pd.Timestamp, datetime)): return obj.isoformat()
    return obj
def find_col(df, key, exclude=None):
    key = key.upper(); exclude = exclude.upper() if exclude else ''
    for col in df.columns:
        col_upper = col.upper()
        if key in col_upper and not (exclude and exclude in col_upper): return col
    raise KeyError(f"API: Could not find required col for key: {key} in columns: {df.columns.tolist()}")

# --- 🚀 NEW: TA Signal Generation (for 'off' and 'predictions' modes) ---
def generate_ta_signals(df: pd.DataFrame, strategy_code: str) -> pd.DataFrame:
    """ Generates a 'ta_signal' column based on the strategy code. """
    logging.info(f"Generating TA signal for: {strategy_code}")
    # (This function needs all the find_col helpers from engineer_features)
    rsi_col=find_col(df,'RSI_14'); macd_col=find_col(df,'MACD_12_26_9','MACDS'); macd_signal_col=find_col(df,'MACDS_12_26_9')
    stoch_k_col=find_col(df,'STOCHK_14_3_3'); stoch_d_col=find_col(df,'STOCHD_14_3_3'); cci_col=find_col(df,'CCI_20_0.015')
    bbl_col=find_col(df,'BBL_20_2.0'); bbu_col=find_col(df,'BBU_20_2.0'); atr_col=find_col(df,'ATR_14')
    sma10_col=find_col(df,'SMA_10'); sma50_col=find_col(df,'SMA_50'); psar_col=find_col(df,'PSARr')
    tenkan_col=find_col(df,'ITS_9'); kijun_col=find_col(df,'IKS_26'); spanA_col=find_col(df,'ISA_9'); spanB_col=find_col(df,'ISB_26')

    # 1. Crossover Signals
    df['sma_signal'] = np.sign(df[sma10_col].diff()) # Simple 10-period slope
    df['macd_signal'] = np.sign(df[macd_col] - df[macd_signal_col]).diff()
    df['stoch_signal'] = np.sign(df[stoch_k_col] - df[stoch_d_col]).diff()

    # 2. Reversal Signals
    df['rsi_signal'] = np.select([df[rsi_col] < 30, df[rsi_col] > 70], [1, -1], 0)
    df['cci_signal'] = np.select([df[cci_col] < -100, df[cci_col] > 100], [1, -1], 0)
    df['bb_signal'] = np.select([df['close'] < df[bbl_col], df['close'] > df[bbu_col]], [1, -1], 0)
    
    # 3. Trend Signal
    df['ichimoku_signal'] = np.select([(df['close'] > df[spanA_col]) & (df['close'] > df[spanB_col]), (df['close'] < df[spanA_col]) & (df['close'] < df[spanB_col])], [1, -1], 0)
    
    # 🚀 --- NEW SIGNALS --- 🚀
    df['atr_signal'] = np.sign(df[atr_col].diff()) # 1 = volatility increasing
    df['obv_signal'] = np.sign(df['OBV'].diff()) # 1 = volume momentum increasing
    df['psar_signal'] = df[psar_col] # 1 = bullish, -1 = bearish
    
    # 4. Map strategy_code to the correct column
    signal_map = {
        "sma_crossover": "sma_signal",
        "rsi_divergence": "rsi_signal",
        "macd_crossover": "macd_signal",
        "stochastic_crossover": "stoch_signal",
        "cci_oversold": "cci_signal",
        "bollinger_bands": "bb_signal",
        "ichimoku_cloud": "ichimoku_signal",
        # 🚀 --- NEW MAPPINGS --- 🚀
        "atr_signal": "atr_signal",
        "obv_signal": "obv_signal",
        "psar_signal": "psar_signal"
    }
    
    if strategy_code in signal_map:
        df['ta_signal'] = df[signal_map[strategy_code]].fillna(0)
    else:
        logging.warning(f"Strategy code '{strategy_code}' not found. Defaulting to 'Hold' (0).")
        df['ta_signal'] = 0
        
    return df

# --- 🚀 SYNCHRONIZED: Feature Engineering (Must match train_models.py) ---
def generate_all_features(df: pd.DataFrame, trend_filter_period: typing.Optional[int]) -> pd.DataFrame:
    """ Applies ALL 38+ advanced TA features for ML model prediction. """
    logging.info(f"Engineering all advanced features for {len(df)} rows...")
    df = df.copy()
    if df['close'].isnull().any(): df['close'] = df['close'].fillna(method='ffill')
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # === 1. Base Technical Indicators ===
    df.ta.rsi(length=14, append=True); df.ta.macd(fast=12, slow=26, signal=9, append=True); df.ta.stoch(k=14, d=3, append=True)
    df.ta.cci(length=20, append=True); df.ta.bbands(length=20, std=2, append=True); df.ta.atr(length=14, append=True, col_names=('ATR_14'))
    df.ta.sma(length=10, append=True); df.ta.sma(length=50, append=True); df.ta.sma(length=200, append=True)
    df.ta.psar(append=True); df.ta.ichimoku(conversion=9, base=26, span=52, append=True)
    df.ta.obv(append=True); df['OBV_SMA_20'] = df['OBV'].rolling(window=20).mean()
    df.ta.adx(length=14, append=True)
    if trend_filter_period and trend_filter_period > 0:
        sma_trend_col = f'SMA_{trend_filter_period}'; df.ta.sma(length=trend_filter_period, append=True, col_names=(sma_trend_col))

    # === 2. Get Column Names (Error if missing) ===
    rsi_col=find_col(df,'RSI_14'); macd_col=find_col(df,'MACD_12_26_9','MACDS'); macd_signal_col=find_col(df,'MACDS_12_26_9')
    stoch_k_col=find_col(df,'STOCHK_14_3_3'); stoch_d_col=find_col(df,'STOCHD_14_3_3'); cci_col=find_col(df,'CCI_20_0.015')
    bbl_col=find_col(df,'BBL_20_2.0'); bbu_col=find_col(df,'BBU_20_2.0'); bbm_col=find_col(df, 'BBM_20_2.0'); atr_col=find_col(df,'ATR_14')
    sma10_col=find_col(df,'SMA_10'); sma50_col=find_col(df,'SMA_50'); sma200_col=find_col(df, 'SMA_200')
    psar_col=find_col(df,'PSARr'); adx_col = find_col(df, 'ADX_14')
    
    # === 3. New Relational & Contextual Features ===
    df['price_vs_sma50'] = (df['close'] - df[sma50_col]) / df[sma50_col]
    df['price_vs_sma200'] = (df['close'] - df[sma200_col]) / df[sma200_col]
    df['sma10_vs_sma50'] = (df[sma10_col] - df[sma50_col]) / df[sma50_col]
    df['sma50_vs_sma200'] = (df[sma50_col] - df[sma200_col]) / df[sma200_col]
    df['price_vs_bbu'] = (df[bbu_col] - df['close']) / df['close']
    df['price_vs_bbl'] = (df[bbl_col] - df['close']) / df['close']
    df['bb_width'] = (df[bbu_col] - df[bbl_col]) / df[bbm_col]
    df['rsi_state'] = np.select([df[rsi_col] > 70, df[rsi_col] < 30], [1, -1], 0)
    df['macd_hist_norm'] = (df[macd_col] - df[macd_signal_col]) / df['close']
    df['stoch_cross'] = np.sign(df[stoch_k_col] - df[stoch_d_col]).diff()
    df['cci_state'] = np.select([df[cci_col] > 100, df[cci_col] < -100], [1, -1], 0)
    df['atr_pct'] = (df[atr_col] / df['close']) * 100
    df['adx_strong_trend'] = (df[adx_col] > 25).astype(int)
    df['rsi_roc_3'] = df[rsi_col].pct_change(3)
    df['volume_roc_10'] = df['volume'].pct_change(10)
    df['price_roc_5'] = df['close'].pct_change(5)
    
    # === 4. Create NON-Leaky Lag Features ===
    lag_features_to_create = [
        'rsi_state', 'atr_pct', 'price_vs_sma200', 'macd_hist_norm', 'volume_roc_10',
        'price_roc_5', 'bb_width', 'adx_strong_trend'
    ]
    for feat in lag_features_to_create:
        if feat in df.columns:
            for lag in [1, 2, 3]:
                df[f"{feat}_lag{lag}"] = df[feat].shift(lag)
    
    return df
# --- End Feature Engineering ---

# --- 🚀 UPGRADED: Backtest Engine ---
def run_backtest(
    df: pd.DataFrame,
    signal_column: str, # 🚀 Generic signal column ('ta_signal', 'hybrid_signal', etc.)
    initial_balance: float,
    fee: float,
    stop_loss_pct: typing.Optional[float],
    take_profit_pct: typing.Optional[float],
    risk_mode: str,
    risk_percent: float,
    growth_target: typing.Optional[float],
    min_atr_pct: typing.Optional[float],
    trend_filter_period: typing.Optional[int],
    ml_mode: str, # 🚀 [FIX 1] Added ml_mode to accept the argument
    max_leverage: float = 2.0, # 🚀 New safety cap
    **kwargs # 🚀 [FIX 1] Added kwargs to accept any other arguments
) -> typing.Dict[str, typing.Any]:
    
    # 🚀 Log the ml_mode that is now correctly passed in
    logging.info(f"Starting simulation (mlMode='{ml_mode}'). Risk: {risk_mode}, SL: {stop_loss_pct}%, TP: {take_profit_pct}%")

    # --- 1. Prep ---
    if signal_column not in df.columns: raise ValueError(f"Signal column '{signal_column}' not found.")
    if 'ATR_14' not in df.columns and min_atr_pct > 0: raise ValueError("ATR_14 column required for Volatility Filter.")
    sma_trend_col = f'SMA_{trend_filter_period}' if trend_filter_period else None
    if sma_trend_col and sma_trend_col not in df.columns: logging.warning(f"Trend Filter column '{sma_trend_col}' not found.") # Changed to warning

    balance = initial_balance
    position = 0 # 0 = flat, 1 = long, -1 = short
    position_size = 0.0
    entry_price = 0.0
    equity_curve = []
    trades = []
    stop_loss_price = 0.0
    take_profit_price = 0.0
    current_risk_percent = risk_percent
    
    df_signals = df[signal_column].to_numpy()
    df_low = df["low"].to_numpy()
    df_high = df["high"].to_numpy()
    df_close = df["close"].to_numpy()
    df_open = df["open"].to_numpy()
    df_atr = df["ATR_14"].to_numpy() if 'ATR_14' in df.columns else np.zeros(len(df))
    df_trend_sma = df[sma_trend_col].to_numpy() if sma_trend_col else np.zeros(len(df))

    # --- 2. Main Trading Loop ---
    for i in range(1, len(df) - 1): # Loop from 1 to second-to-last
        
        # --- A. Check for Exits (if in a position) ---
        if position != 0:
            current_low = df_low[i]; current_high = df_high[i]; current_close = df_close[i]
            exit_price = 0.0; pnl_reason = "Signal"
            
            # 🚀 Pessimistic SL/TP logic
            if position == 1: # --- In a LONG position ---
                sl_hit = stop_loss_pct is not None and current_low <= stop_loss_price
                tp_hit = take_profit_pct is not None and current_high >= take_profit_price
                signal_exit = (df_signals[i] == -1)

                if sl_hit and tp_hit: # Both hit on same bar
                    exit_price = stop_loss_price; pnl_reason = "Stop Loss (Pessimistic)"
                elif sl_hit:
                    exit_price = stop_loss_price; pnl_reason = "Stop Loss"
                elif tp_hit:
                    exit_price = take_profit_price; pnl_reason = "Take Profit"
                elif signal_exit:
                    exit_price = df_open[i+1] * (1 - SLIPPAGE_PCT); pnl_reason = "Signal" # Exit on next open
            
            elif position == -1: # --- In a SHORT position ---
                sl_hit = stop_loss_pct is not None and current_high >= stop_loss_price
                tp_hit = take_profit_pct is not None and current_low <= take_profit_price
                signal_exit = (df_signals[i] == 1)

                if sl_hit and tp_hit:
                    exit_price = stop_loss_price; pnl_reason = "Stop Loss (Pessimistic)"
                elif sl_hit:
                    exit_price = stop_loss_price; pnl_reason = "Stop Loss"
                elif tp_hit:
                    exit_price = take_profit_price; pnl_reason = "Take Profit"
                elif signal_exit:
                    exit_price = df_open[i+1] * (1 + SLIPPAGE_PCT); pnl_reason = "Signal" # Cover on next open

            # --- Execute Exit ---
            if exit_price > 0:
                if position == 1: # Selling to close long
                    sell_value = position_size * exit_price; buy_value = position_size * entry_price
                    net_sell_value = sell_value * (1 - fee); profit_usd = net_sell_value - buy_value
                    balance += net_sell_value # Add proceeds to balance
                elif position == -1: # Buying to cover short
                    buy_value = position_size * exit_price; sell_value = position_size * entry_price
                    net_buy_value = buy_value * (1 + fee); profit_usd = sell_value - net_buy_value
                    balance += (sell_value + profit_usd) # Return collateral + profit
                
                pnl_pct = (profit_usd / (position_size * entry_price)) * 100 if (position_size * entry_price) != 0 else 0
                trades.append({"action": "sell" if position == 1 else "cover", "price": exit_price, "time": df.index[i], "size": position_size, "pnl_pct": pnl_pct, "profit_usd": profit_usd, "reason": pnl_reason})
                position = 0; position_size = 0.0; entry_price = 0.0; stop_loss_price = 0.0; take_profit_price = 0.0
                if risk_mode == 'dynamic' and growth_target is not None and balance >= growth_target:
                    current_risk_percent = risk_percent

        # --- B. Check for Entries (if flat) ---
        if position == 0 and balance > 0:
            signal = df_signals[i] # Current bar's signal
            
            # --- Apply Filters ---
            passes_vol_filter = True
            if min_atr_pct is not None and min_atr_pct > 0:
                atr_percentage = (df_atr[i] / df_close[i]) * 100 if df_close[i] > 0 else 0
                if atr_percentage < min_atr_pct: passes_vol_filter = False
            
            passes_trend_filter = True
            if sma_trend_col:
                if signal == 1 and df_close[i] < df_trend_sma[i]: passes_trend_filter = False # Long filter
                if signal == -1 and df_close[i] > df_trend_sma[i]: passes_trend_filter = False # Short filter

            # --- Calculate Position Size ---
            if (signal == 1 or signal == -1) and passes_vol_filter and passes_trend_filter:
                trade_price = df_open[i+1] # Enter on next open
                if trade_price == 0: continue # Skip if bad data
                
                calculated_size = 0
                if (risk_mode == 'standard' or risk_mode == 'dynamic') and stop_loss_pct is not None and stop_loss_pct > 0:
                    risk_amount_usd = balance * (current_risk_percent / 100.0)
                    sl_distance_usd = trade_price * (stop_loss_pct / 100.0)
                    calculated_size = risk_amount_usd / sl_distance_usd if sl_distance_usd > 0 else 0
                else:
                    calculated_size = (balance * (current_risk_percent / 100.0)) / trade_price
                
                # 🚀 Apply leverage cap
                max_size_by_leverage = (balance * max_leverage) / trade_price
                position_size = min(calculated_size, max_size_by_leverage)
                
                if position_size * trade_price > balance: # Final safety check
                    position_size = balance / trade_price
                
                if position_size <= 1e-9: continue # Size too small
                
                # --- Execute Entry ---
                if signal == 1: # --- Enter LONG ---
                    position = 1
                    entry_price = trade_price * (1 + SLIPPAGE_PCT) # 🚀 Add slippage
                    balance -= position_size * entry_price
                    if stop_loss_pct: stop_loss_price = entry_price * (1 - stop_loss_pct / 100.0)
                    if take_profit_pct: take_profit_price = entry_price * (1 + take_profit_pct / 100.0)
                    trades.append({"action": "buy", "price": entry_price, "time": df.index[i+1], "size": position_size})
                
                elif signal == -1: # --- Enter SHORT ---
                    position = -1
                    entry_price = trade_price * (1 - SLIPPAGE_PCT) # 🚀 Add slippage
                    # For shorting, we add collateral (entry value) to balance, as if we borrowed
                    # We are tracking "equity", so balance = equity - (position * price)
                    balance += position_size * entry_price
                    if stop_loss_pct: stop_loss_price = entry_price * (1 + stop_loss_pct / 100.0)
                    if take_profit_pct: take_profit_price = entry_price * (1 - take_profit_pct / 100.0)
                    trades.append({"action": "sell_short", "price": entry_price, "time": df.index[i+1], "size": position_size})

        # --- C. Update Equity Curve (End of day) ---
        equity = balance
        if position == 1:
            equity += (position_size * df_close[i])
        elif position == -1:
            equity -= (position_size * df_close[i]) # Subtract liability
            
        equity_curve.append({"timestamp": df.index[i], "balance": equity})

    # --- 5. Calculate Final Metrics ---
    final_balance = equity_curve[-1]['balance'] if equity_curve else initial_balance
    total_return = (final_balance / initial_balance - 1) * 100
    
    equity_series = pd.Series([e['balance'] for e in equity_curve])
    daily_returns = equity_series.pct_change().fillna(0)
    
    # 🚀 New Metrics
    peak = equity_series.cummax()
    drawdown = (equity_series - peak) / peak
    max_drawdown = abs(drawdown.min() * 100) if not drawdown.empty else 0
    
    # Sharpe Ratio (assuming daily returns)
    trading_days = len(equity_series)
    annualization_factor = 365 / (trading_days / (equity_series.count() or 1)) # Adjust for data length
    
    mean_daily_return = daily_returns.mean()
    std_daily_return = daily_returns.std()
    
    sharpe_ratio = (mean_daily_return * annualization_factor - RISK_FREE_RATE) / (std_daily_return * np.sqrt(annualization_factor)) if std_daily_return > 0 else 0
    
    # Sortino Ratio
    downside_returns = daily_returns[daily_returns < 0]
    downside_std = downside_returns.std()
    sortino_ratio = (mean_daily_return * annualization_factor - RISK_FREE_RATE) / (downside_std * np.sqrt(annualization_factor)) if downside_std > 0 else 0
    
    # Calmar Ratio
    calmar_ratio = (total_return / 100) / (max_drawdown / 100) if max_drawdown > 0 else 0

    # 🚀 [FIX 3] This line is now correct. It uses `== 'sell'` instead of `.startswith('sell')`
    sell_trades = [t for t in trades if t['action'] == 'sell' or t['action'] == 'cover']; total_trades = len(sell_trades)
    if total_trades > 0:
        all_pnl=[t['profit_usd'] for t in sell_trades]; win_pnl=[p for p in all_pnl if p>0]; lose_pnl=[p for p in all_pnl if p<=0]
        win_rate=(len(win_pnl)/total_trades)*100; gross_profit=sum(win_pnl); gross_loss=abs(sum(lose_pnl))
        profit_factor=gross_profit/gross_loss if gross_loss>0 else float('inf'); avg_win=sum(win_pnl)/len(win_pnl) if win_pnl else 0
        avg_loss=abs(sum(lose_pnl))/len(lose_pnl) if lose_pnl else 0; win_count=len(win_pnl); lose_count=len(lose_pnl)
    else: win_rate=0.0; profit_factor=0.0; avg_win=0.0; avg_loss=0.0; win_count=0; lose_count=0
    
    logging.info("Simulation complete. Formatting results.")
    return {
        "metrics": {
            "totalReturn": total_return, "profitFactor": profit_factor, "maxDrawdown": max_drawdown, 
            "winRate": win_rate, "totalTrades": total_trades, "averageWin": avg_win, "averageLoss": avg_loss, 
            "finalBalance": final_balance, "winningTrades": win_count, "losingTrades": lose_count,
            "sharpeRatio": sharpe_ratio, "sortinoRatio": sortino_ratio, "calmarRatio": calmar_ratio
        },
        "equityCurve": equity_curve, "trades": trades
    }
# --- End Backtest Engine ---

# --- 🚀 NEW: Main API Endpoint (Handles ALL modes) ---
@app.route('/api/ml/run-backtest-on', methods=['POST'])
def handle_run_backtest_on():
    """ Handles all backtest modes: 'on', 'off', and 'predictions'. """
    
    config = request.get_json();
    if not config: return jsonify({"error": "Invalid JSON"}), 400
    
    # --- 1. Extract Config ---
    symbol = config.get('symbol')
    timeframe = config.get('timeframe')
    start_date = config.get('startDate')
    end_date = config.get('endDate')
    ml_mode = config.get('mlMode', 'off')
    ml_model_name = config.get('mlModel')
    ml_threshold = float(config.get('mlThreshold', 0.65))
    
    # TA Config (for 'off' and 'predictions')
    ta_strategy_code = config.get('code') # e.g., 'sma_crossover'
    hybrid_mode = config.get('params', {}).get('hybridMode', 'AND')
    
    # Risk Config
    initial_balance = float(config.get('initialBalance', 1000.0))
    fee = float(config.get('fee', 0.001))
    risk_mode = config.get('riskManagementMode','standard')
    risk_percent = float(config.get('riskPercentage',1.0))
    growth_target = config.get('growthCapitalTarget')
    
    # Param/Filter Config
    params = config.get('params', {})
    sl_pct = params.get('SL'); tp_pct = params.get('TP')
    min_atr_pct = params.get('minAtrPct'); trend_period = params.get('trendFilterPeriod')

    # Convert JS 'null'/'None' to Python None
    growth_target = float(growth_target) if growth_target is not None else None
    sl_pct = float(sl_pct) if sl_pct is not None else None
    tp_pct = float(tp_pct) if tp_pct is not None else None
    min_atr_pct = float(min_atr_pct) if min_atr_pct is not None else 0.0
    trend_period = int(trend_period) if trend_period is not None else None

    logging.info(f"--- Received Backtest Request ---")
    logging.info(f"Mode: {ml_mode} | Symbol: {symbol} | Timeframe: {timeframe}")
    logging.info(f"Date Range: {start_date} to {end_date}")
    if ml_mode != 'off': logging.info(f"ML Model: {ml_model_name} | Threshold: {ml_threshold}")
    if ml_mode != 'on': logging.info(f"TA Strategy: {ta_strategy_code}")

    try:
        # --- 2. Check/Download Data ---
        safe_symbol = symbol.replace('/', '-')
        data_filename = f"{safe_symbol}-{timeframe}.csv"
        # 🚀 [FIX 2] Fixed typo, was data_.filename
        data_path = os.path.join(DATA_DIR, data_filename) 
        if not os.path.exists(data_path):
            logging.warning(f"Raw data file not found: {data_path}. Attempting download...")
            candles = fetch_all_historical_data(symbol, timeframe, '2017-01-01')
            if not candles: raise Exception(f"No candles returned from exchange for {symbol} {timeframe}")
            if not save_data_to_csv(candles, data_path): raise Exception("Failed to save downloaded data.")
        else:
            logging.info(f"Raw data file found at {data_path}")

        # --- 3. Load & Process Data ---
        df = pd.read_csv(data_path, index_col='datetime', parse_dates=True)
        if df.index.tz is None: df.index = pd.to_datetime(df.index, utc=True)
        else: df.index = df.index.tz_convert('UTC')
        df.rename(columns={'Open':'open','High':'high','Low':'low','Close':'close','Volume':'volume'}, inplace=True, errors='ignore')
        
        # --- 4. Engineer ALL Features (for ML/Hybrid/Filters) ---
        df = generate_all_features(df, trend_period)
        
        # --- 5. Generate Signals based on Mode ---
        signal_column = 'final_signal' # This will be the column we backtest
        
        if ml_mode == 'off':
            logging.info("Mode 'off': Generating TA signals only.")
            if not ta_strategy_code: raise ValueError("TA Strategy 'code' is required for 'off' mode.")
            df = generate_ta_signals(df, ta_strategy_code)
            df[signal_column] = df['ta_signal']

        elif ml_mode == 'on':
            logging.info("Mode 'on': Generating ML signals only.")
            if not ml_model_name: raise ValueError("ML Model name is required for 'on' mode.")
            # Load pipeline and get ML predictions
            pipeline = joblib.load(os.path.join(MODEL_DIR, f"{ml_model_name}.joblib"))
            model = pipeline['model']; scaler = pipeline['scaler']; feature_names = pipeline['feature_names']; class_indices = pipeline['class_indices']
            
            # Prepare features
            df_features = df[feature_names].copy().fillna(0)
            X_scaled = scaler.transform(df_features)
            
            # Get 3-class probabilities
            probabilities = model.predict_proba(X_scaled)
            df['prob_buy'] = probabilities[:, class_indices['buy']]
            df['prob_sell'] = probabilities[:, class_indices['sell']]
            df['prob_hold'] = probabilities[:, class_indices['hold']]
            
            # Apply threshold
            df['high_conf_prediction'] = 0
            df.loc[(df['prob_buy'] > ml_threshold) & (df['prob_buy'] > df['prob_sell']) & (df['prob_buy'] > df['prob_hold']), 'high_conf_prediction'] = 1
            df.loc[(df['prob_sell'] > ml_threshold) & (df['prob_sell'] > df['prob_buy']) & (df['prob_sell'] > df['prob_hold']), 'high_conf_prediction'] = -1
            
            df[signal_column] = df['high_conf_prediction']

        elif ml_mode == 'predictions': # Hybrid Mode
            logging.info(f"Mode 'predictions': Generating Hybrid signals (Logic: {hybrid_mode}).")
            if not ml_model_name: raise ValueError("ML Model name is required for 'predictions' mode.")
            if not ta_strategy_code: raise ValueError("TA Strategy 'code' is required for 'predictions' mode.")

            # a) Get TA Signal
            df = generate_ta_signals(df, ta_strategy_code)
            
            # b) Get ML Signal
            pipeline = joblib.load(os.path.join(MODEL_DIR, f"{ml_model_name}.joblib"))
            model = pipeline['model']; scaler = pipeline['scaler']; feature_names = pipeline['feature_names']; class_indices = pipeline['class_indices']
            df_features = df[feature_names].copy().fillna(0)
            X_scaled = scaler.transform(df_features)
            probabilities = model.predict_proba(X_scaled)
            df['prob_buy'] = probabilities[:, class_indices['buy']]
            df['prob_sell'] = probabilities[:, class_indices['sell']]
            df['prob_hold'] = probabilities[:, class_indices['hold']]
            
            df['high_conf_prediction'] = 0
            df.loc[(df['prob_buy'] > ml_threshold) & (df['prob_buy'] > df['prob_sell']) & (df['prob_buy'] > df['prob_hold']), 'high_conf_prediction'] = 1
            df.loc[(df['prob_sell'] > ml_threshold) & (df['prob_sell'] > df['prob_buy']) & (df['prob_sell'] > df['prob_hold']), 'high_conf_prediction'] = -1

            # c) Combine Signals
            df[signal_column] = 0 # Default to 0
            if hybrid_mode == 'AND':
                df.loc[(df['ta_signal'] == 1) & (df['high_conf_prediction'] == 1), signal_column] = 1
                df.loc[(df['ta_signal'] == -1) & (df['high_conf_prediction'] == -1), signal_column] = -1
            elif hybrid_mode == 'OR':
                df.loc[(df['ta_signal'] == 1) | (df['high_conf_prediction'] == 1), signal_column] = 1
                df.loc[(df['ta_signal'] == -1) | (df['high_conf_prediction'] == -1), signal_column] = -1
            elif hybrid_mode == 'Regime':
                # Example: TA signal (e.g., trend) acts as filter for ML
                df.loc[(df['ta_signal'] == 1) & (df['high_conf_prediction'] == 1), signal_column] = 1 # Only Buy if TA agrees
                df.loc[(df['ta_signal'] == -1) & (df['high_conf_prediction'] == -1), signal_column] = -1 # Only Sell if TA agrees
            else:
                df[signal_column] = df['high_conf_prediction'] # Default to ML only

        # --- 6. Shift Final Signal & Slice DataFrame ---
        df[signal_column] = df[signal_column].shift(1).fillna(0)
        
        # Slice *after* all features/signals are calculated
        df_final = df.loc[start_date:end_date].copy()
        df_final = df_final.fillna(0) # Fill any remaining NaNs
        
        if df_final.empty: raise ValueError("No data for date range after all processing.")
        
        # --- 7. Run Backtest ---
        results = run_backtest(
                df_final,
                signal_column=signal_column,
                initial_balance=initial_balance, fee=fee,
                stop_loss_pct=sl_pct, take_profit_pct=tp_pct,
                ml_mode=ml_mode, # 🚀 [FIX 2] Pass mode for logging
                risk_mode=risk_mode, risk_percent=risk_percent, growth_target=growth_target,
                min_atr_pct=min_atr_pct, trend_filter_period=trend_period
                # 🚀 kwargs will catch any other params from config
            )
        
        # 🚀 --- 8. [FIX 3] RE-HYDRATE THE RESPONSE --- 🚀
        # This is the fix for the Node.js Mongoose validation error.
        
        # a) Build the 'strategy' object
        strategy_name = "Unknown"
        if ml_mode == 'on':
            strategy_name = f"ML: {ml_model_name}"
        elif ml_mode == 'predictions':
            strategy_name = f"Hybrid: {ta_strategy_code} + {ml_model_name}"
        else: # 'off'
            strategy_name = f"TA: {ta_strategy_code or params.get('strategyType', 'Unknown TA')}" # Use code or param
            
        strategy_object = {
            "name": strategy_name,
            "type": ml_mode,
            "parameters": params # Send back the params used
            # These fields are not in your Mongoose 'strategyConfigSchema'
            # "mlModel": ml_model_name or None, 
            # "taCode": ta_strategy_code or None
        }

        # b) Get final balance and profit
        final_balance = results['metrics']['finalBalance']
        profit = final_balance - initial_balance
        
        # c) Parse start/end dates for ISO formatting
        # We must send ISO strings for Mongoose Date type
        start_date_iso = datetime.strptime(start_date, '%Y-%m-%d').isoformat() + "Z"
        end_date_iso = datetime.strptime(end_date, '%Y-%m-%d').isoformat() + "Z"

        # d) Build the complete response object for Node.js
        full_response = {
            "symbol": symbol,
            "timeframe": timeframe,
            "startDate": start_date_iso,
            "endDate": end_date_iso,
            "initialBalance": initial_balance,
            "finalBalance": final_balance,
            "profit": profit,
            "strategy": strategy_object,
            "candlesTested": len(results['equityCurve']),
            "totalTrades": results['metrics']['totalTrades'],
            "metrics": results['metrics'],
            "equityCurve": results['equityCurve'],
            "tradeBreakdown": results.get('trades', []) # Use .get for safety
            # Note: 'userId' will be added by Node.js
        }
        
        # --- 9. Dump and Return ---
        response_data = json.dumps(full_response, default=convert_numpy_types)
        logging.info(f"OK: Ran backtest for {symbol}/{ml_mode}.")
        return jsonify(json.loads(response_data)), 200

    except FileNotFoundError as e: logging.error(f"Not Found Error: {e}", exc_info=False); return jsonify({"error": str(e)}), 404
    except ValueError as e: logging.error(f"Value Error: {e}", exc_info=True); return jsonify({"error": str(e)}), 400
    except KeyError as e: logging.error(f"KeyError: {e}", exc_info=True); return jsonify({"error": f"Data processing error: {e}"}), 400
    except ccxt.ExchangeError as e: logging.error(f"Exchange Error: {e}", exc_info=True); return jsonify({"error": f"Exchange Error: {e}"}), 502
    except Exception as e:
        import traceback; error_details = traceback.format_exc()
        logging.error(f"General Error: {e}\n{error_details}", exc_info=True)
        return jsonify({"error": f"Unexpected server error: {e}"}), 500

# --- (Other endpoints: /api/ml/models, /api/ml/config) ---
@app.route('/api/ml/models', methods=['GET'])
def list_models():
    """Lists available models (.joblib)"""
    logging.info("Request received for /api/ml/models")
    models = []
    try:
        if not os.path.exists(MODEL_DIR): logging.error(f"Model dir not found: {MODEL_DIR}"); return jsonify([]), 500
        for filename in os.listdir(MODEL_DIR):
            if filename.endswith('.joblib'):
                model_id = os.path.splitext(filename)[0]
                if model_id and not model_id.startswith('.'):
                    model_name = model_id.replace('_', ' ').title()
                    models.append({"id": model_id, "name": model_name})
        logging.info(f"Found {len(models)} models.")
        return jsonify(models), 200
    except Exception as e: logging.error(f"Error listing models: {e}", exc_info=True); return jsonify([]), 500

@app.route('/api/ml/config/<model_name>', methods=['GET'])
def get_model_config(model_name):
    logging.info(f"Request for /api/ml/config/{model_name}")
    model_path = os.path.join(MODEL_DIR, f"{model_name}.joblib")
    if not os.path.exists(model_path): return jsonify({"error": f"Model '{model_name}.joblib' not found."}), 404
    try:
        pipeline = joblib.load(model_path)
        features = []
        if 'feature_names' in pipeline: features = pipeline['feature_names']
        else: logging.warning(f"Cannot auto-detect features for {model_name}.")
        logging.info(f"Return {len(features)} features"); return jsonify({"features": features})
    except Exception as e: logging.error(f"Error get config {model_name}: {e}"); return jsonify({"error": f"Failed get config"}), 500

# --- (serve_data_file endpoint remains unchanged) ---
@app.route('/data/<path:filename>', methods=['GET'])
def serve_data_file(filename):
    logging.info(f"Request for data file: {filename}")
    safe_base = os.path.abspath(DATA_DIR); requested_path = os.path.abspath(os.path.join(DATA_DIR, filename))
    if not requested_path.startswith(safe_base): logging.warning(f"Path block: {filename}"); return jsonify({"error": "Invalid filename"}), 400
    if not os.path.exists(requested_path): logging.warning(f"Data file not found: {requested_path}"); return jsonify({"error": "Data file not found"}), 404
    try: return send_from_directory(DATA_DIR, filename, as_attachment=False)
    except Exception as e: logging.error(f"Error serving {filename}: {e}"); return jsonify({"error": "Could not serve file"}), 500

# --- Main ---
if __name__ == '__main__':
    try:
        import sys # Make sure sys is imported
        logging.info("Starting Flask server with HTTPS on port 8001...")
        cert_path='cert.pem'; key_path='key.pem'
        if not os.path.exists(cert_path) or not os.path.exists(key_path): 
            logging.error(f"SSL cert/key not found! Cannot start HTTPS.")
            sys.exit("SSL files missing.")
        app.run(host='0.0.0.0', port=8001, debug=False, ssl_context=(cert_path, key_path))
    except Exception as e:
        logging.error(f"Failed to start Flask server: {e}", exc_info=True)
