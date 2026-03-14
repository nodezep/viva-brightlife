'use client';

import {useState} from 'react';

type UserRole = 'admin' | 'manager' | 'viewer';

type UserRow = {
  id: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

type Props = {
  initialUsers: UserRow[];
  initialAuditLogs?: AuditLog[];
};

type AuditLog = {
  id: string;
  actor_id: string;
  target_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function UserManagementModule({
  initialUsers,
  initialAuditLogs = []
}: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('manager');
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password, role})
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Failed to create user');
      setSaving(false);
      return;
    }

    if (result.user) {
      setUsers((current) => [result.user as UserRow, ...current]);
      setEmail('');
      setPassword('');
      setRole('manager');
      setSuccess('User created successfully.');
      void refreshAuditLogs();
    }

    setSaving(false);
  };

  const updateRole = async (userId: string, nextRole: UserRole) => {
    setError('');
    setSuccess('');
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userId, role: nextRole, action: 'role'})
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Failed to update role');
      return;
    }

    setUsers((current) =>
      current.map((user) => (user.id === userId ? {...user, role: nextRole} : user))
    );
    setSuccess('Role updated.');
    void refreshAuditLogs();
  };

  const toggleActive = async (userId: string, nextActive: boolean) => {
    setError('');
    setSuccess('');
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userId, isActive: nextActive, action: 'status'})
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Failed to update status');
      return;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? {...user, is_active: nextActive} : user
      )
    );
    setSuccess(nextActive ? 'User reactivated.' : 'User deactivated.');
    void refreshAuditLogs();
  };

  const submitPasswordReset = async (userId: string) => {
    setError('');
    setSuccess('');

    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userId, password: resetPassword, action: 'password'})
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Failed to reset password');
      return;
    }

    setResetPasswordFor(null);
    setResetPassword('');
    setSuccess('Password reset. Share it securely with the user.');
    void refreshAuditLogs();
  };

  const refreshAuditLogs = async () => {
    const response = await fetch('/api/admin/users/audit');
    if (!response.ok) {
      return;
    }
    const result = await response.json();
    if (result.logs) {
      setAuditLogs(result.logs as AuditLog[]);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Access Control</h1>
        <p className="text-sm text-muted-foreground">
          Create managers or viewers and control access without touching the database.
        </p>
      </div>

      <form
        onSubmit={createUser}
        className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            required
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="manager@company.co.tz"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Temporary Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Min 6 characters"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Role
          </label>
          <select
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="md:col-span-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create User'}
          </button>
          <p className="text-xs text-muted-foreground">
            Share the temporary password securely. The user can change it after login.
          </p>
        </div>
        {error ? (
          <p className="md:col-span-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="md:col-span-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-3 py-2">{user.email ?? '-'}</td>
                <td className="px-3 py-2 capitalize">{user.role}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      user.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-100'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {user.created_at ? user.created_at.split('T')[0] : '-'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                      value={user.role}
                      onChange={(event) =>
                        updateRole(user.id, event.target.value as UserRole)
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs"
                      onClick={() => {
                        setResetPasswordFor(user.id);
                        setResetPassword('');
                      }}
                    >
                      Reset Password
                    </button>
                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs"
                      onClick={() => toggleActive(user.id, !user.is_active)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  {resetPasswordFor === user.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        minLength={6}
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                        placeholder="New password (min 6 chars)"
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
                        onClick={() => submitPasswordReset(user.id)}
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs"
                        onClick={() => setResetPasswordFor(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                  No users found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-xs"
            onClick={() => void refreshAuditLogs()}
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-muted/70 text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">
                    {log.created_at ? log.created_at.replace('T', ' ').slice(0, 19) : '-'}
                  </td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.target_id ?? '-'}</td>
                  <td className="px-3 py-2">
                    {log.metadata ? JSON.stringify(log.metadata) : '-'}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                    No audit logs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
