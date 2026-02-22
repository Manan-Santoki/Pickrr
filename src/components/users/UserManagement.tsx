'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, Eye, MousePointerClick, RefreshCw, X, Tv } from 'lucide-react';
import type { AppUser } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const roleConfig = {
  admin: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20',
    desc: 'Full access — settings, users, approve/reject, select torrents',
  },
  selector: {
    label: 'Selector',
    icon: MousePointerClick,
    className: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
    desc: 'Can select and approve torrents, cannot manage settings or users',
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    className: 'bg-gray-700/60 text-gray-400 border border-gray-700',
    desc: 'Read-only — can browse requests and downloads but cannot take actions',
  },
};

function ProviderBadge({ provider }: { provider: 'local' | 'jellyfin' }) {
  if (provider === 'jellyfin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/20 text-purple-400 border border-purple-500/20" title="Jellyfin account">
        <Tv className="w-3 h-3" />
        Jellyfin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700/60 text-gray-500 border border-gray-700" title="Local account">
      Local
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg = roleConfig[role as keyof typeof roleConfig];
  if (!cfg) return <span className="text-gray-500 text-xs">{role}</span>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.username.length < 2) e.username = 'At least 2 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(form.username)) e.username = 'Only letters, numbers, _ and -';
    if (form.password.length < 6) e.password = 'At least 6 characters';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create user');
      toast.success(`User "${form.username}" created`);
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Create User</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="johndoe"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
            {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min. 6 characters"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Role</label>
            <div className="space-y-2">
              {Object.entries(roleConfig).map(([value, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <label
                    key={value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.role === value
                        ? 'border-indigo-500/40 bg-indigo-500/10'
                        : 'border-gray-800 hover:border-gray-700 bg-gray-900/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={form.role === value}
                      onChange={() => setForm((f) => ({ ...f, role: value }))}
                      className="mt-0.5 accent-indigo-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">{cfg.label}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{cfg.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create User
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserManagement() {
  const { data, isLoading, mutate } = useSWR<AppUser[]>('/api/users', fetcher);
  const [addOpen, setAddOpen] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const users = Array.isArray(data) ? data : [];

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      toast.success('Role updated');
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setChangingRole(null);
    }
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    setDeleting(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      toast.success(`Deleted "${user.username}"`);
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-900/60 border border-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(roleConfig).map(([value, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={value} className="p-3 rounded-xl bg-gray-900/60 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-300">{cfg.label}</span>
              </div>
              <p className="text-[10px] text-gray-600 leading-relaxed">{cfg.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="bg-gray-900/60 border border-white/5 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <p className="text-sm font-medium text-gray-300">{users.length} user{users.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add User
          </button>
        </div>

        {users.length === 0 ? (
          <div className="py-10 text-center text-gray-600">
            <p className="text-sm">No users yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-300 uppercase">
                    {user.username.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-200">{user.username}</p>
                    <ProviderBadge provider={user.provider ?? 'local'} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Created {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={changingRole === user.id}
                    className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="selector">Selector</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <RoleBadge role={user.role} />
                  {user.provider === 'jellyfin' ? (
                    <span
                      title="Manage password in Jellyfin"
                      className="p-1.5 text-gray-700 cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5 opacity-30" />
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deleting === user.id}
                      className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <AddUserModal
          onClose={() => setAddOpen(false)}
          onCreated={() => mutate()}
        />
      )}
    </div>
  );
}
