"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";

interface UserRow { id: string; email: string; role: string; is_active: boolean; created_at: string; }

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = () => { fetch("/api/admin/users").then(r => r.json()).then(d => { if (d.ok) setUsers(d.data); }).finally(() => setLoading(false)); };
  useEffect(fetchUsers, []);

  const updateRole = async (id: string, role: string) => {
    setUpdating(id);
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role }) });
    const data = await res.json();
    if (data.ok) toast.success("Role updated"); else toast.error(data.error || "Failed");
    setUpdating(null); fetchUsers();
  };

  const toggleActive = async (u: UserRow) => {
    setUpdating(u.id);
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, is_active: !u.is_active }) });
    const data = await res.json();
    if (data.ok) toast.success("User updated"); else toast.error(data.error || "Failed");
    setUpdating(null); fetchUsers();
  };

  const roleColor = (r: string) => r === "super_admin" ? "bg-purple-100 text-purple-700" : r === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Users</h1><p className="text-sm text-gray-500 mt-1">Manage user accounts and roles</p></div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><UsersIcon className="w-5 h-5 text-gray-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 text-sm">{u.email}</h3>
                  {u.id === currentUser?.id && <span className="text-[10px] text-gray-400">(you)</span>}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColor(u.role)}`}>{u.role}</span>
                  {!u.is_active && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">inactive</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {updating === u.id ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : (
                  <>
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} disabled={u.id === currentUser?.id} className="h-8 text-xs rounded-md border border-gray-200 px-2 disabled:opacity-50">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    {u.id !== currentUser?.id && <Button variant="outline" size="sm" onClick={() => toggleActive(u)}>{u.is_active ? "Deactivate" : "Activate"}</Button>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
