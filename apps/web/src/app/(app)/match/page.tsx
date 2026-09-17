import { createSupabaseServerClient } from "@/lib/supabase/server";
import MatchClient, { type MatchProfile, type StoryEntry } from "./match-client";

export default async function MatchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user!.id;

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("name, photos")
    .eq("user_id", myId)
    .single();

  // Active stories from everyone (RLS already limits this to non-expired
  // stories from visible/active profiles), newest first, one per user.
  const { data: stories } = await supabase
    .from("stories")
    .select("id, user_id, photo_url, media_type, created_at")
    .order("created_at", { ascending: false });

  const storyUserIds = Array.from(new Set((stories ?? []).map((s) => s.user_id)));
  const { data: storyProfiles } = storyUserIds.length
    ? await supabase.from("profiles").select("user_id, name").in("user_id", storyUserIds)
    : { data: [] };
  const nameById = new Map((storyProfiles ?? []).map((p) => [p.user_id, p.name]));

  const seen = new Set<string>();
  const storyEntries: StoryEntry[] = [];
  for (const s of stories ?? []) {
    if (seen.has(s.user_id)) continue;
    seen.add(s.user_id);
    storyEntries.push({
      storyId: s.id,
      userId: s.user_id,
      name: nameById.get(s.user_id) ?? "Unknown",
      photoUrl: s.photo_url,
      mediaType: s.media_type as "image" | "video",
      isMine: s.user_id === myId,
    });
  }

  // My matches, with the other person's profile.
  const { data: matches } = await supabase
    .from("matches")
    .select("id, user_a, user_b, matched_at")
    .or(`user_a.eq.${myId},user_b.eq.${myId}`);

  const matchList = matches ?? [];
  const otherIds = matchList.map((m) => (m.user_a === myId ? m.user_b : m.user_a));
  const { data: matchProfiles } = otherIds.length
    ? await supabase.from("profiles").select("user_id, name, photos").in("user_id", otherIds)
    : { data: [] };
  const profileById = new Map((matchProfiles ?? []).map((p) => [p.user_id, p]));

  const matches_: MatchProfile[] = matchList.map((m) => {
    const otherId = m.user_a === myId ? m.user_b : m.user_a;
    const profile = profileById.get(otherId);
    return {
      userId: otherId,
      name: profile?.name ?? "Unknown",
      photo: profile?.photos?.[0] ?? null,
      matchedAt: m.matched_at,
    };
  });

  return (
    <MatchClient
      myId={myId}
      myName={myProfile?.name ?? ""}
      myPhoto={myProfile?.photos?.[0] ?? null}
      initialStories={storyEntries}
      initialMatches={matches_}
    />
  );
}
