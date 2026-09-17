"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type BlockedProfile = {
  blockId: string;
  userId: string;
  name: string;
  photo: string | null;
};

type TabKey =
  | "general"
  | "email"
  | "social"
  | "visibility"
  | "photoPrivacy"
  | "exportData"
  | "blocked"
  | "removed"
  | "emailNotifications"
  | "pushNotifications";

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`h-6 w-11 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-300"} disabled:opacity-50`}
    >
      <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function SettingsClient({
  userId,
  email,
  initialVisibility,
  initialPhotoPrivacy,
  initialEmailNotifications,
  initialPushNotifications,
  initialBlocked,
}: {
  userId: string;
  email: string;
  initialVisibility: boolean;
  initialPhotoPrivacy: boolean;
  initialEmailNotifications: boolean;
  initialPushNotifications: boolean;
  initialBlocked: BlockedProfile[];
}) {
  const [tab, setTab] = useState<TabKey>("general");

  // General (password)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  // Toggles
  const [visibility, setVisibility] = useState(initialVisibility);
  const [photoPrivacy, setPhotoPrivacy] = useState(initialPhotoPrivacy);
  const [emailNotifications, setEmailNotifications] = useState(initialEmailNotifications);
  const [pushNotifications, setPushNotifications] = useState(initialPushNotifications);
  const [toggleSaving, setToggleSaving] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // Blocked
  const [blocked, setBlocked] = useState(initialBlocked);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords don't match.");
      return;
    }
    setPasswordSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordMessage(`Error: ${error.message}`);
    } else {
      setPasswordMessage("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailSaving(false);
    setEmailMessage(
      error ? `Error: ${error.message}` : "Confirmation link sent to your new email address."
    );
  }

  async function updateProfileField(field: string, value: boolean, setter: (v: boolean) => void) {
    setter(value);
    setToggleSaving(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("profiles").update({ [field]: value }).eq("user_id", userId);
    setToggleSaving(false);
  }

  async function handleExportData() {
    setExporting(true);
    const supabase = createSupabaseBrowserClient();

    const [profileRes, messagesRes, likesRes, matchesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("messages").select("*").eq("sender_id", userId),
      supabase.from("likes").select("*").eq("from_user", userId),
      supabase.from("matches").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: profileRes.data,
      messages_sent: messagesRes.data,
      likes_sent: likesRes.data,
      matches: matchesRes.data,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-theelitenikah-data.json";
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function handleUnblock(blockId: string) {
    setUnblockingId(blockId);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("blocks").delete().eq("id", blockId);
    setUnblockingId(null);
    if (!error) setBlocked((prev) => prev.filter((b) => b.blockId !== blockId));
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none";

  const NAV_SECTIONS: { title: string; items: { key: TabKey; label: string }[] }[] = [
    {
      title: "Account Settings",
      items: [
        { key: "general", label: "General" },
        { key: "email", label: "Email" },
        { key: "social", label: "Social Accounts" },
        { key: "visibility", label: "Profile Visibility" },
        { key: "photoPrivacy", label: "Photo privacy" },
        { key: "exportData", label: "Export Data" },
      ],
    },
    {
      title: "Privacy & Safety",
      items: [
        { key: "blocked", label: "Blocked Profiles" },
        { key: "removed", label: "Removed Profiles" },
      ],
    },
    {
      title: "Notifications",
      items: [
        { key: "emailNotifications", label: "Email notifications" },
        { key: "pushNotifications", label: "Push notifications" },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">{section.title}</p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${
                      tab === item.key ? "bg-brand-purple/10 font-semibold text-brand-purple" : "text-foreground/70 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {tab === "general" && (
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold text-foreground">General</h2>
              <p className="text-sm text-foreground/60">Signed in as {email}</p>
              <label className="text-sm font-medium text-foreground/80">
                New password
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground/80">
                Repeat new password
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} className={inputClass} />
              </label>
              {passwordMessage && <p className="text-sm text-foreground/70">{passwordMessage}</p>}
              <button type="submit" disabled={passwordSaving || !newPassword} className="self-start rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-60">
                {passwordSaving ? "Saving..." : "Change password"}
              </button>
            </form>
          )}

          {tab === "email" && (
            <form onSubmit={handleEmailChange} className="flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Email</h2>
              <p className="text-sm text-foreground/60">Current: {email}</p>
              <label className="text-sm font-medium text-foreground/80">
                New email address
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
              </label>
              {emailMessage && <p className="text-sm text-foreground/70">{emailMessage}</p>}
              <button type="submit" disabled={emailSaving || !newEmail} className="self-start rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-60">
                {emailSaving ? "Saving..." : "Update email"}
              </button>
            </form>
          )}

          {tab === "social" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Social Accounts</h2>
              <p className="mt-3 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Google and Facebook login aren&apos;t connected yet — that needs OAuth app credentials
                from each provider, which haven&apos;t been set up for this project. This page will let
                you link accounts once that&apos;s done.
              </p>
            </div>
          )}

          {tab === "visibility" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Profile Visibility</h2>
              <p className="mt-2 text-sm text-foreground/60">
                When off, your profile won&apos;t appear in Discover, Search, or Match for other members.
              </p>
              <label className="mt-4 flex items-center gap-3">
                <Toggle checked={visibility} disabled={toggleSaving} onChange={() => updateProfileField("visibility", !visibility, setVisibility)} />
                <span className="text-sm font-medium text-foreground/80">{visibility ? "Profile visible" : "Profile hidden"}</span>
              </label>
            </div>
          )}

          {tab === "photoPrivacy" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Photo privacy</h2>
              <p className="mt-2 text-sm text-foreground/60">
                When on, your photos are hidden from everyone except people you&apos;ve matched with.
              </p>
              <label className="mt-4 flex items-center gap-3">
                <Toggle checked={photoPrivacy} disabled={toggleSaving} onChange={() => updateProfileField("photo_privacy", !photoPrivacy, setPhotoPrivacy)} />
                <span className="text-sm font-medium text-foreground/80">
                  {photoPrivacy ? "Photos hidden from non-matches" : "Photos visible to everyone"}
                </span>
              </label>
            </div>
          )}

          {tab === "exportData" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Export Data</h2>
              <p className="mt-2 text-sm text-foreground/60">
                Download a copy of your profile, sent messages, likes, and matches as a JSON file.
              </p>
              <button onClick={handleExportData} disabled={exporting} className="mt-4 rounded-full bg-brand-purple px-6 py-2.5 font-semibold text-white hover:bg-brand-purple-light disabled:opacity-60">
                {exporting ? "Preparing..." : "Download my data"}
              </button>
            </div>
          )}

          {tab === "blocked" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Blocked Profiles</h2>
              {blocked.length === 0 ? (
                <p className="mt-3 text-sm text-foreground/60">You haven&apos;t blocked anyone.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {blocked.map((b) => (
                    <div key={b.blockId} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                        {b.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.photo} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <span className="flex-1 font-medium">{b.name}</span>
                      <button
                        onClick={() => handleUnblock(b.blockId)}
                        disabled={unblockingId === b.blockId}
                        className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "removed" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Removed Profiles</h2>
              <p className="mt-3 text-sm text-foreground/60">
                Passing on someone in Discover isn&apos;t saved anywhere — they can appear again later, and
                there&apos;s nothing to manage here. This section only has content if that changes.
              </p>
            </div>
          )}

          {tab === "emailNotifications" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Email notifications</h2>
              <p className="mt-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                No email provider is connected yet, so no emails send from this toggle right now — but
                your preference is saved for real, and will take effect as soon as email is wired in.
              </p>
              <label className="mt-4 flex items-center gap-3">
                <Toggle checked={emailNotifications} disabled={toggleSaving} onChange={() => updateProfileField("email_notifications_enabled", !emailNotifications, setEmailNotifications)} />
                <span className="text-sm font-medium text-foreground/80">
                  {emailNotifications ? "Email notifications on" : "Email notifications off"}
                </span>
              </label>
            </div>
          )}

          {tab === "pushNotifications" && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Push notifications</h2>
              <p className="mt-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Browser push delivery isn&apos;t set up yet (that needs its own infrastructure) — this
                toggle saves your preference for real, ready for when it is.
              </p>
              <label className="mt-4 flex items-center gap-3">
                <Toggle checked={pushNotifications} disabled={toggleSaving} onChange={() => updateProfileField("push_notifications_enabled", !pushNotifications, setPushNotifications)} />
                <span className="text-sm font-medium text-foreground/80">
                  {pushNotifications ? "Push notifications on" : "Push notifications off"}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
