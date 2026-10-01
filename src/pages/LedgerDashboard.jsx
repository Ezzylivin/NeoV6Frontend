// File: src/pages/LedgerDashboard.jsx
// Native in-app page for the Trade Learning Ledger.
// Fetches the same FastAPI your app already uses (VITE_API_URL) — no new backend.
import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/apiClient.js';

// Uses the shared apiClient so the base URL (/api handled once) and the JWT are
// applied exactly like every other authenticated call — no hand-rolled base URL
// (which double-added /api -> 404) and no manual token (which read the wrong key).

const fmt = (n, d = 2) =>
  n == null || isNaN(n) ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const sign = (n) => (n > 0 ? '+' : '') + fmt(n);
const pnlColor = (n) => (n > 0 ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-neutral-300');

function Sparkline({ series }) {
  if (!series || series.length < 2)
    return <div className="py-10 text-center text-sm text-neutral-500">Not enough closed trades yet to chart.</div>;
  const w = 760, h = 180, pad = 8;
  const ys = series.map((p) => p.cum_pnl);
  const min = Math.min(...ys, 0), max = Math.max(...ys, 0);
  const span = max - min || 1;
  const X = (i) => pad + (i * (w - 2 * pad)) / (series.length - 1);
  const Y = (v) => h - pad - ((v - min) * (h - 2 * pad)) / span;
  const d = series.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.cum_pnl).toFixed(1)}`).join(' ');
  const last = ys[ys.length - 1];
  const stroke = last >= 0 ? '#34d399' : '#f87171';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="none" style={{ maxHeight: 200 }}>
      <line x1="0" y1={Y(0)} x2={w} y2={Y(0)} stroke="#ffffff20" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

const Pill = ({ text, kind }) => {
  const map = {
    long: 'bg-emerald-500/15 text-emerald-400',
    short: 'bg-red-500/15 text-red-400',
    live: 'bg-amber-500/15 text-amber-400',
    paper: 'bg-sky-500/15 text-sky-400',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[kind] || 'bg-white/10 text-neutral-300'}`}>{text}</span>;
};

const Card = ({ label, value, color }) => (
  <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
    <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
    <div className={`mt-1.5 text-2xl font-bold ${color || 'text-neutral-100'}`}>{value}</div>
  </div>
);

const MiniTable = ({ cols, rows, render }) => (
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr>{cols.map((c) => <th key={c.k} className={`border-b border-white/10 px-2 py-1.5 text-[11px] uppercase text-neutral-500 ${c.num ? 'text-right' : 'text-left'}`}>{c.label}</th>)}</tr>
    </thead>
    <tbody>
      {(!rows || !rows.length)
        ? <tr><td colSpan={cols.length} className="py-6 text-center text-neutral-600">No data</td></tr>
        : rows.map((r, i) => <tr key={i}>{render(r)}</tr>)}
    </tbody>
  </table>
);

