import { createSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("visibility, is_online")
    .eq("user_id", user!.id)
    .single();

  return (
    <SettingsClient
      email={user!.email ?? ""}
      initialVisibility={profile?.visibility ?? true}
    />
  );
}
