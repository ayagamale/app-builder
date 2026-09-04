"use client";

import { useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => { if (d.ok) setSettings(d.data); }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (key: string, value: string) => {
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
    const data = await res.json();
    if (data.ok) toast.success("Setting saved"); else toast.error("Failed");
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">System Settings</h1><p className="text-sm text-gray-500 mt-1">General platform configuration</p></div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">{key}</label>
              <input defaultValue={value} onBlur={e => { if (e.target.value !== value) { setSettings({ ...settings, [key]: e.target.value }); handleSave(key, e.target.value); } }} className="w-full mt-1 h-9 px-3 text-sm rounded-lg border border-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
