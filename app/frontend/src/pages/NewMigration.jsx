import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { ArrowRight, Sparkle, FloppyDisk, Play, MagicWand } from "@phosphor-icons/react";

const NONE_VALUE = "__none__";

export default function NewMigration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sources, setSources] = useState([]);
  const [canonical, setCanonical] = useState([]);
  const [sourceId, setSourceId] = useState(searchParams.get("source") || "");
  const [sourceData, setSourceData] = useState(null);
  const [mappings, setMappings] = useState({});
  const [name, setName] = useState("New Migration");
  const [mode, setMode] = useState("dry_run");
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [running, setRunning] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    api.get("/sources").then((r) => setSources(r.data));
    api.get("/schema/canonical").then((r) => setCanonical(r.data.fields));
  }, []);

  useEffect(() => {
    if (!sourceId) { setSourceData(null); return; }
    api.get(`/sources/${sourceId}`).then((r) => {
      setSourceData(r.data);
      setMappings(r.data.suggested_mapping || {});
    });
  }, [sourceId]);

  const headers = sourceData?.headers || [];

  const updateMapping = (src, target) => {
    setMappings((m) => {
      const next = { ...m };
      if (!target || target === NONE_VALUE) delete next[src];
      else next[src] = target;
      return next;
    });
  };

  const handleValidate = async () => {
    if (!sourceId) return;
    setValidating(true);
    try {
      const { data } = await api.post("/validate", { source_id: sourceId, mappings });
      setValidation(data);
      toast.success(`Validated: ${data.valid} valid · ${data.invalid} invalid`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setValidating(false);
    }
  };

  const handleRun = async () => {
    if (!sourceId) return;
    setRunning(true);
    try {
      const { data } = await api.post("/migrations", {
        name, source_id: sourceId, mappings, mode,
      });
      toast.success(`Migration started (${mode})`);
      navigate(`/migrations/${data.id}`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setRunning(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { toast.error("Name required"); return; }
    try {
      await api.post("/mappings", {
        name: templateName.trim(),
        description: `From ${sourceData?.name || "source"}`,
        source_type: sourceData?.type || "csv",
        mappings,
      });
      toast.success("Saved mapping template");
      setSaveOpen(false);
      setTemplateName("");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const mappedCount = useMemo(() => Object.keys(mappings).length, [mappings]);

  return (
    <div className="space-y-6" data-testid="new-migration-page">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">New Migration</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Configure Mapping</h1>
        <p className="text-sm text-neutral-500 mt-1">Map source fields to the canonical billing schema, validate, then run.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="border border-neutral-200 bg-white p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-mono uppercase tracking-[0.2em]">Migration Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="migration-name-input" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-mono uppercase tracking-[0.2em]">Data Source</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger data-testid="source-select" className="mt-1.5">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id} data-testid={`source-option-${s.id}`}>
                        {s.name} ({s.row_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-mono uppercase tracking-[0.2em]">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger data-testid="mode-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dry_run" data-testid="mode-dry-run">Dry Run (validate only)</SelectItem>
                    <SelectItem value="actual" data-testid="mode-actual">Actual (write records)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {sourceData && (
            <>
              <div className="border border-neutral-200 bg-white">
                <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">Field Mapping</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {mappedCount} of {headers.length} fields mapped
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setMappings(sourceData.suggested_mapping || {})}
                      data-testid="auto-map-button"
                      className="rounded-md border-neutral-300 text-xs h-8"
                    >
                      <MagicWand size={14} className="mr-1" weight="duotone" /> Auto-suggest
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSaveOpen((v) => !v)}
                      data-testid="save-template-toggle"
                      className="rounded-md border-neutral-300 text-xs h-8"
                    >
                      <FloppyDisk size={14} className="mr-1" weight="duotone" /> Save template
                    </Button>
                  </div>
                </div>
                {saveOpen && (
                  <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 flex gap-2 items-center">
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name (e.g. Stripe Standard)"
                      data-testid="template-name-input"
                      className="max-w-xs h-8"
                    />
                    <Button onClick={handleSaveTemplate} data-testid="save-template-submit" className="h-8 bg-neutral-900 text-white">Save</Button>
                  </div>
                )}
                <div className="divide-y divide-neutral-200">
                  {headers.map((h) => (
                    <div key={h} className="px-5 py-3 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                      <div>
                        <div className="font-mono text-sm">{h}</div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {(sourceData.inferred_schema?.[h]?.type || "string")}
                          {sourceData.inferred_schema?.[h]?.samples?.length > 0 && (
                            <span className="ml-2">e.g. {sourceData.inferred_schema[h].samples.slice(0, 2).join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-neutral-400" />
                      <Select
                        value={mappings[h] || NONE_VALUE}
                        onValueChange={(v) => updateMapping(h, v)}
                      >
                        <SelectTrigger data-testid={`map-select-${h}`} className="h-9">
                          <SelectValue placeholder="— Unmapped —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>— Unmapped —</SelectItem>
                          {canonical.map((f) => (
                            <SelectItem key={f} value={f} className="font-mono text-xs">{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <Tabs defaultValue="preview" className="border border-neutral-200 bg-white">
                <TabsList className="bg-neutral-50 border-b border-neutral-200 rounded-none p-0 h-auto w-full justify-start">
                  <TabsTrigger value="preview" data-testid="tab-preview" className="rounded-none px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 font-mono text-[11px] uppercase tracking-[0.2em]">Source Preview</TabsTrigger>
                  <TabsTrigger value="canonical" data-testid="tab-canonical" className="rounded-none px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 font-mono text-[11px] uppercase tracking-[0.2em]">Canonical Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="p-0 m-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-50">
                        <tr>
                          {headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(sourceData.preview || []).slice(0, 8).map((row, idx) => (
                          <tr key={idx} className="border-t border-neutral-100">
                            {headers.map((h) => (
                              <td key={h} className="px-3 py-2 font-mono">{String(row[h] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="canonical" className="p-5 m-0">
                  {validation?.preview ? (
                    <pre className="font-mono text-xs bg-neutral-50 p-4 overflow-x-auto max-h-96">
                      {JSON.stringify(validation.preview, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-sm text-neutral-500">Run validation to see canonical output.</div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <div className="border border-neutral-200 bg-white p-5 space-y-4 h-fit sticky top-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">Actions</div>
          <Button
            variant="outline"
            onClick={handleValidate}
            disabled={!sourceId || validating}
            data-testid="validate-button"
            className="w-full rounded-md border-neutral-300"
          >
            <Sparkle size={14} className="mr-2" weight="duotone" />
            {validating ? "Validating…" : "Validate"}
          </Button>
          <Button
            onClick={handleRun}
            disabled={!sourceId || running}
            data-testid="run-migration-button"
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-md"
          >
            <Play size={14} className="mr-2" weight="bold" />
            {running ? "Starting…" : mode === "actual" ? "Run Migration" : "Run Dry Run"}
          </Button>

          {validation && (
            <div className="pt-4 border-t border-neutral-200 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">Validation</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-neutral-200 p-2">
                  <div className="font-display text-2xl font-black">{validation.total}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Total</div>
                </div>
                <div className="border border-emerald-200 p-2 bg-emerald-50">
                  <div className="font-display text-2xl font-black text-emerald-700">{validation.valid}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-700">Valid</div>
                </div>
                <div className="border border-rose-200 p-2 bg-rose-50">
                  <div className="font-display text-2xl font-black text-rose-700">{validation.invalid}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-rose-700">Invalid</div>
                </div>
              </div>
              {validation.sample_errors?.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1" data-testid="validation-errors">
                  {validation.sample_errors.slice(0, 10).map((e, i) => (
                    <div key={i} className="text-[11px] font-mono p-2 bg-rose-50 border border-rose-200">
                      <div className="text-rose-800 font-semibold">Row {e.index + 1}</div>
                      <div className="text-rose-700">{e.errors.join(", ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
