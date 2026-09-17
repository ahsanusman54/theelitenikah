import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("name, photos")
    .eq("user_id", user!.id)
    .single();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, name, bio, photos, marital_status, religious_practice")
    .neq("user_id", user!.id)
    .limit(20);

  const candidate = profiles?.[0];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Discover</h1>

      {error && <p className="mt-4 text-red-600">Error loading profiles: {error.message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        {candidate ? (
          <div className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm sm:flex-row">
            <div className="h-72 w-full flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-64">
              {candidate.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={candidate.photos[0]} alt={candidate.name ?? ""} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">No photo</div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {candidate.name || "Unnamed"}
              </h2>
              <div className="mt-2 flex gap-3 text-sm text-foreground/60">
                {candidate.marital_status && <span>{candidate.marital_status.replace("_", " ")}</span>}
                {candidate.religious_practice && <span>{candidate.religious_practice.replace("_", " ")}</span>}
              </div>
              <p className="mt-4 text-foreground/80">{candidate.bio || "No bio yet."}</p>

              <div className="mt-6 flex gap-3">
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-xl hover:bg-gray-50">
                  ✕
                </button>
                <button className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-pink text-xl text-white hover:bg-brand-pink-dark">
                  ♥
                </button>
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-purple text-brand-purple text-xl hover:bg-brand-purple hover:text-white">
                  ★
                </button>
              </div>

              <button className="mt-6 rounded-full bg-brand-purple px-6 py-2.5 font-semibold text-white hover:bg-brand-purple-light">
                Send message for free
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-10 text-center text-foreground/60 shadow-sm">
            No other profiles yet. Once more people sign up, they&apos;ll show up here.
          </div>
        )}

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
