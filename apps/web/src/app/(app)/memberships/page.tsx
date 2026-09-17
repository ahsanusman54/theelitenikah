import { createSupabaseServerClient } from "@/lib/supabase/server";
import MembershipsClient, { type Package } from "./memberships-client";

export default async function MembershipsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("user_id", user!.id)
    .single();

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, type, price_cents, currency, duration_days")
    .eq("type", "membership")
    .order("sort_order");

  return (
    <MembershipsClient
      initialIsPremium={profile?.is_premium ?? false}
      packages={(packages ?? []) as Package[]}
    />
  );
}
