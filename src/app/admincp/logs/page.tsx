"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";

interface LogEntry {
  id: string; action: string; outcome: string; reason: string | null;
  entity_type: string | null; entity_id: string | null; user_email: string | null;
  created_at: string; metadata: Record<string, unknown> | null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = () => {
    const qs = actionFilter ? `?action=${encodeURIComponent(actionFilter)}` : "";
    fetch(`/api/admin/logs${qs}`).then(r => r.json()).then(d => { if (d.ok) setLogs(d.data); }).finally(() => setLoading(false));
  };
  useEffect(fetchLogs, [actionFilter]);

  const outcomeColor = (o: string) => o === "success" ? "bg-emerald-500" : o === "failure" ? "bg-red-500" : "bg-blue-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">All system events — secrets are never logged</p>
      </div>

      <div className="flex gap-2">
        <input value={actionFilter} onChange={e => setActionFilter(e.target.value)} placeholder="Filter by action..." className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-200 bg-white" />
        <button onClick={() => setActionFilter("")} className="text-xs text-gray-500 hover:text-gray-700 px-3">Clear</button>
      </div>

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 text-sm hover:bg-gray-50/50">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${outcomeColor(log.outcome)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-gray-700">{log.action}</span>
                    <span className="text-[10px] text-gray-400">{log.outcome}</span>
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
