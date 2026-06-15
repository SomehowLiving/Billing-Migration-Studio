import React, { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Plus, Trash, UploadSimple, ArrowRight, FileCsv, CreditCard, Database, Buildings } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";

export default function DataSources() {
  const { user, loading: authLoading } = useAuth();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [stripeLimit, setStripeLimit] = useState(20);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    api.get("/sources")
      .then((r) => setSources(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Pick a CSV file first"); return; }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      await api.post("/sources/csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Uploaded ${file.name}`);
      setUploadOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const handleStripe = async () => {
    setUploading(true);
    try {
      const { data } = await api.post(`/sources/stripe?limit=${stripeLimit}`);
      toast.success(`Imported ${data.name}`);
      setStripeOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  
  const handleImport = async (type) => {
    setUploading(true);
    try {
      const { data } = await api.post(`/sources/${type}?limit=20`);
      toast.success(`Imported ${data.name}`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this data source?")) return;
    try {
      await api.delete(`/sources/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="space-y-8" data-testid="sources-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            Ingestion
          </div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Data Sources</h1>
          <p className="text-sm text-neutral-500 mt-1">Upload billing exports or pull from billing providers.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button data-testid="upload-csv-button" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-md">
                <UploadSimple size={16} className="mr-2" /> Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="upload-csv-dialog">
              <DialogHeader>
                <DialogTitle>Upload CSV / TSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-mono uppercase tracking-[0.2em]">File</Label>
                <Input ref={fileRef} type="file" accept=".csv,.tsv,.txt" data-testid="csv-file-input" />
                <div className="text-xs text-neutral-500">Auto-detects delimiter, encoding and schema.</div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpload} disabled={uploading} data-testid="csv-upload-submit" className="bg-neutral-900 text-white">
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={stripeOpen} onOpenChange={setStripeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="import-stripe-button" className="rounded-md border-neutral-300">
                <CreditCard size={16} className="mr-2" /> Import Stripe
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="stripe-import-dialog">
              <DialogHeader>
                <DialogTitle>Import from Stripe</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="text-xs text-neutral-500">
                  If no <code className="font-mono">STRIPE_SECRET_KEY</code> is configured, mock data is used.
                </div>
                <Label className="text-xs font-mono uppercase tracking-[0.2em]">Records to import</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={stripeLimit}
                  onChange={(e) => setStripeLimit(Number(e.target.value))}
                  data-testid="stripe-limit-input"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleStripe} disabled={uploading} data-testid="stripe-import-submit" className="bg-neutral-900 text-white">
                  {uploading ? "Importing…" : "Import"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={() => handleImport("chargebee")} disabled={uploading} data-testid="import-chargebee-button" className="rounded-md border-neutral-300">
            <Database size={16} className="mr-2" /> Chargebee
          </Button>
          <Button variant="outline" onClick={() => handleImport("internal")} disabled={uploading} data-testid="import-internal-button" className="rounded-md border-neutral-300">
            <Buildings size={16} className="mr-2" /> Internal
          </Button>
        </div>
      </div>

      {authLoading || loading ? (
        <div className="h-40 bg-neutral-100 animate-pulse" />
      ) : sources.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-16 text-center">
          <FileCsv size={32} className="mx-auto text-neutral-400" weight="duotone" />
          <div className="mt-4 font-display text-xl font-bold">No data sources yet</div>
          <div className="text-sm text-neutral-500 mt-2">Upload a CSV or import from Stripe to get started.</div>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white">
          <table className="w-full text-sm" data-testid="sources-table">
            <thead className="bg-neutral-50">
              <tr className="text-left">
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Name</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Type</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Rows</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Fields</th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Created</th>
                <th className="px-5 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-t border-neutral-200 hover:bg-neutral-50" data-testid={`source-row-${s.id}`}>
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3"><span className="pill pill-neutral">{s.type}</span></td>
                  <td className="px-5 py-3 font-mono">{s.row_count}</td>
                  <td className="px-5 py-3 font-mono text-neutral-500">{Object.keys(s.inferred_schema || {}).length}</td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-500">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/migrations/new?source=${s.id}`} className="inline-flex items-center gap-1 text-xs font-medium hover:underline mr-3" data-testid={`map-source-${s.id}`}>
                      Map <ArrowRight size={12} />
                    </Link>
                    <button onClick={() => handleDelete(s.id)} className="text-neutral-400 hover:text-rose-600" data-testid={`delete-source-${s.id}`}>
                      <Trash size={14} />
                    </button>
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
