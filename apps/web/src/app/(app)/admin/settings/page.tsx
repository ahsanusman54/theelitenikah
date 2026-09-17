import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminSettingsClient, { type FlagRow, type SettingRow } from "./admin-settings-client";

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: flags } = await supabase
    .from("feature_flags")
    .select("id, key, label, description, is_enabled")
    .order("key");

  const { data: settings } = await supabase
    .from("app_settings")
    .select("id, key, value, category, label, description")
    .order("category");

  return (
    <AdminSettingsClient
      initialFlags={(flags ?? []) as FlagRow[]}
      initialSettings={(settings ?? []) as SettingRow[]}
    />
  );
}
