import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError, API_BASE } from "../lib/api";
import StatusPill from "../components/StatusPill";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { toast } from "sonner";
import { ArrowCounterClockwise, ArrowUUpLeft, DownloadSimple, ArrowLeft } from "@phosphor-icons/react";

export default function MigrationDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [recordFilter, setRecordFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/migrations/${id}`).then((r) => setRun(r.data)).catch(() => {});
    api.get(`/migrations/${id}/records`).then((r) => setRecords(r.data));
    api.get(`/migrations/${id}/logs`).then((r) => setLogs(r.data));
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (run?.status === "running" || run?.status === "pending") load();
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [id, run?.status]);

  const handleRetry = async () => {
    setBusy(true);
    try {
      await api.post(`/migrations/${id}/retry`);
      toast.success("Re-running migration");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async () => {
    if (!confirm("Rollback all successful records?")) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/migrations/${id}/rollback`);
      toast.success(`Rolled back ${data.rolled_back} records`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = (format) => {
    window.open(`${API_BASE}/migrations/${id}/report?format=${format}`, "_blank");
  };

  if (!run) return <div className="h-40 bg-neutral-100 animate-pulse" />;

  const filtered = recordFilter === "all"
    ? records
    : records.filter((r) => r.status === recordFilter);

  const successPct = run.total_records
    ? Math.round((run.successful_records / run.total_records) * 100)
    : 0;

  return (
    <div className="space-y-6" data-testid="migration-detail-page">
      <div>
        <Link to="/migrations" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={12} /> Back to Migrations
        </Link>
        <div className="flex items-end justify-between mt-2 gap-4">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tighter">{run.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <StatusPill status={run.status} />
              <StatusPill status={run.mode} />
              <span className="font-mono text-xs text-neutral-500">#{run.id.slice(0, 8)}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={handleRetry} disabled={busy} data-testid="retry-button" className="rounded-md border-neutral-300">
              <ArrowCounterClockwise size={14} className="mr-1" /> Re-run
            </Button>
            {run.mode === "actual" && run.status === "completed" && (
              <Button variant="outline" onClick={handleRollback} disabled={busy} data-testid="rollback-button" className="rounded-md border-neutral-300 text-rose-700">
                <ArrowUUpLeft size={14} className="mr-1" /> Rollback
              </Button>
            )}
            <Button variant="outline" onClick={() => downloadReport("json")} data-testid="download-json-button" className="rounded-md border-neutral-300">
              <DownloadSimple size={14} className="mr-1" /> JSON
            </Button>
            <Button variant="outline" onClick={() => downloadReport("csv")} data-testid="download-csv-button" className="rounded-md border-neutral-300">
              <DownloadSimple size={14} className="mr-1" /> CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: run.total_records, accent: "#09090b", tid: "stat-total" },
          { label: "Successful", value: run.successful_records, accent: "#10b981", tid: "stat-success" },
          { label: "Failed", value: run.failed_records, accent: "#e11d48", tid: "stat-failed" },
          { label: "Validation Errors", value: run.validation_errors, accent: "#f59e0b", tid: "stat-validation" },
          { label: "Success Rate", value: `${successPct}%`, accent: "#2563eb", tid: "stat-rate" },
        ].map((s) => (
          <div key={s.label} className="border border-neutral-200 bg-white p-4" data-testid={s.tid}>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">{s.label}</div>
            <div className="font-display text-3xl font-black tracking-tighter mt-2" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {run.total_records > 0 && (
        <div className="h-2 bg-neutral-200 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${successPct}%` }} />
        </div>
      )}

      <Tabs defaultValue="records" className="border border-neutral-200 bg-white">
        <TabsList className="bg-neutral-50 border-b border-neutral-200 rounded-none p-0 h-auto w-full justify-start">
          <TabsTrigger value="records" data-testid="tab-records" className="rounded-none px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 font-mono text-[11px] uppercase tracking-[0.2em]">
            Records ({records.length})
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs" className="rounded-none px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 font-mono text-[11px] uppercase tracking-[0.2em]">
            Logs ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary" className="rounded-none px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 font-mono text-[11px] uppercase tracking-[0.2em]">
            Summary
          </TabsTrigger>
        </TabsList>
        <TabsContent value="records" className="m-0 p-0">
          <div className="px-5 py-3 border-b border-neutral-200 flex items-center gap-2">
            {["all", "success", "failed", "rolled_back"].map((s) => (
              <button
                key={s}
                onClick={() => setRecordFilter(s)}
                data-testid={`filter-${s}`}
                className={`text-xs font-mono uppercase tracking-wider px-3 py-1 border ${recordFilter === s ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"}`}
              >{s}</button>
            ))}
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 sticky top-0">
                <tr className="text-left">
                  <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Source ID</th>
                  <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Type</th>
                  <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Status</th>
                  <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Error</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-500">No records.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-5 py-2 font-mono text-xs">{r.source_id}</td>
                    <td className="px-5 py-2 font-mono text-xs text-neutral-500">{r.record_type}</td>
                    <td className="px-5 py-2"><StatusPill status={r.status} /></td>
                    <td className="px-5 py-2 text-xs text-rose-700">{r.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="logs" className="m-0 p-0">
          <div className="font-mono text-xs max-h-[480px] overflow-y-auto bg-neutral-950 text-neutral-100 p-4">
            {logs.length === 0 ? (
              <div className="text-neutral-500">No logs yet.</div>
            ) : logs.map((l) => (
              <div key={l.id} className="py-0.5">
                <span className="text-neutral-500">[{new Date(l.created_at).toLocaleTimeString()}]</span>{" "}
                <span className={l.level === "error" ? "text-rose-400" : l.level === "warning" ? "text-amber-400" : "text-emerald-300"}>
                  {l.level.toUpperCase()}
                </span>{" "}
                <span>{l.message}</span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="summary" className="m-0 p-5">
          <pre className="font-mono text-xs bg-neutral-50 p-4 overflow-x-auto" data-testid="summary-json">
            {JSON.stringify(run.summary || {}, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
