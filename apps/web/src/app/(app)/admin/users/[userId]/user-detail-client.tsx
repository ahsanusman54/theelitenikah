"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ChatSummary = { chatId: string; otherName: string; createdAt: string };
export type ReportSummary = {
  id: string;
  otherName: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
};

type Message = { id: string; sender_id: string; content: string; message_type: string; sent_at: string };

const ROLE_OPTIONS = ["user", "moderator", "admin", "super_admin"] as const;
const STATUS_OPTIONS = ["active", "deactivated", "deleted"] as const;

function computeAge(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function UserDetailClient({
  userId,
  name,
  bio,
  photo,
  role: initialRole,
  accountStatus: initialStatus,
  isVerified,
  isPremium,
  isOnline,
  dateOfBirth,
  gender,
  country,
  city,
  joinedAt,
  lastActiveAt,
  stats,
  chats,
  reportsAgainst,
  reportsFiled,
}: {
  userId: string;
  name: string | null;
  bio: string | null;
  photo: string | null;
  role: string;
  accountStatus: string;
  isVerified: boolean;
  isPremium: boolean;
  isOnline: boolean;
  dateOfBirth: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  joinedAt: string;
  lastActiveAt: string | null;
  stats: { likesGiven: number; likesReceived: number; matches: number; visitsMade: number; visitsReceived: number };
  chats: ChatSummary[];
  reportsAgainst: ReportSummary[];
  reportsFiled: ReportSummary[];
}) {
  const [role, setRole] = useState(initialRole);
  const [accountStatus, setAccountStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  async function handleRoleChange(newRole: string) {
    setSaving(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_update_user_role", { p_target_user_id: userId, p_new_role: newRole });
    setSaving(false);
    if (error) setMessage(`Error: ${error.message}`);
    else setRole(newRole);
  }

  async function handleStatusChange(newStatus: string) {
    setSaving(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_update_account_status", { p_target_user_id: userId, p_new_status: newStatus });
    setSaving(false);
    if (error) setMessage(`Error: ${error.message}`);
    else setAccountStatus(newStatus);
  }

  async function toggleChat(chatId: string) {
    if (openChatId === chatId) {
      setOpenChatId(null);
      return;
    }
    setOpenChatId(chatId);
    setLoadingChat(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, message_type, sent_at")
      .eq("chat_id", chatId)
      .order("sent_at", { ascending: true });
    setChatMessages((data ?? []) as Message[]);
    setLoadingChat(false);
  }

  const age = computeAge(dateOfBirth);

  return (
    <div>
      <a href="/admin/users" className="text-sm text-brand-purple hover:underline">← Back to Users</a>

      <div className="mt-3 flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm sm:flex-row">
        <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            {name || "Unnamed"}
            {isVerified && <span className="text-green-600">✓</span>}
            {isPremium && <span className="text-blue-500">★</span>}
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`} />
          </h1>
          <p className="text-sm text-foreground/60">
            {[age, gender, city, country].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-foreground/40">
            Joined {new Date(joinedAt).toLocaleDateString()}
            {lastActiveAt && ` · Last active ${new Date(lastActiveAt).toLocaleString()}`}
          </p>
          {bio && <p className="mt-3 text-sm text-foreground/80">{bio}</p>}
          <a href={`/profile/${userId}`} className="mt-2 inline-block text-sm text-brand-purple hover:underline">
            View public profile →
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-foreground">Role</h2>
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-foreground">Account status</h2>
          <select
            value={accountStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Likes sent", value: stats.likesGiven },
          { label: "Likes received", value: stats.likesReceived },
          { label: "Matches", value: stats.matches },
          { label: "Profiles viewed", value: stats.visitsMade },
          { label: "Profile views received", value: stats.visitsReceived },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-foreground/50">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-display text-base font-semibold text-foreground">Conversations ({chats.length})</h2>
        <p className="mt-1 text-xs text-foreground/40">
          Message content is only readable by admin/moderator accounts, for investigating reports.
        </p>
        <div className="mt-3 flex flex-col divide-y divide-gray-100">
          {chats.length === 0 && <p className="py-3 text-sm text-foreground/50">No conversations.</p>}
          {chats.map((c) => (
            <div key={c.chatId} className="py-2">
              <button onClick={() => toggleChat(c.chatId)} className="flex w-full items-center justify-between text-left text-sm">
                <span className="font-medium">With {c.otherName}</span>
                <span className="text-brand-purple">{openChatId === c.chatId ? "Hide" : "View messages"}</span>
              </button>
              {openChatId === c.chatId && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-3">
                  {loadingChat ? (
                    <p className="text-xs text-foreground/50">Loading...</p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-xs text-foreground/50">No messages yet.</p>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className="mb-2 text-xs">
                        <span className="font-semibold text-foreground/70">
                          {m.sender_id === userId ? name || "This user" : c.otherName}:
                        </span>{" "}
                        <span className="text-foreground/60">
                          {m.message_type === "text" ? m.content : `[${m.message_type}]`}
                        </span>
                        <span className="ml-2 text-foreground/30">{new Date(m.sent_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-foreground">
            Reports against this user ({reportsAgainst.length})
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {reportsAgainst.length === 0 && <p className="text-sm text-foreground/50">None.</p>}
            {reportsAgainst.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <p className="font-medium">{r.reason}</p>
                <p className="text-xs text-foreground/50">
                  By {r.otherName} · {r.status} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-base font-semibold text-foreground">
            Reports filed by this user ({reportsFiled.length})
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {reportsFiled.length === 0 && <p className="text-sm text-foreground/50">None.</p>}
            {reportsFiled.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <p className="font-medium">{r.reason}</p>
                <p className="text-xs text-foreground/50">
                  Against {r.otherName} · {r.status} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
