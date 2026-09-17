"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { computeAge } from "../discover/match-score";

export type SearchProfile = {
  user_id: string;
  name: string | null;
  bio: string | null;
  photos: string[] | null;
  is_verified: boolean;
  is_premium: boolean;
  is_online: boolean;
  date_of_birth: string | null;
  distanceKm: number | null;
};

type SortOption = "name" | "age" | "distance";

const PAGE_SIZE = 18;

export default function SearchClient({
  myId,
  initialResults,
  initialError,
}: {
  myId: string;
  initialResults: SearchProfile[];
  initialError: string | null;
}) {
  const [results, setResults] = useState(initialResults);
  const [error, setError] = useState(initialError);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [radiusKm, setRadiusKm] = useState("25");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locatingBusy, setLocatingBusy] = useState(false);
  const [sort, setSort] = useState<SortOption>("name");
  const [page, setPage] = useState(1);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [matchMessage, setMatchMessage] = useState<string | null>(null);

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
    const supabase = createSupabaseBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("search_nearby_profiles", { max_km: km });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    type NearbyRow = {
      user_id: string;
      name: string | null;
      bio: string | null;
      photos: string[] | null;
      is_verified: boolean;
      is_premium: boolean;
      is_online: boolean;
      date_of_birth: string | null;
      distance_km: number;
    };

    setResults(
      ((data ?? []) as NearbyRow[]).map((p) => ({
        user_id: p.user_id,
        name: p.name,
        bio: p.bio,
        photos: p.photos,
        is_verified: p.is_verified,
        is_premium: p.is_premium,
        is_online: p.is_online,
        date_of_birth: p.date_of_birth,
        distanceKm: p.distance_km,
      }))
    );
    setPage(1);
  }

  async function handleLike(userId: string) {
    if (likedIds.has(userId)) return;
    const supabase = createSupabaseBrowserClient();
    const { error: likeError } = await supabase
      .from("likes")
      .insert({ from_user: myId, to_user: userId });

    if (!likeError) {
      setLikedIds((prev) => new Set(prev).add(userId));
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
      return true;
    });
  }, [results, ageMin, ageMax]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "name") list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    else if (sort === "age")
      list.sort((a, b) => (computeAge(a.date_of_birth) ?? 0) - (computeAge(b.date_of_birth) ?? 0));
    else if (sort === "distance")
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return list;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-sm">
          Age
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
          </div>
        </label>

        <label className="text-sm">
          Within
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
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
            className="rounded-full border border-brand-purple px-5 py-2 text-sm font-semibold text-brand-purple hover:bg-brand-purple hover:text-white"
          >
            Apply radius
          </button>
        )}
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
          {locationEnabled && <option value="distance">Sort by: Distance</option>}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {pageItems.map((p) => {
          const age = computeAge(p.date_of_birth);
          return (
            <div key={p.user_id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm">
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

                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <a
                    href="/messages"
                    title="Message (requires a match)"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple text-white"
                  >
                    💬
                  </a>
                  <button
                    onClick={() => handleLike(p.user_id)}
                    disabled={likedIds.has(p.user_id)}
                    title="Like"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white disabled:opacity-50"
                  >
                    ♥
                  </button>
                </div>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-1 truncate text-sm font-semibold">
                  {p.name || "Unnamed"}
                  {p.is_verified && <span className="text-green-600">✓</span>}
                  {p.is_premium && <span className="text-blue-500">★</span>}
                </div>
                <p className="text-xs text-foreground/50">
                  {age !== null ? age : ""}
                  {p.distanceKm !== null ? ` · ${p.distanceKm.toFixed(1)} km` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
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
