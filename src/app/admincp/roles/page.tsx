"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, Shield, Lock } from "lucide-react";
import { toast } from "sonner";

interface Permission { id: string; key: string; description: string | null; category: string; }
interface Role { id: string; name: string; description: string | null; is_system: boolean; permissionIds: string[]; created_at: string; }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [updatingPerms, setUpdatingPerms] = useState(false);

  const fetchAll = () => {
    fetch("/api/admin/roles").then(r => r.json()).then(d => {
      if (d.ok) {
        setRoles(d.data.roles);
        setPermissions(d.data.permissions);
        if (!selectedRole && d.data.roles.length > 0) setSelectedRole(d.data.roles[0].id);
      }
    }).finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const currentRole = roles.find(r => r.id === selectedRole);

  const togglePermission = async (permId: string, checked: boolean) => {
    if (!currentRole) return;
    if (currentRole.is_system && currentRole.name === "super_admin") return;

    setUpdatingPerms(true);
    const newPerms = checked
      ? [...currentRole.permissionIds, permId]
      : currentRole.permissionIds.filter(p => p !== permId);

    const res = await fetch(`/api/admin/roles/${currentRole.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds: newPerms }),
    });
    const data = await res.json();
    if (data.ok) {
      setRoles(roles.map(r => r.id === currentRole.id ? { ...r, permissionIds: newPerms } : r));
    } else {
      toast.error(data.error || "Failed");
    }
    setUpdatingPerms(false);
  };

  const handleAdd = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRole),
    });
    const data = await res.json();
    if (data.ok) {
      toast.success("Role created");
      setShowAdd(false);
      setNewRole({ name: "", description: "" });
      fetchAll();
    } else toast.error(data.error || "Failed");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role? Users assigned to it will lose these permissions.")) return;
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      toast.success("Role deleted");
      if (selectedRole === id) setSelectedRole(null);
      fetchAll();
    } else toast.error(data.error || "Failed");
  };

  // Group permissions by category
  const categories = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage roles and their permissions</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-1.5" /> Add Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Role list */}
        <div className="space-y-2">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selectedRole === role.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="font-medium text-sm text-gray-900">{role.name}</span>
                {role.is_system && <Lock className="w-3 h-3 text-gray-400" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">{role.description || "No description"}</p>
              <p className="text-[10px] text-gray-400 mt-1">{role.permissionIds.length} permissions</p>
            </button>
          ))}
        </div>

        {/* Permission matrix */}
        <div className="md:col-span-2">
          {currentRole ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{currentRole.name}</h2>
                  <p className="text-xs text-gray-500">{currentRole.description || "No description"}</p>
                </div>
                {!currentRole.is_system && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(currentRole.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {currentRole.is_system && currentRole.name === "super_admin" && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                  Super admin always has all permissions and cannot be modified.
                </p>
              )}

              {updatingPerms && <div className="flex items-center gap-2 text-xs text-gray-400 mb-3"><Loader2 className="w-3 h-3 animate-spin" /> Updating...</div>}

              <div className="space-y-4">
                {Object.entries(categories).map(([cat, perms]) => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</h3>
                    <div className="space-y-2">
                      {perms.map(perm => {
                        const checked = currentRole.permissionIds.includes(perm.id);
                        const disabled = currentRole.is_system && currentRole.name === "super_admin";
                        return (
                          <label key={perm.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(v) => togglePermission(perm.id, v === true)}
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-700">{perm.key}</span>
                              {perm.description && <p className="text-xs text-gray-500">{perm.description}</p>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Select a role to manage its permissions
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Role</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-3">
            <div><Label>Name</Label><Input value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} placeholder="Editor" className="mt-1.5" /></div>
            <div><Label>Description</Label><Input value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="Can edit content but not settings" className="mt-1.5" /></div>
            <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={handleAdd} disabled={saving || !newRole.name}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
