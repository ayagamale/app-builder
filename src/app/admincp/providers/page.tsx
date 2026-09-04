"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Server, Power } from "lucide-react";
import { toast } from "sonner";

interface Provider {
  id: string; name: string; base_url: string; auth_header_name: string;
  auth_header_prefix: string; compatibility_type: string; is_active: boolean; priority: number;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", base_url: "", auth_header_name: "Authorization", auth_header_prefix: "Bearer ", compatibility_type: "openai", priority: 100 });
  const [saving, setSaving] = useState(false);

  const fetchProviders = () => {
    fetch("/api/admin/providers").then(r => r.json()).then(d => { if (d.ok) setProviders(d.data); }).finally(() => setLoading(false));
  };
  useEffect(fetchProviders, []);

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.ok) { toast.success("Provider added"); setShowAdd(false); setForm({ name: "", base_url: "", auth_header_name: "Authorization", auth_header_prefix: "Bearer ", compatibility_type: "openai", priority: 100 }); fetchProviders(); }
    else toast.error(data.error || "Failed");
    setSaving(false);
  };

  const handleToggle = async (p: Provider) => {
    await fetch(`/api/admin/providers/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !p.is_active }) });
    fetchProviders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider and all its models and keys?")) return;
    await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
    toast.success("Provider deleted");
    fetchProviders();
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage AI provider endpoints</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-gray-900 hover:bg-gray-800"><Plus className="w-4 h-4 mr-1.5" /> Add Provider</Button>
      </div>

      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><Server className="w-5 h-5 text-gray-500" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{p.name}</h3>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{p.is_active ? "Active" : "Disabled"}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{p.compatibility_type}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{p.base_url}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Auth: {p.auth_header_name}: {p.auth_header_prefix}•••  ·  Priority: {p.priority}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => handleToggle(p)}><Power className="w-3.5 h-3.5 mr-1" />{p.is_active ? "Disable" : "Enable"}</Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
        {providers.length === 0 && <p className="text-center text-gray-400 py-12">No providers configured. Add one to get started.</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add AI Provider</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="OpenAI" className="mt-1.5" /></div>
            <div><Label>Base URL</Label><Input value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.openai.com" className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Auth Header</Label><Input value={form.auth_header_name} onChange={e => setForm({ ...form, auth_header_name: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Header Prefix</Label><Input value={form.auth_header_prefix} onChange={e => setForm({ ...form, auth_header_prefix: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Compatibility</Label>
                <select value={form.compatibility_type} onChange={e => setForm({ ...form, compatibility_type: e.target.value })} className="w-full mt-1.5 h-9 rounded-md border border-gray-200 px-3 text-sm">
                  <option value="openai">OpenAI-compatible</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} className="mt-1.5" /></div>
            </div>
            <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={handleAdd} disabled={saving || !form.name || !form.base_url}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Add Provider"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
