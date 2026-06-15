import React, { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Trash, ArrowsLeftRight } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";

export default function Mappings() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    setLoading(true);
    api.get("/mappings").then((r) => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user]);

  const remove = async (id) => {
    if (!confirm("Delete mapping template?")) return;
    try {
      await api.delete(`/mappings/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="space-y-8" data-testid="mappings-page">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">Schema</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Mapping Templates</h1>
        <p className="text-sm text-neutral-500 mt-1">Reusable source-to-canonical field mappings. Saved from migration runs.</p>
      </div>

      {authLoading || loading ? (
        <div className="h-40 bg-neutral-100 animate-pulse" />
      ) : items.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-16 text-center">
          <ArrowsLeftRight size={32} className="mx-auto text-neutral-400" weight="duotone" />
          <div className="mt-4 font-display text-xl font-bold">No saved mappings</div>
          <div className="text-sm text-neutral-500 mt-2">
            Save a mapping template while configuring a migration to reuse it.
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((m) => (
            <div key={m.id} className="border border-neutral-200 bg-white p-5" data-testid={`mapping-card-${m.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-bold text-lg">{m.name}</div>
                  <div className="text-xs text-neutral-500 mt-1">{m.description || "—"}</div>
                </div>
                <button onClick={() => remove(m.id)} className="text-neutral-400 hover:text-rose-600" data-testid={`delete-mapping-${m.id}`}>
                  <Trash size={14} />
                </button>
              </div>
              <div className="mt-4 space-y-1">
                {Object.entries(m.mappings || {}).map(([src, tgt]) => (
                  <div key={src} className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 bg-neutral-100 truncate">{src}</span>
                    <ArrowsLeftRight size={10} className="text-neutral-400 shrink-0" />
                    <span className="px-2 py-0.5 bg-neutral-900 text-white truncate">{tgt}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                {new Date(m.created_at).toLocaleDateString()} · {m.source_type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
