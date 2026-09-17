"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminUserRow = {
  user_id: string;
  name: string | null;
  photos: string[] | null;
  role: "user" | "moderator" | "admin" | "super_admin";
  account_status: "active" | "deactivated" | "deleted";
  is_verified: boolean;
  is_premium: boolean;
  created_at: string;
};

const ROLE_OPTIONS = ["user", "moderator", "admin", "super_admin"] as const;
const STATUS_OPTIONS = ["active", "deactivated", "deleted"] as const;

export default function UsersClient({
  myUserId,
  myRole,
  initialUsers,
}: {
  myUserId: string;
  myRole: "admin" | "super_admin" | "moderator";
  initialUsers: AdminUserRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canChangeRoles = myRole === "super_admin";
  const canChangeStatus = myRole === "admin" || myRole === "super_admin";

  const filtered = useMemo(() => {
    if (!search) return users;
    return users.filter((u) => (u.name ?? "").toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);

  async function handleRoleChange(userId: string, newRole: string) {
    setBusyId(userId);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("admin_update_user_role", {
      p_target_user_id: userId,
      p_new_role: newRole,
    });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole as AdminUserRow["role"] } : u)));
  }

  async function handleStatusChange(userId: string, newStatus: string) {
    setBusyId(userId);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("admin_update_account_status", {
      p_target_user_id: userId,
      p_new_status: newStatus,
    });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, account_status: newStatus as AdminUserRow["account_status"] } : u))
    );
  }

  return (
    <main>
      <h1 className="font-display text-2xl font-bold text-foreground">User Management</h1>
      <p className="mt-1 text-sm text-foreground/60">{users.length} total members</p>

      {!canChangeRoles && (
        <p className="mt-2 text-xs text-foreground/50">
          Only a super admin can change roles. You can still update account status.
        </p>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name..."
        className="mt-4 w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-foreground/50">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Badges</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Account status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.user_id} className="border-b border-gray-50 last:border-0">
                <td className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                    {u.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.photos[0]} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <a href={`/admin/users/${u.user_id}`} className="font-medium text-brand-purple hover:underline">
                    {u.name || "Unnamed"}
                  </a>
                  {u.user_id === myUserId && <span className="text-xs text-foreground/40">(you)</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {u.is_verified && <span title="Verified">✓</span>}
                    {u.is_premium && <span title="Premium">★</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {canChangeRoles ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                      disabled={busyId === u.user_id}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs">{u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canChangeStatus ? (
                    <select
                      value={u.account_status}
                      onChange={(e) => handleStatusChange(u.user_id, e.target.value)}
                      disabled={busyId === u.user_id}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs">{u.account_status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
