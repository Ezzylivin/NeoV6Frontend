// File: src/pages/AdminPanel.jsx
// Operator control plane. Role-gated (admin only) both by the route wrapper and
// here. Lets you see every account, comp/change tiers & roles on the fly, watch
// headline numbers, and hit the global emergency kill switch for all fleets.
import React, { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { ShieldAlert, Users, DollarSign, Search, Power, Loader2, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getOverview, listUsers, updateUser, setKillswitch } from "../api/admin";

const TIERS = ["free", "trader", "pro", "whale"];
const ROLES = ["user", "admin", "whale"];

export default function AdminPanel() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, count: 0 });
  const [q, setQ] = useState("");
  const [fTier, setFTier] = useState("");
  const [fRole, setFRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState("");
  const [kill, setKill] = useState(false);

  const loadOverview = useCallback(async () => {
    try { setOverview(await getOverview()); } catch (e) { /* non-fatal */ }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const data = await listUsers({ q, tier: fTier, role: fRole, page, limit: 50 });
      setRows(data.users || []);
      setMeta({ page: data.page, pages: data.pages, count: data.count });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load users.");
    } finally { setLoading(false); }
  }, [q, fTier, fRole, page]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const patch = async (id, body) => {
    setSavingId(id); setErr("");
    try {
      const { user: saved } = await updateUser(id, body);
      setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...saved } : r)));
      loadOverview();
    } catch (e) {
      setErr(e?.response?.data?.message || "Update failed.");
    } finally { setSavingId(""); }
  };

  const toggleKill = async () => {
    const next = !kill;
    const msg = next
      ? "Engage the GLOBAL kill switch? This halts ALL new entries for EVERY user's fleet."
      : "Release the global kill switch and allow new entries again?";
    if (!window.confirm(msg)) return;
    try { await setKillswitch(next); setKill(next); }
    catch (e) { setErr(e?.response?.data?.message || "Kill switch failed."); }
  };

  // Hard client-side gate (the API also enforces 403). Admins only. Declared
  // AFTER all hooks so the hook order stays stable across the initializing →
  // resolved transition of `user`.
  if (user && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-neutral-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Admin Control</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white/5"
            title="Account settings — email, exchange keys, subscription"
          >
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
          <button
            onClick={toggleKill}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
              kill ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]" : "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
            }`}
            title="Global emergency halt of all new entries"
          >
            <Power className="h-4 w-4" /> {kill ? "KILL SWITCH ENGAGED" : "Global kill switch"}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Total users" value={overview?.total ?? "—"} />
        <Stat icon={DollarSign} label="Est. MRR" value={overview ? `$${overview.estMrr}` : "—"} sub={`${overview?.paying ?? 0} paying`} />
        <Stat icon={ShieldAlert} label="Admins" value={overview?.admins ?? "—"} />
        <Stat icon={Users} label="Verified" value={overview?.verified ?? "—"} />
      </div>

      {overview?.byTier && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {TIERS.map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-neutral-300">
              {t}: <strong className="text-white">{overview.byTier[t] ?? 0}</strong>
            </span>
          ))}
        </div>
      )}

      {/* FILTERS */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Search username, email, wallet…"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <select value={fTier} onChange={(e) => { setPage(1); setFTier(e.target.value); }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option value="">All tiers</option>
          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fRole} onChange={(e) => { setPage(1); setFRole(e.target.value); }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={loadUsers} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {err && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{err}</div>}

      {/* USER TABLE */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">Bots</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-neutral-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-neutral-500">No users match.</td></tr>
            ) : rows.map((u) => (
              <tr key={u._id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{u.username || u.email || (u.walletAddress ? `${u.walletAddress.slice(0,6)}…` : "—")}</div>
                  <div className="text-xs text-neutral-500">{u.email}{u.isVerified ? "" : " · unverified"}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.tier || "free"}
                    disabled={savingId === u._id}
                    onChange={(e) => patch(u._id, { tier: e.target.value })}
                    className="rounded border border-white/10 bg-[#161616] px-2 py-1 text-xs text-white"
                  >
                    {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {u.tierManualOverride && <span className="ml-1 text-[10px] text-amber-400" title="Set by hand (comped)">comp</span>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role || "user"}
                    disabled={savingId === u._id}
                    onChange={(e) => patch(u._id, { role: e.target.value })}
                    className="rounded border border-white/10 bg-[#161616] px-2 py-1 text-xs text-white"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400">
                  {u.subscriptionStatus || "—"}{u.subscriptionInterval ? ` · ${u.subscriptionInterval}` : ""}
                </td>
                <td className="px-4 py-3 text-neutral-300">{u.activeBotCount ?? 0}</td>
                <td className="px-4 py-3 text-xs text-neutral-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
        <span>{meta.count} users</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="rounded border border-white/10 px-3 py-1 disabled:opacity-40">Prev</button>
          <span>Page {meta.page} / {meta.pages || 1}</span>
          <button disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}
            className="rounded border border-white/10 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-xs text-neutral-400"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}
