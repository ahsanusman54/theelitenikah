"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ProfileDetailClient({
  userId,
  name,
  bio,
  photos,
  isVerified,
  isPremium,
  isOnline,
  age,
  matchScore,
  details,
  alreadyLiked,
  alreadySuperLiked,
  theyLikedYou,
  isMatched,
}: {
  userId: string;
  name: string | null;
  bio: string | null;
  photos: string[];
  isVerified: boolean;
  isPremium: boolean;
  isOnline: boolean;
  age: number | null;
  matchScore: number | null;
  details: string[];
  alreadyLiked: boolean;
  alreadySuperLiked: boolean;
  theyLikedYou: boolean;
  isMatched: boolean;
}) {
  const [liked, setLiked] = useState(alreadyLiked);
  const [superLiked, setSuperLiked] = useState(alreadySuperLiked);
  const [matched, setMatched] = useState(isMatched);
  const [activePhoto, setActivePhoto] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "like" | "super_like") {
    if (liked) return;
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("likes").insert({
      from_user: user!.id,
      to_user: userId,
      is_super: action === "super_like",
    });

    if (!error) {
      setLiked(true);
      if (action === "super_like") setSuperLiked(true);

      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .maybeSingle();
      if (match) {
        setMatched(true);
        setMessage("It's a match!");
      }
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="relative h-96 w-full bg-gray-100">
          {photos[activePhoto] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[activePhoto]} alt={name ?? ""} className="h-full w-full object-cover" />
          ) : null}
          <span
            className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white ${
              isOnline ? "bg-green-500" : "bg-gray-500/80"
            }`}
          >
            ● {isOnline ? "Online" : "Offline"}
          </span>
          {theyLikedYou && !matched && (
            <span className="absolute right-3 top-3 rounded-full bg-brand-pink px-3 py-1 text-xs font-semibold text-white">
              Likes you
            </span>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3">
            {photos.map((url, i) => (
              <button
                key={url}
                onClick={() => setActivePhoto(i)}
                className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                  i === activePhoto ? "border-brand-pink" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
                {name || "Unnamed"}
                {isVerified && <span className="text-green-600" title="Verified">✓</span>}
                {isPremium && <span className="text-blue-500" title="Premium">★</span>}
              </h1>
              {age !== null && <p className="text-sm text-foreground/60">{age} years old</p>}
            </div>
            {matchScore !== null && (
              <span className="flex items-center gap-1 rounded-full border border-brand-pink px-3 py-1 text-sm font-semibold text-brand-pink">
                ♥ {matchScore}%
              </span>
            )}
          </div>

          {bio && <p className="mt-4 text-foreground/80">{bio}</p>}

          {details.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {details.map((d) => (
                <span key={d} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-foreground/70">
                  {d}
                </span>
              ))}
            </div>
          )}

          {message && (
            <p className="mt-4 rounded-lg bg-brand-pink/10 px-4 py-2 font-semibold text-brand-pink-dark">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => act("like")}
              disabled={liked}
              className="flex items-center gap-2 rounded-full bg-brand-pink px-5 py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50"
            >
              ♥ {liked ? "Liked" : "Like"}
            </button>
            <button
              onClick={() => act("super_like")}
              disabled={liked}
              className="flex items-center gap-2 rounded-full border border-brand-purple px-5 py-2.5 font-semibold text-brand-purple hover:bg-brand-purple hover:text-white disabled:opacity-50"
            >
              ★ {superLiked ? "Super Liked" : "Super Like"}
            </button>
            {matched ? (
              <a
                href="/messages"
                className="rounded-full bg-brand-purple px-5 py-2.5 font-semibold text-white hover:bg-brand-purple-light"
              >
                Message
              </a>
            ) : (
              <span
                title="Messaging unlocks after you match"
                className="cursor-not-allowed rounded-full bg-gray-200 px-5 py-2.5 font-semibold text-gray-500"
              >
                Message (match first)
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
