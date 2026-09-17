"use client";

import { useState } from "react";
import { computeAge } from "../discover/match-score";

export type ActivityProfile = {
  user_id: string;
  name: string | null;
  photos: string[] | null;
  is_verified: boolean;
  is_premium: boolean;
  date_of_birth: string | null;
};

type TabKey = "likes_me" | "you_like" | "viewed" | "suitable";

export default function ActivitiesClient({
  likesMe,
  youLike,
  whoViewedMe,
  suitable,
}: {
  likesMe: ActivityProfile[];
  youLike: ActivityProfile[];
  whoViewedMe: ActivityProfile[];
  suitable: ActivityProfile[];
}) {
  const [tab, setTab] = useState<TabKey>("likes_me");

  const tabs: { key: TabKey; label: string; items: ActivityProfile[] }[] = [
    { key: "likes_me", label: "Likes me", items: likesMe },
    { key: "you_like", label: "You like", items: youLike },
    { key: "viewed", label: "Who's viewed me", items: whoViewedMe },
    { key: "suitable", label: "Suitable", items: suitable },
  ];

  const active = tabs.find((t) => t.key === tab)!;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap gap-6 border-b border-gray-200 pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 text-sm font-semibold ${
              tab === t.key ? "text-foreground" : "text-foreground/40"
            }`}
          >
            {t.label}
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                tab === t.key ? "bg-brand-pink text-white" : "bg-gray-200 text-foreground/60"
              }`}
            >
              {t.items.length}
            </span>
          </button>
        ))}
      </div>

      {active.items.length === 0 ? (
        <p className="mt-10 text-center text-foreground/50">Nothing here yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {active.items.map((p) => {
            const age = computeAge(p.date_of_birth);
            return (
              <a
                key={p.user_id}
                href={`/profile/${p.user_id}`}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md"
              >
                <div className="relative h-32 w-full bg-gray-100">
                  {p.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photos[0]} alt={p.name ?? ""} className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute left-2 top-2 text-lg text-white drop-shadow">♥</span>
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-1 truncate text-sm font-semibold">
                    {p.name || "Unnamed"}
                    {p.is_verified && <span className="text-green-600">✓</span>}
                    {p.is_premium && <span className="text-blue-500">★</span>}
                  </div>
                  {age !== null && <p className="text-xs text-foreground/50">{age}</p>}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
