"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Cpu, Power } from "lucide-react";
import { toast } from "sonner";

interface Model { id: string; provider_id: string; name: string; display_name: string | null; is_active: boolean; priority: number; max_tokens: number | null; temperature: number | null; }
interface Provider { id: string; name: string; }

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ provider_id: "", name: "", display_name: "", max_tokens: "", temperature: "", priority: 100 });
  const [saving, setSaving] = useState(false);

  const fetchAll = () => {
    Promise.all([fetch("/api/admin/models").then(r => r.json()), fetch("/api/admin/providers").then(r => r.json())])
      .then(([m, p]) => { if (m.ok) setModels(m.data); if (p.ok) setProviders(p.data); if (p.ok && !form.provider_id) setForm(f => ({ ...f, provider_id: p.data[0]?.id || "" })); })
      .finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, max_tokens: form.max_tokens ? parseInt(form.max_tokens) : null, temperature: form.temperature ? parseFloat(form.temperature) : null }) });
    const data = await res.json();
    if (data.ok) { toast.success("Model added"); setShowAdd(false); setForm({ provider_id: providers[0]?.id || "", name: "", display_name: "", max_tokens: "", temperature: "", priority: 100 }); fetchAll(); }
    else toast.error(data.error || "Failed");
    setSaving(false);
  };

  const handleToggle = async (m: Model) => {
    await fetch(`/api/admin/models/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !m.is_active }) });
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this model and all its API keys?")) return;
    await fetch(`/api/admin/models/${id}`, { method: "DELETE" });
    toast.success("Model deleted"); fetchAll();
  };

  const providerName = (id: string) => providers.find(p => p.id === id)?.name || "?";

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Models</h1><p className="text-sm text-gray-500 mt-1">Manage AI models under each provider</p></div>
        <Button onClick={() => setShowAdd(true)} className="bg-gray-900 hover:bg-gray-800" disabled={providers.length === 0}><Plus className="w-4 h-4 mr-1.5" /> Add Model</Button>
      </div>
      {providers.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">Add a provider first.</p>}

      <div className="space-y-2">
        {models.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><Cpu className="w-5 h-5 text-gray-500" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{m.display_name || m.name}</h3>
                <span className="text-[10px] text-gray-400 font-mono">{m.name}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${m.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{m.is_active ? "Active" : "Disabled"}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{providerName(m.provider_id)} · Priority: {m.priority}{m.max_tokens ? ` · Max tokens: ${m.max_tokens}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => handleToggle(m)}><Power className="w-3.5 h-3.5 mr-1" />{m.is_active ? "Disable" : "Enable"}</Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
        {models.length === 0 && <p className="text-center text-gray-400 py-12">No models configured.</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Model</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label>Provider</Label>
              <select value={form.provider_id} onChange={e => setForm({ ...form, provider_id: e.target.value })} className="w-full mt-1.5 h-9 rounded-md border border-gray-200 px-3 text-sm">
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><Label>Model Name (API identifier)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="gpt-4o" className="mt-1.5" /></div>
            <div><Label>Display Name</Label><Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="GPT-4o" className="mt-1.5" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Max Tokens</Label><Input type="number" value={form.max_tokens} onChange={e => setForm({ ...form, max_tokens: e.target.value })} placeholder="4096" className="mt-1.5" /></div>
              <div><Label>Temperature</Label><Input type="number" step="0.1" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} placeholder="0.7" className="mt-1.5" /></div>
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} className="mt-1.5" /></div>
            </div>
            <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={handleAdd} disabled={saving || !form.name || !form.provider_id}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Add Model"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
