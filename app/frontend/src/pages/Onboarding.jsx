import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Plus, ArrowRight, CheckCircle, Circle } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [runs, setRuns] = useState([]);
  const [form, setForm] = useState({ name: "", customer_name: "", description: "", source_ids: [], mapping_template_ids: [], migration_run_ids: [] });

  const load = () => {
    if (!user) return;
    api.get("/onboarding/projects").then((r) => setItems(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => {
    if (!authLoading && user) {
      load();
      api.get("/sources").then((r) => setSources(r.data));
      api.get("/mappings").then((r) => setMappings(r.data));
      api.get("/migrations").then((r) => setRuns(r.data));
    }
  }, [authLoading, user]);

  const toggle = (key, id) => {
    setForm((f) => {
      const arr = new Set(f[key]);
      arr.has(id) ? arr.delete(id) : arr.add(id);
      return { ...f, [key]: Array.from(arr) };
    });
  };

  const submit = async () => {
    if (!form.name || !form.customer_name) { toast.error("Name and customer required"); return; }
    try {
      await api.post("/onboarding/projects", form);
      toast.success("Onboarding project created");
      setOpen(false);
      setForm({ name: "", customer_name: "", description: "", source_ids: [], mapping_template_ids: [], migration_run_ids: [] });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="space-y-8" data-testid="onboarding-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">Customer Success</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Onboarding Projects</h1>
          <p className="text-sm text-neutral-500 mt-1">Bundle sources, mappings & runs into a shareable customer success page.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-md" data-testid="new-project-button">
              <Plus size={16} className="mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="new-project-dialog">
            <DialogHeader><DialogTitle>New Onboarding Project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-mono uppercase tracking-[0.2em]">Project Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="project-name-input" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs font-mono uppercase tracking-[0.2em]">Customer</Label>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} data-testid="project-customer-input" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-mono uppercase tracking-[0.2em]">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
              </div>
              {[
                { label: "Data Sources", key: "source_ids", list: sources, labelFn: (s) => `${s.name} (${s.row_count})` },
                { label: "Mapping Templates", key: "mapping_template_ids", list: mappings, labelFn: (m) => m.name },
                { label: "Migration Runs", key: "migration_run_ids", list: runs, labelFn: (r) => `${r.name} · ${r.status} · ${r.successful_records}/${r.total_records}` },
              ].map(({ label, key, list, labelFn }) => (
                <div key={key}>
                  <Label className="text-xs font-mono uppercase tracking-[0.2em]">{label}</Label>
                  <div className="mt-1.5 border border-neutral-200 max-h-32 overflow-y-auto divide-y divide-neutral-100">
                    {list.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-neutral-500">None yet.</div>
                    ) : list.map((it) => (
                      <label key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer">
                        <Checkbox checked={form[key].includes(it.id)} onCheckedChange={() => toggle(key, it.id)} />
                        <span className="truncate">{labelFn(it)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={submit} className="bg-neutral-900 text-white" data-testid="create-project-submit">Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {authLoading || loading ? (
        <div className="h-40 bg-neutral-100 animate-pulse" />
      ) : items.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-16 text-center">
          <CheckCircle size={32} className="mx-auto text-neutral-400" weight="duotone" />
          <div className="mt-4 font-display text-xl font-bold">No onboarding projects yet</div>
          <div className="text-sm text-neutral-500 mt-2">Create one to bundle a customer's migration into a shareable success page.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((p) => (
            <Link to={`/onboarding/${p.id}`} key={p.id} data-testid={`project-card-${p.id}`} className="border border-neutral-200 bg-white p-5 hover:border-neutral-900 hover:-translate-y-0.5 transition-transform group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">{p.customer_name}</div>
                  <div className="font-display text-2xl font-bold tracking-tight mt-1">{p.name}</div>
                </div>
                <ArrowRight size={18} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
              </div>
              <div className="mt-4 h-1.5 bg-neutral-100">
                <div className="h-full bg-emerald-500" style={{ width: `${p.progress}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-mono text-neutral-500">
                <span>{p.progress}% complete</span>
                <span>{p.stats.successful}/{p.stats.total_records} records</span>
              </div>
              <div className="mt-4 space-y-1.5">
                {p.checklist.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {c.done ? <CheckCircle size={14} weight="fill" className="text-emerald-600" /> : <Circle size={14} className="text-neutral-300" />}
                    <span className={c.done ? "text-neutral-900" : "text-neutral-400"}>{c.step}</span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
