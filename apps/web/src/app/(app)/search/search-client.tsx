"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { computeAge, computeMatchScore, type MatchableProfile } from "../discover/match-score";

export type SearchProfile = {
  user_id: string;
  name: string | null;
  bio: string | null;
  photos: string[] | null;
  is_verified: boolean;
  is_premium: boolean;
  is_online: boolean;
  date_of_birth: string | null;
  marital_status: string | null;
  religious_practice: string | null;
  willing_to_relocate: boolean | null;
  children: string | null;
  drinks: string | null;
  smokes: string | null;
  distanceKm: number | null;
  likesYou: boolean;
  iLiked: boolean;
  iSuperLiked: boolean;
};

type SortOption = "name" | "age" | "distance" | "match";
const PAGE_SIZE = 18;

const MARITAL_OPTIONS = [
  { value: "never_married", label: "Never married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];
const RELIGIOUS_OPTIONS = [
  { value: "very_practicing", label: "Very practicing" },
  { value: "practicing", label: "Practicing" },
  { value: "moderately_practicing", label: "Moderately practicing" },
  { value: "learning", label: "Learning" },
];
const CHILDREN_OPTIONS = [
  { value: "none", label: "No children" },
  { value: "have_children", label: "Has children" },
];
const HABIT_OPTIONS = [
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "Yes" },
];

function paramOrDefault(sp: URLSearchParams, key: string, fallback: string) {
  return sp.get(key) ?? fallback;
}

export default function SearchClient({
  myId,
  myProfile,
  initialResults,
  initialError,
}: {
  myId: string;
  myProfile: MatchableProfile | null;
  initialResults: SearchProfile[];
  initialError: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [results, setResults] = useState(initialResults);
  const [error, setError] = useState(initialError);
  const [ageMin, setAgeMin] = useState(() => paramOrDefault(searchParams, "ageMin", ""));
  const [ageMax, setAgeMax] = useState(() => paramOrDefault(searchParams, "ageMax", ""));
  const [maritalStatus, setMaritalStatus] = useState(() => paramOrDefault(searchParams, "marital", ""));
  const [religiousPractice, setReligiousPractice] = useState(() =>
    paramOrDefault(searchParams, "religious", "")
  );
  const [relocate, setRelocate] = useState(() => paramOrDefault(searchParams, "relocate", ""));
  const [children, setChildren] = useState(() => paramOrDefault(searchParams, "children", ""));
  const [drinks, setDrinks] = useState(() => paramOrDefault(searchParams, "drinks", ""));
  const [smokes, setSmokes] = useState(() => paramOrDefault(searchParams, "smokes", ""));
  const [radiusKm, setRadiusKm] = useState(() => paramOrDefault(searchParams, "radius", "25"));
  const [sort, setSort] = useState<SortOption>(
    () => (paramOrDefault(searchParams, "sort", "name") as SortOption)
  );
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locatingBusy, setLocatingBusy] = useState(false);
  const [nearbySearching, setNearbySearching] = useState(false);
  const [page, setPage] = useState(1);
  const [likeState, setLikeState] = useState<Map<string, { liked: boolean; superLiked: boolean }>>(
    new Map(initialResults.map((p) => [p.user_id, { liked: p.iLiked, superLiked: p.iSuperLiked }]))
  );
  const [matchMessage, setMatchMessage] = useState<string | null>(null);

  // Keep filters in the URL so a search survives a refresh or can be shared.
  useEffect(() => {
    const params = new URLSearchParams();
    if (ageMin) params.set("ageMin", ageMin);
    if (ageMax) params.set("ageMax", ageMax);
    if (maritalStatus) params.set("marital", maritalStatus);
    if (religiousPractice) params.set("religious", religiousPractice);
    if (relocate) params.set("relocate", relocate);
    if (children) params.set("children", children);
    if (drinks) params.set("drinks", drinks);
    if (smokes) params.set("smokes", smokes);
    if (radiusKm !== "25") params.set("radius", radiusKm);
    if (sort !== "name") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageMin, ageMax, maritalStatus, religiousPractice, relocate, children, drinks, smokes, radiusKm, sort]);

  function clearFilters() {
    setAgeMin("");
    setAgeMax("");
    setMaritalStatus("");
    setReligiousPractice("");
    setRelocate("");
    setChildren("");
    setDrinks("");
    setSmokes("");
    setSort("name");
  }

  async function handleEnableLocation() {
    setError(null);
    setLocatingBusy(true);

    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location.");
      setLocatingBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const supabase = createSupabaseBrowserClient();
        const { error: rpcError } = await supabase.rpc("update_my_location", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        if (rpcError) {
          setError(rpcError.message);
          setLocatingBusy(false);
          return;
        }
        setLocationEnabled(true);
        setLocatingBusy(false);
        await runNearbySearch(Number(radiusKm) || 25);
      },
      (geoError) => {
        setError(`Couldn't get your location: ${geoError.message}`);
        setLocatingBusy(false);
      }
    );
  }

  async function runNearbySearch(km: number) {
    setNearbySearching(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("search_nearby_profiles", { max_km: km });
    setNearbySearching(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    type NearbyRow = SearchProfile & { distance_km: number };
    const rows = (data ?? []) as unknown as NearbyRow[];

    setResults(
      rows.map((p) => ({
        ...p,
        distanceKm: p.distance_km,
        likesYou: results.find((r) => r.user_id === p.user_id)?.likesYou ?? false,
        iLiked: likeState.get(p.user_id)?.liked ?? false,
        iSuperLiked: likeState.get(p.user_id)?.superLiked ?? false,
      }))
    );
    setPage(1);
  }

  async function act(userId: string, action: "like" | "super_like") {
    const existing = likeState.get(userId);
    if (existing?.liked) return;

    const supabase = createSupabaseBrowserClient();
    const { error: likeError } = await supabase.from("likes").insert({
      from_user: myId,
      to_user: userId,
      is_super: action === "super_like",
    });

    if (!likeError) {
      setLikeState((prev) => new Map(prev).set(userId, { liked: true, superLiked: action === "super_like" }));
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .maybeSingle();
      if (match) setMatchMessage("It's a match! Head to Messages to say hello.");
    }
  }

  const filtered = useMemo(() => {
    const min = ageMin ? Number(ageMin) : null;
    const max = ageMax ? Number(ageMax) : null;
    return results.filter((p) => {
      const age = computeAge(p.date_of_birth);
      if (min !== null && (age === null || age < min)) return false;
      if (max !== null && (age === null || age > max)) return false;
      if (maritalStatus && p.marital_status !== maritalStatus) return false;
      if (religiousPractice && p.religious_practice !== religiousPractice) return false;
      if (relocate && String(p.willing_to_relocate) !== relocate) return false;
      if (children && p.children !== children) return false;
      if (drinks && p.drinks !== drinks) return false;
      if (smokes && p.smokes !== smokes) return false;
      return true;
    });
  }, [results, ageMin, ageMax, maritalStatus, religiousPractice, relocate, children, drinks, smokes]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "name") list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    else if (sort === "age")
      list.sort((a, b) => (computeAge(a.date_of_birth) ?? 0) - (computeAge(b.date_of_birth) ?? 0));
    else if (sort === "distance")
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    else if (sort === "match" && myProfile)
      list.sort((a, b) => (computeMatchScore(myProfile, b) ?? -1) - (computeMatchScore(myProfile, a) ?? -1));
    return list;
  }, [filtered, sort, myProfile]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectClass = "rounded-lg border border-gray-200 px-2 py-1.5 text-sm";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-sm">
          Age
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
          </div>
        </label>

        <label className="text-sm">
          Marital status
          <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={`mt-1 block ${selectClass}`}>
            <option value="">Any</option>
            {MARITAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Religious practice
          <select value={religiousPractice} onChange={(e) => setReligiousPractice(e.target.value)} className={`mt-1 block ${selectClass}`}>
            <option value="">Any</option>
            {RELIGIOUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Relocate
          <select value={relocate} onChange={(e) => setRelocate(e.target.value)} className={`mt-1 block ${selectClass}`}>
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <label className="text-sm">
          Children
          <select value={children} onChange={(e) => setChildren(e.target.value)} className={`mt-1 block ${selectClass}`}>
            <option value="">Any</option>
            {CHILDREN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Drinks
          <select value={drinks} onChange={(e) => setDrinks(e.target.value)} className={`mt-1 block ${selectClass}`}>
            <option value="">Any</option>
            {HABIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Smokes
          <select value={smokes} onChange={(e) => setSmokes(e.target.value)} className={`mt-1 block ${selectClass}`}>
            <option value="">Any</option>
            {HABIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Within
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <span>km</span>
          </div>
        </label>

        <button
          onClick={handleEnableLocation}
          disabled={locatingBusy}
          className="rounded-full bg-brand-purple px-5 py-2 text-sm font-semibold text-white hover:bg-brand-purple-light disabled:opacity-60"
        >
          {locatingBusy ? "Locating..." : locationEnabled ? "Update my location" : "Search near me"}
        </button>

        {locationEnabled && (
          <button
            onClick={() => runNearbySearch(Number(radiusKm) || 25)}
            disabled={nearbySearching}
            className="rounded-full border border-brand-purple px-5 py-2 text-sm font-semibold text-brand-purple hover:bg-brand-purple hover:text-white disabled:opacity-60"
          >
            {nearbySearching ? "Searching..." : "Apply radius"}
          </button>
        )}

        <button
          onClick={clearFilters}
          className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/60 hover:bg-gray-50"
        >
          Clear filters
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {matchMessage && (
        <p className="mt-3 rounded-lg bg-brand-pink/10 px-4 py-2 text-sm font-semibold text-brand-pink-dark">
          {matchMessage}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Matches <span className="text-brand-pink">{sorted.length}</span>
          </h1>
          <p className="text-sm text-foreground/50">
            Viewing {pageItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
            {(page - 1) * PAGE_SIZE + pageItems.length} of {sorted.length} active members
          </p>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
        >
          <option value="name">Sort by: Name</option>
          <option value="age">Sort by: Age</option>
          {myProfile && <option value="match">Sort by: Compatibility</option>}
          {locationEnabled && <option value="distance">Sort by: Distance</option>}
        </select>
      </div>

      {nearbySearching && <p className="mt-4 text-sm text-foreground/50">Searching nearby members...</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {pageItems.map((p) => {
          const age = computeAge(p.date_of_birth);
          const score = myProfile ? computeMatchScore(myProfile, p) : null;
          const like = likeState.get(p.user_id) ?? { liked: p.iLiked, superLiked: p.iSuperLiked };

          return (
            <div key={p.user_id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm">
              <a href={`/profile/${p.user_id}`} className="block">
                <div className="relative h-32 w-full bg-gray-100">
                  {p.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photos[0]} alt={p.name ?? ""} className="h-full w-full object-cover" />
                  ) : null}
                  <span
                    className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                      p.is_online ? "bg-green-500" : "bg-gray-500/80"
                    }`}
                  >
                    ● {p.is_online ? "Online" : "Offline"}
                  </span>
                  {p.likesYou && (
                    <span className="absolute right-2 top-2 rounded-full bg-brand-pink px-2 py-0.5 text-[10px] font-semibold text-white">
                      Likes you
                    </span>
                  )}
                  {score !== null && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {score}%
                    </span>
                  )}
                </div>
              </a>

              <div className="absolute inset-x-0 top-0 flex h-32 items-center justify-center gap-2 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <a
                  href="/messages"
                  title="Message (requires a match)"
                  aria-label={`Message ${p.name ?? "this member"}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple text-white"
                >
                  💬
                </a>
                <button
                  onClick={() => act(p.user_id, "like")}
                  disabled={like.liked}
                  title="Like"
                  aria-label={`Like ${p.name ?? "this member"}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white disabled:opacity-50"
                >
                  ♥
                </button>
                <button
                  onClick={() => act(p.user_id, "super_like")}
                  disabled={like.liked}
                  title="Super like"
                  aria-label={`Super like ${p.name ?? "this member"}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-purple disabled:opacity-50"
                >
                  ★
                </button>
              </div>

              <a href={`/profile/${p.user_id}`} className="block p-2">
                <div className="flex items-center gap-1 truncate text-sm font-semibold">
                  {p.name || "Unnamed"}
                  {p.is_verified && <span className="text-green-600">✓</span>}
                  {p.is_premium && <span className="text-blue-500">★</span>}
                </div>
                <p className="text-xs text-foreground/50">
                  {age !== null ? age : ""}
                  {p.distanceKm !== null ? ` · ${p.distanceKm.toFixed(1)} km` : ""}
                </p>
              </a>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && !nearbySearching && (
        <p className="mt-10 text-center text-foreground/60">No members match these filters.</p>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`h-9 w-9 rounded-lg text-sm font-semibold ${
                n === page ? "bg-brand-purple text-white" : "border border-gray-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
