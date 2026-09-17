import { createSupabaseServerClient } from "@/lib/supabase/server";
import CreditsClient, { type Package } from "./credits-client";

export default async function CreditsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: credits } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user!.id)
    .single();

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, type, price_cents, currency, credits_included")
    .eq("type", "credits")
    .order("sort_order");

  return (
    <CreditsClient
      initialBalance={credits?.balance ?? 0}
      packages={(packages ?? []) as Package[]}
    />
  );
}
