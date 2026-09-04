"use client";

import { useEffect, useState } from "react";
import { ScrollText, X } from "lucide-react";

interface LogEntry {
  id: string; action: string; outcome: string; reason: string | null;
  entity_type: string | null; entity_id: string | null; user_email: string | null;
  created_at: string; metadata: Record<string, unknown> | null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: "", outcome: "", entityType: "", dateFrom: "", dateTo: "" });

  const fetchLogs = () => {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.outcome) params.set("outcome", filters.outcome);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    const qs = params.toString();
    fetch(`/api/admin/logs${qs ? `?${qs}` : ""}`).then(r => r.json()).then(d => { if (d.ok) setLogs(d.data); }).finally(() => setLoading(false));
  };
  useEffect(fetchLogs, [filters]);

  const outcomeColor = (o: string) => o === "success" ? "bg-emerald-500" : o === "failure" ? "bg-red-500" : "bg-blue-500";
  const outcomeBadge = (o: string) => o === "success" ? "bg-emerald-50 text-emerald-700" : o === "failure" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700";

  const hasFilters = Object.values(filters).some(v => v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">All system events — secrets are never logged</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} placeholder="Action..." className="h-9 px-3 text-sm rounded-lg border border-gray-200" />
          <select value={filters.outcome} onChange={e => setFilters({ ...filters, outcome: e.target.value })} className="h-9 px-3 text-sm rounded-lg border border-gray-200">
            <option value="">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="info">Info</option>
          </select>
          <select value={filters.entityType} onChange={e => setFilters({ ...filters, entityType: e.target.value })} className="h-9 px-3 text-sm rounded-lg border border-gray-200">
            <option value="">All types</option>
            <option value="provider">Provider</option>
            <option value="model">Model</option>
            <option value="api_credential">API Credential</option>
            <option value="routing_rule">Routing Rule</option>
            <option value="fallback_rule">Fallback Rule</option>
            <option value="user">User</option>
            <option value="role">Role</option>
          </select>
          <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className="h-9 px-3 text-sm rounded-lg border border-gray-200" />
          <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className="h-9 px-3 text-sm rounded-lg border border-gray-200" />
        </div>
        {hasFilters && (
          <button onClick={() => setFilters({ action: "", outcome: "", entityType: "", dateFrom: "", dateTo: "" })} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Log entries */}
      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 text-sm hover:bg-gray-50/50">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${outcomeColor(log.outcome)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-gray-700">{log.action}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${outcomeBadge(log.outcome)}`}>{log.outcome}</span>
                  </div>
                  {log.reason && <p className="text-xs text-gray-500 mt-0.5">{log.reason}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    {log.user_email && <span>{log.user_email}</span>}
                    {log.entity_type && <span>{log.entity_type}: {log.entity_id?.slice(0, 8)}</span>}
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && <div className="flex flex-col items-center py-12 text-gray-400"><ScrollText className="w-8 h-8 mb-2 text-gray-300" /><p className="text-sm">No logs found</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
