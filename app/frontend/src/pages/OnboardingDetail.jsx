import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError, API_BASE } from "../lib/api";
import { toast } from "sonner";
import StatusPill from "../components/StatusPill";
import { Button } from "../components/ui/button";
import { CheckCircle, Circle, ShareNetwork, ArrowLeft, Sparkle, Database, ArrowsLeftRight, Stack } from "@phosphor-icons/react";

function PublicView({ data }) {
  const { stats, checklist, progress, is_complete } = data;
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">Onboarding Report</div>
        <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tighter mt-2">
          {data.customer_name}
        </h1>
        <div className="font-display text-xl text-neutral-500 mt-2">{data.name}</div>

        {is_complete && (
          <div className="mt-8 bg-emerald-50 border border-emerald-500 p-6 flex items-center gap-4" data-testid="success-banner">
            <CheckCircle size={32} weight="fill" className="text-emerald-600 shrink-0" />
            <div>
              <div className="font-display text-2xl font-bold">Migration successful</div>
              <div className="text-sm text-emerald-800 mt-1">
                {stats.successful} records migrated to the canonical billing schema · {stats.success_rate}% success rate.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {[
            { label: "Progress", value: `${progress}%`, accent: "#09090b" },
            { label: "Records Migrated", value: stats.successful, accent: "#10b981" },
            { label: "Total Processed", value: stats.total_records, accent: "#09090b" },
            { label: "Success Rate", value: `${stats.success_rate}%`, accent: "#2563eb" },
          ].map((s) => (
            <div key={s.label} className="border border-neutral-200 bg-white p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">{s.label}</div>
              <div className="font-display text-3xl font-black mt-2" style={{ color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 border border-neutral-200 bg-white p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">Onboarding Checklist</div>
          <div className="mt-4 space-y-3">
            {checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-3" data-testid={`checklist-step-${i}`}>
                {c.done
                  ? <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0" />
                  : <Circle size={20} className="text-neutral-300 shrink-0" />}
                <div className="flex-1">
                  <div className={`text-sm ${c.done ? "text-neutral-900 font-medium" : "text-neutral-400"}`}>{c.step}</div>
                </div>
                <div className="font-mono text-xs text-neutral-500">{c.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-6">
          <div className="border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              <Database size={12} weight="duotone" /> Sources ({data.sources.length})
            </div>
            <div className="mt-3 space-y-1.5">
              {data.sources.map((s) => (
                <div key={s.id} className="text-xs flex justify-between">
                  <span className="truncate">{s.name}</span>
                  <span className="font-mono text-neutral-500 ml-2">{s.row_count}</span>
                </div>
              ))}
              {data.sources.length === 0 && <div className="text-xs text-neutral-400">—</div>}
            </div>
          </div>
          <div className="border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              <ArrowsLeftRight size={12} weight="duotone" /> Mappings ({data.mappings.length})
            </div>
            <div className="mt-3 space-y-1.5">
              {data.mappings.map((m) => (
                <div key={m.id} className="text-xs flex justify-between">
                  <span className="truncate">{m.name}</span>
                  <span className="font-mono text-neutral-500 ml-2">{m.fields_mapped} fields</span>
                </div>
              ))}
              {data.mappings.length === 0 && <div className="text-xs text-neutral-400">—</div>}
            </div>
          </div>
          <div className="border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              <Stack size={12} weight="duotone" /> Runs ({data.runs.length})
            </div>
            <div className="mt-3 space-y-1.5">
              {data.runs.map((r) => (
                <div key={r.id} className="text-xs flex justify-between items-center">
                  <span className="truncate">{r.name}</span>
                  <StatusPill status={r.status} />
                </div>
              ))}
              {data.runs.length === 0 && <div className="text-xs text-neutral-400">—</div>}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-200 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-400 flex items-center justify-between">
          <span>Generated by Billing Migration Studio</span>
          <span>{new Date(data.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingDetail({ publicMode = false }) {
  const params = useParams();
  const id = publicMode ? params.token : params.id;
  const [data, setData] = useState(null);

  const load = () => {
    const endpoint = publicMode ? `/onboarding/public/${id}` : `/onboarding/projects/${id}`;
    api.get(endpoint).then((r) => setData(r.data)).catch(() => setData(false));
  };
  useEffect(() => { load(); }, [id]);

  if (data === false) return <div className="p-12 text-center text-rose-700">Project not found.</div>;
  if (!data) return <div className="h-40 bg-neutral-100 animate-pulse" />;

  if (publicMode) return <PublicView data={data} />;

  const shareUrl = `${window.location.origin}/share/${data.share_token}`;
  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied");
  };

  return (
    <div className="space-y-6" data-testid="project-detail">
      <div>
        <Link to="/onboarding" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={12} /> Back
        </Link>
        <div className="flex items-end justify-between mt-2 flex-wrap gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">{data.customer_name}</div>
            <h1 className="font-display text-4xl font-black tracking-tighter mt-1">{data.name}</h1>
            <p className="text-sm text-neutral-500 mt-1 max-w-xl">{data.description || "No description"}</p>
          </div>
          <Button onClick={copyShare} data-testid="copy-share-button" className="bg-neutral-900 text-white rounded-md">
            <ShareNetwork size={14} weight="bold" className="mr-2" /> Copy Share Link
          </Button>
        </div>
      </div>
      <div className="bg-neutral-50 border border-neutral-200 p-3 font-mono text-xs flex items-center gap-2">
        <Sparkle size={14} weight="duotone" />
        <span className="text-neutral-500">Public URL:</span>
        <a href={`/share/${data.share_token}`} target="_blank" rel="noreferrer" className="underline truncate">
          /share/{data.share_token}
        </a>
      </div>
      <PublicView data={data} />
    </div>
  );
}
