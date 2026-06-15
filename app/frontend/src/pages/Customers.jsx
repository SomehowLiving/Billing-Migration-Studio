import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Customers() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      api.get("/customers").then((r) => setItems(r.data)).finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  return (
    <div className="space-y-8" data-testid="customers-page">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">Outcomes</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Migrated Customers</h1>
        <p className="text-sm text-neutral-500 mt-1">Records written to the canonical billing schema.</p>
      </div>

      {authLoading || loading ? (
        <div className="h-40 bg-neutral-100 animate-pulse" />
      ) : items.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-16 text-center text-sm text-neutral-500">
          No customers migrated yet. Run an <span className="font-mono">actual</span> migration to populate this list.
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white">
          <table className="w-full text-sm" data-testid="customers-table">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Email</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Name</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">External ID</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Source</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-neutral-200 hover:bg-neutral-50">
                  <td className="px-5 py-3 font-mono">{c.email}</td>
                  <td className="px-5 py-3">{c.name || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-500">{c.external_id || "—"}</td>
                  <td className="px-5 py-3"><span className="pill pill-neutral">{c.source_system}</span></td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-500">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