export default function LedgerDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/ledger/stats', { params: { recent: 30 } });
      setData(res.data);
      setErr(null);
      setUpdated(new Date());
    } catch (e) {
      setErr(e?.response?.status ? `HTTP ${e.response.status}` : String(e.message || e));
    }
  }, []);

  const clearLedger = useCallback(async () => {
    if (!window.confirm("Clear your entire trade ledger? This permanently deletes all learning data and cannot be undone.")) return;
    try {
      await api.post('/ledger/clear');
      setData(null);
      await load();
    } catch (e) {
      setErr(e?.response?.status ? `HTTP ${e.response.status}` : String(e.message || e));
    }
  }, [load]);

  const saveLedger = useCallback(() => {
    const rows = data?.recent || [];
    if (!rows.length) { return; }
    const cols = ['ts', 'symbol', 'direction', 'mode', 'entry_price', 'exit_price', 'pnl', 'label', 'reason', 'entry_conf', 'composite'];
    const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `neo-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }, [data]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const t = data?.totals || {};
  const empty = data && !t.trades;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-emerald-400">🧠 Trade Learning Ledger</h1>
          <p className="text-sm text-neutral-500">Every closed trade the bot has made — the data it learns from.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveLedger} disabled={!data?.recent?.length}
            className="rounded-lg border border-white/10 bg-[#1b1b1b] px-4 py-2 text-sm text-neutral-300 hover:border-emerald-400/50 disabled:opacity-40"
            title="Export the loaded trades as CSV">
            ⤓ Save
          </button>
          <button onClick={clearLedger} disabled={!data?.totals?.trades}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:border-red-400/60 disabled:opacity-40"
            title="Permanently delete all your ledger trades">
            🗑 Clear
          </button>
          <button onClick={load} className="rounded-lg border border-white/10 bg-[#1b1b1b] px-4 py-2 text-sm text-neutral-300 hover:border-emerald-400/50">
            ↻ Refresh
          </button>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Could not load ledger: {err}</div>}
      {!data && !err && <div className="py-16 text-center text-neutral-500">Loading…</div>}
      {empty && <div className="rounded-xl border border-white/10 bg-[#181818] p-10 text-center text-neutral-500">No trades recorded yet. The ledger fills as the bot closes positions.</div>}

      {data && t.trades ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card label="Closed Trades" value={t.trades} />
            <Card label="Win Rate" value={`${fmt(t.win_rate, 1)}%`} />
            <Card label="Total PnL" value={sign(t.total_pnl)} color={pnlColor(t.total_pnl)} />
            <Card label="Avg PnL / Trade" value={sign(t.avg_pnl)} color={pnlColor(t.avg_pnl)} />
          </div>

          <div className="mb-4 rounded-xl border border-white/10 bg-[#181818] p-4">
            <div className="mb-3 text-[11px] uppercase tracking-wide text-neutral-500">Cumulative Realized PnL</div>
            <Sparkline series={data.cum_pnl} />
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
              <div className="mb-3 text-[11px] uppercase tracking-wide text-neutral-500">By Direction</div>
              <MiniTable
                cols={[{ k: 'd', label: 'Direction' }, { k: 't', label: 'Trades', num: true }, { k: 'w', label: 'Win%', num: true }, { k: 'p', label: 'PnL', num: true }]}
                rows={data.by_direction}
                render={(r) => (<>
                  <td className="border-b border-white/5 px-2 py-1.5"><Pill text={(r.direction || '').toUpperCase()} kind={r.direction} /></td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{r.trades}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{fmt(r.win_rate, 1)}</td>
                  <td className={`border-b border-white/5 px-2 py-1.5 text-right tabular-nums ${pnlColor(r.total_pnl)}`}>{sign(r.total_pnl)}</td>
                </>)}
              />
              <div className="mt-4 mb-2 text-[11px] uppercase tracking-wide text-neutral-500">By Exit Reason</div>
              <MiniTable
                cols={[{ k: 'r', label: 'Reason' }, { k: 't', label: 'Trades', num: true }, { k: 'w', label: 'Win%', num: true }, { k: 'p', label: 'PnL', num: true }]}
                rows={data.by_reason}
                render={(r) => (<>
                  <td className="border-b border-white/5 px-2 py-1.5">{r.reason || '—'}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{r.trades}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{fmt(r.win_rate, 1)}</td>
                  <td className={`border-b border-white/5 px-2 py-1.5 text-right tabular-nums ${pnlColor(r.total_pnl)}`}>{sign(r.total_pnl)}</td>
                </>)}
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
              <div className="mb-3 text-[11px] uppercase tracking-wide text-neutral-500">By Symbol</div>
              <MiniTable
                cols={[{ k: 's', label: 'Symbol' }, { k: 't', label: 'Trades', num: true }, { k: 'w', label: 'Win%', num: true }, { k: 'p', label: 'PnL', num: true }]}
                rows={data.by_symbol}
                render={(r) => (<>
                  <td className="border-b border-white/5 px-2 py-1.5">{r.symbol}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{r.trades}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{fmt(r.win_rate, 1)}</td>
                  <td className={`border-b border-white/5 px-2 py-1.5 text-right tabular-nums ${pnlColor(r.total_pnl)}`}>{sign(r.total_pnl)}</td>
                </>)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#181818] p-4">
            <div className="mb-3 text-[11px] uppercase tracking-wide text-neutral-500">Recent Trades</div>
            <div className="overflow-x-auto">
              <MiniTable
                cols={[
                  { k: 't', label: 'Time (UTC)' }, { k: 'sy', label: 'Symbol' }, { k: 'd', label: 'Dir' }, { k: 'm', label: 'Mode' },
                  { k: 'e', label: 'Entry', num: true }, { k: 'x', label: 'Exit', num: true }, { k: 'p', label: 'PnL', num: true },
                  { k: 'c', label: 'Conf', num: true }, { k: 'sc', label: 'Score', num: true }, { k: 'r', label: 'Reason' },
                ]}
                rows={data.recent}
                render={(r) => (<>
                  <td className="border-b border-white/5 px-2 py-1.5 whitespace-nowrap">{(r.ts || '').replace('T', ' ').slice(0, 19)}</td>
                  <td className="border-b border-white/5 px-2 py-1.5">{r.symbol}</td>
                  <td className="border-b border-white/5 px-2 py-1.5"><Pill text={(r.direction || '').toUpperCase()} kind={r.direction} /></td>
                  <td className="border-b border-white/5 px-2 py-1.5"><Pill text={r.mode} kind={r.mode} /></td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{fmt(r.entry_price)}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{fmt(r.exit_price)}</td>
                  <td className={`border-b border-white/5 px-2 py-1.5 text-right tabular-nums ${pnlColor(r.pnl)}`}>{sign(r.pnl)}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{r.entry_conf == null ? '—' : `${fmt(r.entry_conf * 100, 0)}%`}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 text-right tabular-nums">{r.composite == null ? '—' : fmt(r.composite, 0)}</td>
                  <td className="border-b border-white/5 px-2 py-1.5 whitespace-nowrap">{r.reason || ''}</td>
                </>)}
              />
            </div>
          </div>

          {updated && <div className="mt-3 text-xs text-neutral-600">Updated {updated.toLocaleTimeString()}</div>}
        </>
      ) : null}
    </div>
  );
}
