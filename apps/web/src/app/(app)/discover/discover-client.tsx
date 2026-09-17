"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { computeAge } from "./match-score";

export type Candidate = {
  user_id: string;
  name: string | null;
  bio: string | null;
  photos: string[] | null;
  is_verified: boolean;
  is_premium: boolean;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  children: string | null;
  drinks: string | null;
  smokes: string | null;
  matchScore: number | null;
};

const CHILDREN_LABEL: Record<string, string> = {
  none: "No children",
  have_children: "Has children",
};
const HABIT_LABEL: Record<string, string> = {
  no: "Don't drink",
  occasionally: "Drinks occasionally",
  yes: "Drinks",
};
const SMOKE_LABEL: Record<string, string> = {
  no: "Don't smoke",
  occasionally: "Smokes occasionally",
  yes: "Smokes",
};

export default function DiscoverClient({ candidates }: { candidates: Candidate[] }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [matchMessage, setMatchMessage] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  const candidate = candidates[index];

  async function act(action: "pass" | "like" | "super_like") {
    if (!candidate || busy) return;
    setBusy(true);
    setMatchMessage(null);

    if (action !== "pass") {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("likes").insert({
        from_user: user!.id,
        to_user: candidate.user_id,
        is_super: action === "super_like",
      });

      if (!error) {
        // A mutual like creates a match server-side (trigger). Check for it.
        const { data: match } = await supabase
          .from("matches")
          .select("id")
          .or(`user_a.eq.${candidate.user_id},user_b.eq.${candidate.user_id}`)
          .maybeSingle();

        if (match) {
          setMatchMessage(`It's a match with ${candidate.name || "them"}!`);
        }
      }
    }

    setBusy(false);
    setBioExpanded(false);
    setIndex((i) => i + 1);
  }

  if (!candidate) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-foreground/60 shadow-sm">
        No more profiles right now. Check back later as more people join.
      </div>
    );
  }

  const age = computeAge(candidate.date_of_birth);
  const bio = candidate.bio || "";
  const bioIsLong = bio.length > 160;
  const shownBio = bioExpanded || !bioIsLong ? bio : bio.slice(0, 160) + "...";

  return (
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {candidate.name || "Unnamed"}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm">
              {candidate.is_verified && (
                <span className="flex items-center gap-1 text-green-600" title="Verified">
                  ✓
                </span>
              )}
              {candidate.is_premium && (
                <span className="text-blue-500" title="Premium member">
                  ★
                </span>
              )}
            </div>
            {age !== null && <p className="mt-1 text-sm text-foreground/60">{age}</p>}
          </div>

          {candidate.matchScore !== null && (
            <span className="flex items-center gap-1 rounded-full border border-brand-pink px-3 py-1 text-sm font-semibold text-brand-pink">
              ♥ {candidate.matchScore}%
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground/70">
          {candidate.height_cm && <span>📏 {candidate.height_cm} cm</span>}
          {candidate.weight_kg && <span>⚖️ {candidate.weight_kg} kg</span>}
          {candidate.children && <span>{CHILDREN_LABEL[candidate.children]}</span>}
          {candidate.drinks && <span>🍷 {HABIT_LABEL[candidate.drinks]}</span>}
          {candidate.smokes && <span>🚬 {SMOKE_LABEL[candidate.smokes]}</span>}
        </div>

        <p className="mt-4 text-foreground/80">
          {shownBio || "No bio yet."}
          {bioIsLong && !bioExpanded && (
            <button
              onClick={() => setBioExpanded(true)}
              className="ml-1 font-semibold text-brand-purple hover:underline"
            >
              read more
            </button>
          )}
        </p>

        {matchMessage && (
          <p className="mt-4 rounded-lg bg-brand-pink/10 px-4 py-2 font-semibold text-brand-pink-dark">
            {matchMessage}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => act("pass")}
            disabled={busy}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-xl hover:bg-gray-50 disabled:opacity-50"
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            onClick={() => act("like")}
            disabled={busy}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-pink text-xl text-white hover:bg-brand-pink-dark disabled:opacity-50"
            aria-label="Like"
          >
            ♥
          </button>
          <button
            onClick={() => act("super_like")}
            disabled={busy}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-purple text-xl text-brand-purple hover:bg-brand-purple hover:text-white disabled:opacity-50"
            aria-label="Super like"
          >
            ★
          </button>
        </div>

        <button
          disabled
          title="Messaging isn't built yet"
          className="mt-6 rounded-full bg-gray-200 px-6 py-2.5 font-semibold text-gray-500"
        >
          Send message for free
        </button>
      </div>
    </div>
  );
}
