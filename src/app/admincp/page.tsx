"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { Server, Cpu, KeyRound, Users, FolderKanban, AlertCircle, CheckCircle2, XCircle, Activity } from "lucide-react";

interface DashboardData {
  counts: {
    users: number; projects: number; providers: number; models: number;
    apiKeys: number; activeApiKeys: number; errorApiKeys: number; totalLogs: number;
  };
  rates: { success: number; failure: number };
  modelStats: { model_name: string; provider_name: string; total: string; success: string; failed: string }[];
  recentLogs: { action: string; outcome: string; created_at: string }[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (!data) return <p className="text-gray-400">No data</p>;

  const stats = [
    { label: "Users", value: data.counts.users, icon: Users, color: "text-blue-600" },
    { label: "Projects", value: data.counts.projects, icon: FolderKanban, color: "text-purple-600" },
    { label: "Providers", value: data.counts.providers, icon: Server, color: "text-indigo-600" },
    { label: "Models", value: data.counts.models, icon: Cpu, color: "text-cyan-600" },
    { label: "API Keys", value: data.counts.apiKeys, icon: KeyRound, color: "text-amber-600" },
    { label: "Active Keys", value: data.counts.activeApiKeys, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Error Keys", value: data.counts.errorApiKeys, icon: AlertCircle, color: "text-red-600" },
    { label: "Total Logs", value: data.counts.totalLogs, icon: Activity, color: "text-gray-600" },
  ];

  const totalReqs = data.rates.success + data.rates.failure;
  const successRate = totalReqs > 0 ? Math.round((data.rates.success / totalReqs) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview — welcome, {user?.email}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Success rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Request Success Rate</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${successRate}%` }} />
            </div>
          </div>
          <span className="text-lg font-bold text-gray-900">{successRate}%</span>
        </div>
        <div className="flex gap-6 mt-3 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> {data.rates.success} success</span>
          <span className="flex items-center gap-1.5 text-red-600"><XCircle className="w-4 h-4" /> {data.rates.failure} failures</span>
        </div>
      </div>

      {/* Model consumption */}
      {data.modelStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Model Consumption</h2>
          <div className="space-y-2">
            {data.modelStats.map((m) => (
              <div key={`${m.provider_name}-${m.model_name}`} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                <span className="font-medium text-gray-700">{m.provider_name} / {m.model_name}</span>
                <div className="flex gap-4 text-xs">
                  <span className="text-gray-500">{m.total} keys</span>
                  <span className="text-emerald-600">{m.success} active</span>
                  <span className="text-red-600">{m.failed} error</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent logs */}
      {data.recentLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h2>
          <div className="space-y-1.5">
            {data.recentLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1">
                <span className={`w-2 h-2 rounded-full ${log.outcome === "success" ? "bg-emerald-500" : log.outcome === "failure" ? "bg-red-500" : "bg-blue-500"}`} />
                <span className="font-mono text-xs text-gray-600 flex-1">{log.action}</span>
                <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
