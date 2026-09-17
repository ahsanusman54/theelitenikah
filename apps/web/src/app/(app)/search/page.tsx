import { createSupabaseServerClient } from "@/lib/supabase/server";
import SearchClient, { type SearchProfile } from "./search-client";

export default async function SearchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user!.id;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, name, bio, photos, is_verified, is_premium, is_online, date_of_birth")
    .neq("user_id", myId)
    .limit(200);

  const results: SearchProfile[] = (profiles ?? []).map((p) => ({ ...p, distanceKm: null }));

  return (
    <SearchClient myId={myId} initialResults={results} initialError={error?.message ?? null} />
  );
}
