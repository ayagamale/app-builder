"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Route as RouteIcon, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Rule { id: string; name: string; model_id: string; model_name: string; provider_name: string; priority: number; is_active: boolean; }
interface Model { id: string; name: string; }

export default function RoutingPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", model_id: "", priority: 100 });

  const fetchAll = () => {
    Promise.all([fetch("/api/admin/routing").then(r => r.json()), fetch("/api/admin/models").then(r => r.json())])
      .then(([r, m]) => { if (r.ok) setRules(r.data); if (m.ok) setModels(m.data); if (m.ok && !form.model_id) setForm(f => ({ ...f, model_id: m.data[0]?.id || "" })); })
      .finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const handleAdd = async () => {
    const res = await fetch("/api/admin/routing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.ok) { toast.success("Routing rule added"); setShowAdd(false); setForm({ name: "", model_id: models[0]?.id || "", priority: 100 }); fetchAll(); }
    else toast.error(data.error || "Failed");
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Routing</h1><p className="text-sm text-gray-500 mt-1">Configure which models are selected and in what order</p></div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 hover:bg-gray-800"><Plus className="w-4 h-4 mr-1.5" /> Add Rule</Button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rule name" className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200" />
          <select value={form.model_id} onChange={e => setForm({ ...form, model_id: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200">
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} placeholder="Priority" className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200" />
          <Button onClick={handleAdd} className="bg-gray-900 hover:bg-gray-800">Add Rule</Button>
        </div>
      )}
      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <RouteIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex-1"><h3 className="font-medium text-sm text-gray-900">{r.name}</h3><p className="text-xs text-gray-500">{r.provider_name} / {r.model_name} · Priority: {r.priority}</p></div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{r.is_active ? "Active" : "Disabled"}</span>
          </div>
        ))}
        {rules.length === 0 && <p className="text-center text-gray-400 py-12">No routing rules. Models are used by priority order by default.</p>}
      </div>
    </div>
  );
}
