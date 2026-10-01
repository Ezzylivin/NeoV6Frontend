// File: src/pages/FleetPanel.jsx
// Fleet control panel: start/stop the validated long + daily-short roster,
// live roster + combined balance, BTC macro-regime badge, and the
// paper-vs-validation drift check. Talks to the Node /api/fleet/* proxy.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { startFleet, stopFleet, getFleetStatus, getFleetRegime, getFleetDrift } from "../api/fleet.js";

const fmt = (n) =>
  n === null || n === undefined || isNaN(n)
    ? "–"
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

const REGIME_STYLES = {
  risk_on: "bg-emerald-500/15 text-emerald-400",
  risk_off: "bg-red-500/15 text-red-400",
  neutral: "bg-neutral-500/15 text-neutral-400",
};
const DRIFT_STYLES = {
  ON_TRACK: "bg-emerald-500/15 text-emerald-400",
  DRIFTING: "bg-red-500/15 text-red-400",
  INSUFFICIENT_DATA: "bg-neutral-500/15 text-neutral-400",
};

function Stat({ label, children }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-100">{children}</div>
    </div>
  );
}

export default function FleetPanel() {
  const [symbols, setSymbols] = useState("BTC-USD,ETH-USD,SOL-USD");
  const [capital, setCapital] = useState(1000);
  const [maxDd, setMaxDd] = useState(20);
  const [conviction, setConviction] = useState(false);

  const [status, setStatus] = useState(null);
  const [regime, setRegime] = useState(null);
  const [drift, setDrift] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [st, rg, dr] = await Promise.all([
        getFleetStatus(),
        getFleetRegime(),
        getFleetDrift(),
      ]);
      setStatus(st);
      setRegime(rg);
      setDrift(dr);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Refresh failed");
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 15000);
    return () => clearInterval(timer.current);
  }, [refresh]);

  const onStart = async () => {
    setBusy(true); setMsg(""); setErr("");
    try {
      const body = {
        symbols: symbols.split(",").map((s) => s.trim()).filter(Boolean),
        capitalEach: Number(capital) || 1000,
        fleetMaxDrawdownPct: Number(maxDd) || 20,
        sizeByConviction: !!conviction,
      };
      const r = await startFleet(body);
      setMsg(`Started ${r.count} bots.`);
      await refresh();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Start failed");
    } finally {
      setBusy(false);
    }
  };

  const onStop = async () => {
    if (!window.confirm("Stop your entire fleet?")) return;
    setBusy(true); setMsg(""); setErr("");
    try {
      const r = await stopFleet();
      setMsg(`Stopped ${r.count} bots.`);
      await refresh();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Stop failed");
    } finally {
      setBusy(false);
    }
  };

  const regimeState = regime?.state || "neutral";
  const d = regime?.detail || {};
  const driftStatus = drift?.status || "–";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-neutral-100">
      <h1 className="text-xl font-bold">🚢 Fleet</h1>
      <p className="mb-5 text-xs text-neutral-500">
        Validated long + daily-short roster with trend-ride exits, macro-regime tilt, and a
        portfolio risk cap. Paper mode.
      </p>

      {/* Controls */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Symbols (csv)</span>
            <input
              className="w-56 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Capital / bot</span>
            <input
              type="number"
              className="w-28 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">Fleet max DD %</span>
            <input
              type="number"
              className="w-28 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              value={maxDd}
              onChange={(e) => setMaxDd(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={conviction}
              onChange={(e) => setConviction(e.target.checked)}
            />
            Conviction sizing
          </label>
          <div className="ml-auto flex gap-2 pb-0.5">
            <button
              onClick={onStart}
              disabled={busy}
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
            >
              Start fleet
            </button>
            <button
              onClick={onStop}
              disabled={busy}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-black hover:bg-red-400 disabled:opacity-50"
            >
              Stop
            </button>
            <button
              onClick={refresh}
              disabled={busy}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:border-neutral-500"
            >
              Refresh
            </button>
          </div>
        </div>
        {(msg || err) && (
          <div className={`mt-3 text-xs ${err ? "text-red-400" : "text-emerald-400"}`}>
            {err || msg}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Bots">{status?.count ?? "–"}</Stat>
        <Stat label="Combined balance">${fmt(status?.total_balance)}</Stat>
        <Stat label="Open positions">{status?.open_positions ?? "–"}</Stat>
        <Stat label="Macro regime">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${REGIME_STYLES[regimeState] || REGIME_STYLES.neutral}`}>
            {regimeState.replace("_", " ")}
          </span>
        </Stat>
        <Stat label="Drift check">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${DRIFT_STYLES[driftStatus] || DRIFT_STYLES.INSUFFICIENT_DATA}`}>
            {driftStatus}
          </span>
        </Stat>
      </div>

      {/* Roster */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Roster</h2>
          <span className="text-xs text-neutral-500">
            {d.btc_price ? `BTC ${fmt(d.btc_price)} · ema50 ${fmt(d.ema50)} · ema200 ${fmt(d.ema200)}` : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-4 text-left">Symbol</th>
                <th className="py-2 pr-4 text-left">Side</th>
                <th className="py-2 pr-4 text-left">TF</th>
                <th className="py-2 pr-4 text-left">Status</th>
                <th className="py-2 pr-4 text-left">Balance</th>
                <th className="py-2 pr-4 text-left">Open</th>
                <th className="py-2 pr-4 text-left">Closed</th>
              </tr>
            </thead>
            <tbody>
              {!status?.bots?.length ? (
                <tr>
                  <td colSpan={7} className="py-4 text-neutral-500">
                    No fleet running. Set your symbols and Start.
                  </td>
                </tr>
              ) : (
                status.bots.map((b) => {
                  const dir = (b.direction || "").toUpperCase();
                  const dcls = dir === "LONG" ? "text-emerald-400" : dir === "SHORT" ? "text-red-400" : "text-neutral-400";
                  const bcls = b.balance >= 1000 ? "text-emerald-400" : "text-red-400";
                  return (
                    <tr key={b.id} className="border-t border-neutral-800">
                      <td className="py-2 pr-4">{b.symbol || "–"}</td>
                      <td className={`py-2 pr-4 font-medium ${dcls}`}>{dir || "–"}</td>
                      <td className="py-2 pr-4 text-neutral-400">{b.timeframe || "–"}</td>
                      <td className="py-2 pr-4 text-neutral-400">{b.status || "–"}</td>
                      <td className={`py-2 pr-4 ${bcls}`}>${fmt(b.balance)}</td>
                      <td className="py-2 pr-4">{b.open_positions ?? 0}</td>
                      <td className="py-2 pr-4 text-neutral-400">{b.trades ?? 0}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drift */}
      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <h2 className="mb-1 text-sm font-semibold">Drift vs validated profile</h2>
        <p className="mb-3 text-xs text-neutral-500">
          {drift?.note || "Needs ≥10 closed trades to judge. Baseline: ~26–40% win, profit factor 1.2–1.7."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Trades">{drift?.trades ?? "–"}</Stat>
          <Stat label="Win rate">{drift?.win_rate != null ? `${drift.win_rate}%` : "–"}</Stat>
          <Stat label="Profit factor">{fmt(drift?.profit_factor)}</Stat>
          <Stat label="Net PnL">
            <span className={(drift?.net_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}>
              {(drift?.net_pnl ?? 0) >= 0 ? "+" : "-"}${fmt(Math.abs(drift?.net_pnl ?? 0))}
            </span>
          </Stat>
        </div>
      </div>
    </div>
  );
}
