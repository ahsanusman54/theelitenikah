import { createSupabaseServerClient } from "@/lib/supabase/server";
import DiscoverClient, { type Candidate } from "./discover-client";
import { computeMatchScore } from "./match-score";

export default async function DiscoverPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select(
      "name, photos, marital_status, religious_practice, willing_to_relocate, children, drinks, smokes"
    )
    .eq("user_id", user!.id)
    .single();

  // Exclude anyone this user has already liked or passed on. We only record
  // "likes" in the DB (see discover-client.tsx), so this list is people
  // already acted on -- reject isn't persisted, just skipped client-side.
  const { data: alreadyLiked } = await supabase
    .from("likes")
    .select("to_user")
    .eq("from_user", user!.id);
  const excludeIds = new Set((alreadyLiked ?? []).map((l) => l.to_user));
  excludeIds.add(user!.id);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "user_id, name, bio, photos, is_verified, is_premium, date_of_birth, height_cm, weight_kg, children, drinks, smokes, marital_status, religious_practice, willing_to_relocate, photo_privacy"
    )
    .limit(50);

  // Photo privacy: if a candidate has hidden their photos from non-matches,
  // don't include the real photo URLs unless we've actually matched them.
  const { data: myMatches } = await supabase
    .from("matches")
    .select("user_a, user_b")
    .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`);
  const matchedIds = new Set(
    (myMatches ?? []).map((m) => (m.user_a === user!.id ? m.user_b : m.user_a))
  );

  const candidates: Candidate[] = (profiles ?? [])
    .filter((p) => !excludeIds.has(p.user_id))
    .map((p) => ({
      user_id: p.user_id,
      name: p.name,
      bio: p.bio,
      photos: p.photo_privacy && !matchedIds.has(p.user_id) ? [] : p.photos,
      is_verified: p.is_verified,
      is_premium: p.is_premium,
      date_of_birth: p.date_of_birth,
      height_cm: p.height_cm,
      weight_kg: p.weight_kg,
      children: p.children,
      drinks: p.drinks,
      smokes: p.smokes,
      matchScore: myProfile
        ? computeMatchScore(myProfile, {
            marital_status: p.marital_status,
            religious_practice: p.religious_practice,
            willing_to_relocate: p.willing_to_relocate,
            children: p.children,
            drinks: p.drinks,
            smokes: p.smokes,
          })
        : null,
    }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Discover</h1>

      {error && <p className="mt-4 text-red-600">Error loading profiles: {error.message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <DiscoverClient candidates={candidates} />

        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
            <h3 className="mb-3 font-display text-lg font-semibold">Your Profile</h3>
            <div className="mx-auto h-32 w-32 overflow-hidden rounded-xl bg-gray-100">
              {myProfile?.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={myProfile.photos[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400 text-sm">No photo</div>
              )}
            </div>
            <p className="mt-3 font-semibold">{myProfile?.name || "Your name"}</p>
          </div>

          <div className="rounded-2xl bg-brand-purple p-6 text-center text-white shadow-sm">
            <p className="text-sm">
              View all private pictures of any person, chat without restrictions, and see who likes
              you!
            </p>
            <a
              href="/credits"
              className="mt-4 inline-block rounded-full bg-brand-pink px-5 py-2 font-semibold hover:bg-brand-pink-dark"
            >
              Get premium now
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
