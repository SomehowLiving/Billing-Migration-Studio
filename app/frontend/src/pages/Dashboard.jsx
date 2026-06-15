import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import StatusPill from "../components/StatusPill";
import { Link } from "react-router-dom";
import { Plus, Database, Users, FileText, ChartBar } from "@phosphor-icons/react";

function MetricTile({ label, value, hint, testid, accent }) {
  return (
    <div
      className="border border-neutral-200 bg-white p-5 hover:border-neutral-900 transition-colors"
      data-testid={testid}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
        {label}
      </div>
      <div className="font-display text-4xl font-black tracking-tighter mt-3" style={{ color: accent || "#09090b" }}>
        {value}
      </div>
      {hint && <div className="text-xs text-neutral-500 mt-1.5">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch((e) => {
        if (e?.response?.status === 401) return;
        setError(e?.message || "Failed to load dashboard");
      });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!stats)
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-72 bg-neutral-200" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-neutral-200" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            Operations · Overview
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-2">
            Migration Console
          </h1>
        </div>
        <Link
          to="/migrations/new"
          data-testid="new-migration-cta"
          className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 h-10 text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={16} weight="bold" /> New Migration
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile testid="metric-runs" label="Total Runs" value={stats.total_runs} hint={`${stats.running} running · ${stats.completed} done`} />
        <MetricTile testid="metric-sources" label="Data Sources" value={stats.sources} />
        <MetricTile testid="metric-customers" label="Customers Migrated" value={stats.customers_migrated} accent="#10b981" />
        <MetricTile testid="metric-failed" label="Failed Runs" value={stats.failed} hint={stats.failed > 0 ? "Inspect & retry" : "All clear"} accent={stats.failed > 0 ? "#e11d48" : "#09090b"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 border border-neutral-200 bg-white">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              Recent Runs
            </div>
            <Link to="/migrations" className="text-xs text-neutral-500 hover:text-neutral-900">View all →</Link>
          </div>
          {stats.recent_runs.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="text-sm text-neutral-500 mb-4">No migrations yet.</div>
              <Link to="/migrations/new" className="text-sm font-medium underline">Start your first migration →</Link>
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="recent-runs-table">
              <thead className="bg-neutral-50">
                <tr className="text-left">
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Name</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Mode</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Status</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Success</th>
                  <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Failed</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_runs.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-200 hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <Link to={`/migrations/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                    </td>
                    <td className="px-5 py-3"><StatusPill status={r.mode} /></td>
                    <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-5 py-3 font-mono text-emerald-700">{r.successful_records}</td>
                    <td className="px-5 py-3 font-mono text-rose-700">{r.failed_records}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-neutral-200 bg-white p-5 space-y-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            Migrated Entities
          </div>
          {[
            { label: "Customers", value: stats.customers_migrated, icon: Users },
            { label: "Subscriptions", value: stats.subscriptions, icon: FileText },
            { label: "Contracts", value: stats.contracts, icon: ChartBar },
            { label: "Data Sources", value: stats.sources, icon: Database },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <row.icon size={16} weight="duotone" /> {row.label}
              </div>
              <div className="font-mono font-medium">{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
