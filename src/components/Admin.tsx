import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus, Pencil, Trash2, Key, X, Check, Search } from 'lucide-react';
import { ROLES } from '@/lib/plantConfig';

interface UserRecord {
  id: string; name: string; username: string; email?: string; role: string; createdAt?: string; plainPassword?: string;
}

// ─── User Management ─────────────────────────────────────────────
export function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [passwordUserName, setPasswordUserName] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'operator' });
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user-management/list');
      const data = await res.json();
      setUsers(data.items || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const resetForm = () => {
    setForm({ name: '', username: '', email: '', password: '', role: 'operator' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password || !form.role) {
      showError('All fields are required.');
      return;
    }
    try {
      const res = await fetch('/api/user-management/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) { showError(data.error); return; }
      showSuccess(`✅ User "${form.name}" created successfully`);
      resetForm();
      fetchUsers();
    } catch { showError('Failed to create user.'); }
  };

  const handleEdit = (user: UserRecord) => {
    setForm({ name: user.name, username: user.username, email: user.email || '', password: '', role: user.role });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!form.name || !form.username || !form.role) {
      showError('Name, username, and role are required.');
      return;
    }
    try {
      const res = await fetch(`/api/user-management/update/${editingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, username: form.username, email: form.email, role: form.role }),
      });
      const data = await res.json();
      if (!data.ok) { showError(data.error); return; }
      showSuccess(`✅ User updated successfully`);
      resetForm();
      fetchUsers();
    } catch { showError('Failed to update user.'); }
  };

  const handleDelete = async (user: UserRecord) => {
    if (!confirm(`Delete user "${user.name}" (${user.username})? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/user-management/delete/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) { showError(data.error); return; }
      showSuccess(`✅ User "${user.name}" deleted`);
      fetchUsers();
    } catch { showError('Failed to delete user.'); }
  };

  const openPasswordDialog = (user: UserRecord) => {
    setPasswordUserId(user.id);
    setPasswordUserName(user.name);
    setPwForm({ newPassword: '', confirmPassword: '' });
    setShowPasswordDialog(true);
  };

  const handleChangePassword = async () => {
    if (!pwForm.newPassword) { showError('New password is required.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { showError('Passwords do not match.'); return; }
    if (pwForm.newPassword.length < 6) { showError('Password must be at least 6 characters.'); return; }
    try {
      const res = await fetch(`/api/user-management/change-password/${passwordUserId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!data.ok) { showError(data.error); return; }
      showSuccess(`✅ Password changed for "${passwordUserName}"`);
      setShowPasswordDialog(false);
    } catch { showError('Failed to change password.'); }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700',
    supervisor: 'bg-blue-50 text-blue-700',
    manager: 'bg-purple-50 text-purple-700',
    operator: 'bg-green-50 text-green-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Create, edit, and manage system users</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{successMsg}</div>}
      {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">{errorMsg}</div>}

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingId ? 'Edit User' : 'Add New User'}</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Full Name *</label>
              <Input placeholder="e.g. John Ahmed" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Username *</label>
              <Input placeholder="e.g. john123" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                disabled={!!editingId} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Email (optional)</label>
              <Input type="email" placeholder="user@ipak.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">{editingId ? 'New Password (blank = keep)' : 'Password *'}</label>
              <Input type="password" placeholder={editingId ? 'Leave blank to keep current' : 'Min 6 characters'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white">
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={editingId ? handleUpdate : handleCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-1" /> {editingId ? 'Update User' : 'Create User'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" /> Change Password — {passwordUserName}
            </h3>
            <button onClick={() => setShowPasswordDialog(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl">
            <div>
              <label className="text-xs font-medium text-slate-600">New Password *</label>
              <Input type="password" placeholder="Min 6 characters" value={pwForm.newPassword}
                onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Confirm Password *</label>
              <Input type="password" placeholder="Re-enter password" value={pwForm.confirmPassword}
                onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleChangePassword} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Key className="w-4 h-4 mr-1" /> Update Password
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            </div>
          </div>
          {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
            <p className="text-xs text-red-500 mt-2">Passwords do not match</p>
          )}
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <div className="p-3 border-b border-slate-200 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search by name, username, or role..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <span className="text-xs text-slate-400">{filteredUsers.length} users</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-xs font-medium text-slate-500">Name</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Username</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Password</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Role</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Created</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-medium">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{user.username}</td>
                    <td className="p-3 text-xs font-mono">
                      {user.plainPassword ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600">
                            {revealedPasswords.has(user.id)
                              ? user.plainPassword
                              : '••••••••'
                            }
                          </span>
                          <button
                            onClick={() => {
                              const next = new Set(revealedPasswords);
                              if (next.has(user.id)) next.delete(user.id);
                              else next.add(user.id);
                              setRevealedPasswords(next);
                            }}
                            className="p-0.5 hover:bg-slate-100 rounded"
                            title={revealedPasswords.has(user.id) ? 'Hide' : 'Reveal'}
                          >
                            {revealedPasswords.has(user.id) ? '🙈' : '👁️'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${roleColors[user.role] || 'bg-slate-100 text-slate-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => handleEdit(user)}
                          title="Edit user"
                          className="p-1.5 hover:bg-slate-100 rounded">
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button onClick={() => openPasswordDialog(user)}
                          title="Change password"
                          className="p-1.5 hover:bg-amber-50 rounded">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                        <button onClick={() => handleDelete(user)}
                          title="Delete user"
                          className="p-1.5 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Permissions ─────────────────────────────────────────────────
import PermissionsManager from '@/components/PermissionsManager';

export function Permissions() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Permissions</h1>
        <p className="text-sm text-slate-500">Manage user permissions — role defaults + custom per-user overrides</p>
      </div>
      <PermissionsManager />
    </div>
  );
}

// ─── Audit Logs ──────────────────────────────────────────────────
export function AuditLogs() {
  interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    module: string;
    details?: string;
    reportName?: string;
    exportFormat?: string;
    createdAt: string;
  }
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (moduleFilter !== 'all') params.set('module', moduleFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch { setLogs([]); }
    setLoading(false);
  }, [moduleFilter, actionFilter]);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  const moduleColors: Record<string, string> = {
    production: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    dispatch: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    packing: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    targets: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    customers: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    admin: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    analytics: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    auth: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };

  const actionColors: Record<string, string> = {
    create: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    update: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    delete: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    'bulk-approve': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Logs</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Track all system activity — {total} total entries</p>
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mr-1">Module</label>
          <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
            className="h-8 px-2 text-sm border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-600">
            <option value="all">All Modules</option>
            <option value="production">Production</option>
            <option value="dispatch">Dispatch</option>
            <option value="packing">Packing</option>
            <option value="admin">Admin</option>
            <option value="analytics">Analytics</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mr-1">Action</label>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="h-8 px-2 text-sm border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-600">
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="bulk-approve">Bulk Approve</option>
          </select>
        </div>
        <span className="text-xs text-slate-400 ml-auto">{logs.length} of {total} entries</span>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-3 text-xs font-medium text-slate-500">Timestamp</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">User</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Action</th>
                <th className="text-left p-3 text-xs font-medium text-slate-500">Module</th>
                <th className="text-center p-3 text-xs font-medium text-slate-500">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No audit logs found.</td></tr>
              ) : (
                logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-medium">
                            {log.userName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{log.userName || 'System'}</p>
                            <p className="text-xs text-slate-400">ID: {log.userId?.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${moduleColors[log.module] || 'bg-slate-100 text-slate-600'}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-400 font-mono">-</td>
                      <td className="p-3 text-center">
                        <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="text-xs text-blue-600 hover:underline">
                          {expandedId === log.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="bg-slate-50 dark:bg-slate-800/30">
                        <td colSpan={5} className="p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div><span className="font-medium text-slate-500">Module:</span> {log.module}</div>
                            <div><span className="font-medium text-slate-500">Action:</span> {log.action}</div>
                            <div className="col-span-2">
                              <span className="font-medium text-slate-500">Details:</span>
                              <pre className="mt-1 p-2 bg-white dark:bg-slate-900 rounded text-xs overflow-x-auto max-h-40">
                                {log.details || 'No details'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
