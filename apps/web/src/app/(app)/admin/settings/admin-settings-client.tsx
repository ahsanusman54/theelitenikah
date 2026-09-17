"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type FlagRow = { id: string; key: string; label: string; description: string | null; is_enabled: boolean };
export type SettingRow = {
  id: string;
  key: string;
  value: unknown;
  category: string | null;
  label: string;
  description: string | null;
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-300"} disabled:opacity-50`}
    >
      <span className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function AdminSettingsClient({
  initialFlags,
  initialSettings,
}: {
  initialFlags: FlagRow[];
  initialSettings: SettingRow[];
}) {
  const [flags, setFlags] = useState(initialFlags);
  const [settings, setSettings] = useState(initialSettings);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(initialSettings.map((s) => [s.id, JSON.stringify(s.value)]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleFlag(flag: FlagRow) {
    setSavingId(flag.id);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase
      .from("feature_flags")
      .update({ is_enabled: !flag.is_enabled, updated_at: new Date().toISOString() })
      .eq("id", flag.id);
    setSavingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f)));
  }

  async function saveSetting(setting: SettingRow) {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(drafts[setting.id]);
    } catch {
      setError(`"${setting.label}" isn't valid — numbers as-is, text in quotes, e.g. "hello".`);
      return;
    }
    setSavingId(setting.id);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase
      .from("app_settings")
      .update({ value: parsed, updated_at: new Date().toISOString() })
      .eq("id", setting.id);
    setSavingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setSettings((prev) => prev.map((s) => (s.id === setting.id ? { ...s, value: parsed } : s)));
  }

  const settingsByCategory = settings.reduce<Record<string, SettingRow[]>>((acc, s) => {
    const cat = s.category ?? "General";
    (acc[cat] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Features & Settings</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Toggle features on/off and adjust site-wide values — no code changes or deploys needed.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Feature flags</h2>
        <div className="mt-3 flex flex-col divide-y divide-gray-100">
          {flags.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                {f.description && <p className="text-sm text-foreground/60">{f.description}</p>}
                <p className="text-xs text-foreground/30">{f.key}</p>
              </div>
              <Toggle checked={f.is_enabled} disabled={savingId === f.id} onChange={() => toggleFlag(f)} />
            </div>
          ))}
        </div>
      </div>

      {Object.entries(settingsByCategory).map(([category, items]) => (
        <div key={category} className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold capitalize text-foreground">{category}</h2>
          <div className="mt-3 flex flex-col divide-y divide-gray-100">
            {items.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                  {s.description && <p className="text-sm text-foreground/60">{s.description}</p>}
                  <p className="text-xs text-foreground/30">{s.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={drafts[s.id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => saveSetting(s)}
                    disabled={savingId === s.id}
                    className="rounded-full bg-brand-purple px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-purple-light disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
