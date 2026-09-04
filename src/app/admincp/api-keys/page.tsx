"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, KeyRound, Zap, Power } from "lucide-react";
import { toast } from "sonner";
import { DragDropList } from "@/components/admin/DragDropList";

interface ApiKey {
  id: string; model_id: string; label: string; key_suffix: string; status: string;
  priority: number; total_requests: number; successful_requests: number; failed_requests: number;
  last_error: string | null; last_used_at: string | null; cooldown_until: string | null;
}
interface Model { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700", disabled: "bg-gray-100 text-gray-500",
  rate_limited: "bg-amber-100 text-amber-700", quota_exhausted: "bg-red-100 text-red-700",
  invalid: "bg-red-100 text-red-700", error: "bg-red-100 text-red-700",
  cooling_down: "bg-yellow-100 text-yellow-700", suspended: "bg-gray-100 text-gray-500",
  testing: "bg-blue-100 text-blue-700", unknown: "bg-gray-100 text-gray-500",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500", disabled: "bg-gray-400",
  rate_limited: "bg-amber-500", quota_exhausted: "bg-red-500",
  invalid: "bg-red-500", error: "bg-red-500",
  cooling_down: "bg-yellow-500", suspended: "bg-gray-400",
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ model_id: "", label: "", api_key: "", priority: 100 });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const fetchAll = () => {
    Promise.all([fetch("/api/admin/api-keys").then(r => r.json()), fetch("/api/admin/models").then(r => r.json())])
      .then(([k, m]) => { if (k.ok) setKeys(k.data); if (m.ok) setModels(m.data); if (m.ok && !form.model_id) setForm(f => ({ ...f, model_id: m.data[0]?.id || "" })); })
      .finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.ok) { toast.success("API key added"); setShowAdd(false); setForm({ model_id: models[0]?.id || "", label: "", api_key: "", priority: 100 }); fetchAll(); }
    else toast.error(data.error || "Failed");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this API key?")) return;
    await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    toast.success("Key deleted"); fetchAll();
  };

  const handleToggle = async (k: ApiKey) => {
    const newStatus = k.status === "disabled" ? "active" : "disabled";
    await fetch(`/api/admin/api-keys/${k.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    fetchAll();
  };

  const handleHealthCheck = async (id: string) => {
    setChecking(id);
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.ok && data.data.success) toast.success(`Healthy — ${data.data.responseTimeMs}ms`);
    else toast.error(data.data?.error || "Health check failed");
    setChecking(null); fetchAll();
  };

  const handleReorder = (newOrder: ApiKey[]) => {
    setKeys(newOrder);
    const items = newOrder.map((k, i) => ({ id: k.id, priority: (i + 1) * 10 }));
    fetch("/api/admin/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "api_keys", items }) });
  };

  const modelName = (id: string) => models.find(m => m.id === id)?.name || "?";

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">API Credentials</h1><p className="text-sm text-gray-500 mt-1">Manage API keys — encrypted at rest, drag to reorder priority</p></div>
        <Button onClick={() => setShowAdd(true)} className="bg-gray-900 hover:bg-gray-800" disabled={models.length === 0}><Plus className="w-4 h-4 mr-1.5" /> Add Key</Button>
      </div>
      {models.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">Add a model first.</p>}

      <DragDropList items={keys} onReorder={handleReorder} renderItem={(k) => (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{k.label}</h3>
              <span className="text-[10px] font-mono text-gray-400">••••{k.key_suffix}</span>
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[k.status] || "bg-gray-400"}`} />
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[k.status] || STATUS_COLORS.unknown}`}>{k.status}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{modelName(k.model_id)} · Priority: {k.priority} · {k.successful_requests}/{k.total_requests} success</p>
            {k.cooldown_until && <p className="text-[10px] text-amber-600 mt-0.5">Cooldown until {new Date(k.cooldown_until).toLocaleString()}</p>}
            {k.last_error && <p className="text-[10px] text-red-500 mt-0.5 truncate">Last error: {k.last_error}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => handleHealthCheck(k.id)} disabled={checking === k.id}>
              {checking === k.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />} Test
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleToggle(k)}>
              <Power className="w-3.5 h-3.5 mr-1" />{k.status === "disabled" ? "Enable" : "Disable"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(k.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      )} />

      {keys.length === 0 && <p className="text-center text-gray-400 py-12">No API keys configured.</p>}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add API Key</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label>Model</Label>
              <select value={form.model_id} onChange={e => setForm({ ...form, model_id: e.target.value })} className="w-full mt-1.5 h-9 rounded-md border border-gray-200 px-3 text-sm">
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div><Label>Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Production key #1" className="mt-1.5" /></div>
            <div><Label>API Key</Label><Input type="password" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." className="mt-1.5 font-mono" /></div>
            <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} className="mt-1.5" /></div>
            <p className="text-xs text-gray-400">The key is encrypted with AES-256-GCM before storage and never shown again in full.</p>
            <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={handleAdd} disabled={saving || !form.api_key || !form.label || !form.model_id}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Add Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
