"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shuffle, Plus, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

interface Rule { id: string; name: string; from_model_id: string; to_model_id: string; from_model_name: string; to_model_name: string; priority: number; is_active: boolean; }
interface Model { id: string; name: string; }

export default function FallbackPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", from_model_id: "", to_model_id: "", priority: 100 });

  const fetchAll = () => {
    Promise.all([fetch("/api/admin/fallback").then(r => r.json()), fetch("/api/admin/models").then(r => r.json())])
      .then(([r, m]) => { if (r.ok) setRules(r.data); if (m.ok) setModels(m.data); })
      .finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const handleAdd = async () => {
    const res = await fetch("/api/admin/fallback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.ok) { toast.success("Fallback rule added"); setShowAdd(false); setForm({ name: "", from_model_id: "", to_model_id: "", priority: 100 }); fetchAll(); }
    else toast.error(data.error || "Failed");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/fallback/${id}`, { method: "DELETE" });
    toast.success("Rule deleted"); fetchAll();
  };

  const handleToggle = async (r: Rule) => {
    await fetch(`/api/admin/fallback/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !r.is_active }) });
    fetchAll();
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Fallback</h1><p className="text-sm text-gray-500 mt-1">Configure automatic model escalation when APIs fail</p></div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 hover:bg-gray-800"><Plus className="w-4 h-4 mr-1.5" /> Add Rule</Button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rule name" className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">From model</p>
              <select value={form.from_model_id} onChange={e => setForm({ ...form, from_model_id: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200">
                <option value="">Select...</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Fallback to</p>
              <select value={form.to_model_id} onChange={e => setForm({ ...form, to_model_id: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200">
                <option value="">Select...</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} placeholder="Priority" className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200" />
          <Button onClick={handleAdd} className="bg-gray-900 hover:bg-gray-800" disabled={!form.from_model_id || !form.to_model_id}>Add Rule</Button>
        </div>
      )}
      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <Shuffle className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-sm text-gray-900">{r.name}</h3>
              <p className="text-xs text-gray-500">{r.from_model_name} → {r.to_model_name} · Priority: {r.priority}</p>
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{r.is_active ? "Active" : "Disabled"}</span>
            <Button variant="outline" size="sm" onClick={() => handleToggle(r)}><Power className="w-3.5 h-3.5 mr-1" />{r.is_active ? "Disable" : "Enable"}</Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-center text-gray-400 py-12">No fallback rules. The system automatically falls back to the next model by priority when all keys for a model are exhausted.</p>}
      </div>
    </div>
  );
}
