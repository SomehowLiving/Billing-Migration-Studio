import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import StatusPill from "../components/StatusPill";
import { Plus } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";

export default function Migrations() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/migrations").then((r) => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => {
    if (authLoading || !user) return;
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [authLoading, user]);

  return (
    <div className="space-y-8" data-testid="migrations-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">Audit</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Migrations</h1>
        </div>
        <Link to="/migrations/new" data-testid="migration-new-cta" className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 h-10 text-sm font-medium rounded-md transition-colors">
          <Plus size={16} weight="bold" /> New Migration
        </Link>
      </div>

      {authLoading || loading ? (
        <div className="h-40 bg-neutral-100 animate-pulse" />
      ) : items.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-16 text-center text-sm text-neutral-500">
          No migrations yet. Start one from a data source.
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white">
          <table className="w-full text-sm" data-testid="migrations-table">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Name</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Source</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Mode</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Status</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Total</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Success</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Failed</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Started</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-neutral-200 hover:bg-neutral-50" data-testid={`migration-row-${r.id}`}>
                  <td className="px-5 py-3">
                    <Link to={`/migrations/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-500">{r.source_type}</td>
                  <td className="px-5 py-3"><StatusPill status={r.mode} /></td>
                  <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-5 py-3 font-mono">{r.total_records}</td>
                  <td className="px-5 py-3 font-mono text-emerald-700">{r.successful_records}</td>
                  <td className="px-5 py-3 font-mono text-rose-700">{r.failed_records}</td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-500">
                    {r.started_at ? new Date(r.started_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
