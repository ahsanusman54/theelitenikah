"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsClient({
  email,
  initialVisibility,
}: {
  email: string;
  initialVisibility: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [visibility, setVisibility] = useState(initialVisibility);
  const [visibilitySaving, setVisibilitySaving] = useState(false);

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

  async function toggleVisibility() {
    const next = !visibility;
    setVisibility(next);
    setVisibilitySaving(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ visibility: next }).eq("user_id", user!.id);
    setVisibilitySaving(false);
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Account</h2>
        <p className="mt-2 text-sm text-foreground/60">Signed in as {email}</p>

        <form onSubmit={handlePasswordChange} className="mt-4 flex flex-col gap-4">
          <label className="text-sm font-medium text-foreground/80">
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              className={inputClass}
            />
          </label>
          {passwordMessage && <p className="text-sm text-foreground/70">{passwordMessage}</p>}
          <button
            type="submit"
            disabled={passwordSaving || !newPassword}
            className="self-start rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-60"
          >
            {passwordSaving ? "Saving..." : "Change password"}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Profile Visibility</h2>
        <p className="mt-2 text-sm text-foreground/60">
          When off, your profile won&apos;t appear in Discover, Search, or Match for other members.
        </p>
        <label className="mt-4 flex items-center gap-3">
          <button
            onClick={toggleVisibility}
            disabled={visibilitySaving}
            className={`h-6 w-11 rounded-full transition-colors ${visibility ? "bg-green-500" : "bg-gray-300"}`}
          >
            <span
              className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${visibility ? "translate-x-5" : ""}`}
            />
          </button>
          <span className="text-sm font-medium text-foreground/80">
            {visibility ? "Profile visible" : "Profile hidden"}
          </span>
        </label>
      </div>
    </main>
  );
}
