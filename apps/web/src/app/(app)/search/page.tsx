import { createSupabaseServerClient } from "@/lib/supabase/server";
import SearchClient, { type SearchProfile } from "./search-client";

export default async function SearchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user!.id;

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("marital_status, religious_practice, willing_to_relocate, children, drinks, smokes")
    .eq("user_id", myId)
    .single();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "user_id, name, bio, photos, is_verified, is_premium, is_online, date_of_birth, marital_status, religious_practice, willing_to_relocate, children, drinks, smokes, photo_privacy"
    )
    .neq("user_id", myId)
    .limit(200);

  const { data: likesReceived } = await supabase
    .from("likes")
    .select("from_user")
    .eq("to_user", myId);
  const likedMeIds = new Set((likesReceived ?? []).map((l) => l.from_user));

  const { data: likesSent } = await supabase
    .from("likes")
    .select("to_user, is_super")
    .eq("from_user", myId);
  const iLiked = new Map((likesSent ?? []).map((l) => [l.to_user, l.is_super]));

  const { data: myMatches } = await supabase
    .from("matches")
    .select("user_a, user_b")
    .or(`user_a.eq.${myId},user_b.eq.${myId}`);
  const matchedIds = new Set((myMatches ?? []).map((m) => (m.user_a === myId ? m.user_b : m.user_a)));

  const results: SearchProfile[] = (profiles ?? []).map((p) => ({
    ...p,
    photos: p.photo_privacy && !matchedIds.has(p.user_id) ? [] : p.photos,
    distanceKm: null,
    likesYou: likedMeIds.has(p.user_id),
    iLiked: iLiked.has(p.user_id),
    iSuperLiked: iLiked.get(p.user_id) === true,
  }));

  return (
    <SearchClient
      myId={myId}
      myProfile={myProfile ?? null}
      initialResults={results}
      initialError={error?.message ?? null}
    />
  );
}
