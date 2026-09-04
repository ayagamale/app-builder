"use client";

import { Shield, Lock, Eye, KeyRound } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Security</h1><p className="text-sm text-gray-500 mt-1">Platform security settings</p></div>
      <div className="grid gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Lock className="w-5 h-5 text-emerald-600" /></div><div><h3 className="font-medium text-gray-900">API Key Encryption</h3><p className="text-xs text-gray-500">AES-256-GCM encryption at rest</p></div></div>
          <p className="text-sm text-gray-600">All API keys are encrypted with AES-256-GCM before storage. Keys are never sent to the browser, never logged, and displayed only as masked suffixes.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><KeyRound className="w-5 h-5 text-blue-600" /></div><div><h3 className="font-medium text-gray-900">Authentication</h3><p className="text-xs text-gray-500">JWT-based session management</p></div></div>
          <p className="text-sm text-gray-600">Sessions are managed via httpOnly cookies with JWT tokens. Passwords are hashed with bcrypt. Role-based access control (RBAC) gates all admin operations.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><Eye className="w-5 h-5 text-purple-600" /></div><div><h3 className="font-medium text-gray-900">Audit Trail</h3><p className="text-xs text-gray-500">All sensitive actions are logged</p></div></div>
          <p className="text-sm text-gray-600">Every provider/model/key selection, switch, failure, and admin action is recorded in the audit log — without ever logging secret values.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Shield className="w-5 h-5 text-amber-600" /></div><div><h3 className="font-medium text-gray-900">RBAC Roles</h3><p className="text-xs text-gray-500">Three-tier role hierarchy</p></div></div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">super_admin</span><span className="text-gray-600">Full control including security settings and role assignment</span></div>
            <div className="flex items-center gap-2"><span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">admin</span><span className="text-gray-600">Manage providers, models, keys, routing, logs, users</span></div>
            <div className="flex items-center gap-2"><span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">user</span><span className="text-gray-600">Create and manage own projects</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
