"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ReportBlockMenu from "@/components/ReportBlockMenu";

const MARITAL_LABELS: Record<string, string> = {
  never_married: "Never married",
  divorced: "Divorced",
  widowed: "Widowed",
};
const RELIGIOUS_PRACTICE_LABELS: Record<string, string> = {
  very_practicing: "Very practicing",
  practicing: "Practicing",
  moderately_practicing: "Moderately practicing",
  learning: "Learning",
};
const CHILDREN_LABELS: Record<string, string> = { none: "No children", have_children: "Has children" };
const HABIT_LABELS: Record<string, string> = { no: "No", occasionally: "Occasionally", yes: "Yes" };
const GENDER_LABELS: Record<string, string> = { man: "Man", woman: "Woman" };

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "a few seconds ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-sm font-semibold text-foreground">{label} </span>
      <span className="text-sm text-foreground/70">{value}</span>
    </div>
  );
}

export default function ProfileDetailClient({
  myId,
  userId,
  name,
  bio,
  photos,
  isVerified,
  isPremium,
  isOnline,
  age,
  matchScore,
  maritalStatus,
  religiousPractice,
  willingToRelocate,
  children,
  drinks,
  smokes,
  gender,
  country,
  city,
  occupation,
  education,
  religion,
  languages,
  interests,
  sports,
  interestedInGender,
  preferredAgeMin,
  preferredAgeMax,
  lastActiveAt,
  myCreditBalance,
  alreadyLiked,
  alreadySuperLiked,
  theyLikedYou,
  isMatched,
}: {
  myId: string;
  userId: string;
  name: string | null;
  bio: string | null;
  photos: string[];
  isVerified: boolean;
  isPremium: boolean;
  isOnline: boolean;
  age: number | null;
  matchScore: number | null;
  maritalStatus: string | null;
  religiousPractice: string | null;
  willingToRelocate: boolean | null;
  children: string | null;
  drinks: string | null;
  smokes: string | null;
  gender: string | null;
  country: string | null;
  city: string | null;
  occupation: string | null;
  education: string | null;
  religion: string | null;
  languages: string[];
  interests: string[];
  sports: string[];
  interestedInGender: string | null;
  preferredAgeMin: number | null;
  preferredAgeMax: number | null;
  lastActiveAt: string | null;
  myCreditBalance: number;
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
  const router = useRouter();

  async function act(action: "like" | "super_like") {
    if (liked) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("likes").insert({
      from_user: myId,
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

  const location = [city, country].filter(Boolean).join(", ");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="font-display text-xl font-bold text-foreground">Profile</h1>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row">
            <div>
              <div className="relative h-72 w-full overflow-hidden rounded-xl bg-gray-100 sm:w-64">
                {photos[activePhoto] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[activePhoto]} alt={name ?? ""} className="h-full w-full object-cover" />
                ) : null}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                    isOnline ? "bg-green-500" : "bg-gray-500/80"
                  }`}
                >
                  ● {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              {photos.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {photos.map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setActivePhoto(i)}
                      className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                        i === activePhoto ? "border-brand-pink" : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
                  {name || "Unnamed"}
                  {isVerified && <span className="text-green-600" title="Verified">✓</span>}
                  {isPremium && <span className="text-blue-500" title="Premium">★</span>}
                </h2>
                {matchScore !== null && (
                  <span className="flex items-center gap-1 rounded-full border border-brand-pink px-3 py-1 text-sm font-semibold text-brand-pink">
                    ♥ {matchScore}%
                  </span>
                )}
              </div>

              {lastActiveAt && <p className="mt-1 text-xs text-foreground/40">{timeAgo(lastActiveAt)}</p>}
              <p className="mt-1 text-sm text-foreground/60">
                {location}
                {location && age !== null ? " · " : ""}
                {age !== null ? age : ""}
              </p>

              {bio && <p className="mt-4 text-foreground/80">{bio}</p>}

              {theyLikedYou && !matched && (
                <p className="mt-3 inline-block rounded-full bg-brand-pink/10 px-3 py-1 text-sm font-semibold text-brand-pink-dark">
                  Likes you
                </p>
              )}
              {message && (
                <p className="mt-3 rounded-lg bg-brand-pink/10 px-4 py-2 font-semibold text-brand-pink-dark">
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
                  <a href="/messages" className="rounded-full bg-brand-purple px-5 py-2.5 font-semibold text-white hover:bg-brand-purple-light">
                    Message
                  </a>
                ) : (
                  <span title="Messaging unlocks after you match" className="cursor-not-allowed rounded-full bg-gray-200 px-5 py-2.5 font-semibold text-gray-500">
                    Message (match first)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="font-display text-lg font-semibold text-foreground">About</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Relationship Status" value={maritalStatus ? MARITAL_LABELS[maritalStatus] : null} />
              <Field label="Country" value={country} />
              <Field label="City" value={city} />
              <Field label="Occupation" value={occupation} />
              <Field label="Education" value={education} />
              <Field label="Children" value={children ? CHILDREN_LABELS[children] : null} />
              <Field label="Willing to relocate" value={willingToRelocate === null ? null : willingToRelocate ? "Yes" : "No"} />
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="font-display text-lg font-semibold text-foreground">Base</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Gender" value={gender ? GENDER_LABELS[gender] : null} />
              <Field label="Languages" value={languages.length ? languages.join(", ") : null} />
              <Field label="Religion" value={religion} />
              <Field label="Religious practice" value={religiousPractice ? RELIGIOUS_PRACTICE_LABELS[religiousPractice] : null} />
              <Field label="Drinks" value={drinks ? HABIT_LABELS[drinks] : null} />
              <Field label="Smokes" value={smokes ? HABIT_LABELS[smokes] : null} />
            </div>
          </div>

          {interests.length > 0 && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h3 className="font-display text-lg font-semibold text-foreground">Interests &amp; Hobbies</h3>
              <Field label="Interests" value={interests.join(", ")} />
            </div>
          )}

          {sports.length > 0 && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h3 className="font-display text-lg font-semibold text-foreground">Sport</h3>
              <Field label="Sport" value={sports.join(", ")} />
            </div>
          )}

          {(interestedInGender || preferredAgeMin || preferredAgeMax) && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h3 className="font-display text-lg font-semibold text-foreground">What {name?.split(" ")[0] || "they"}&apos;re looking for</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Interested in" value={interestedInGender ? GENDER_LABELS[interestedInGender] : null} />
                <Field
                  label="Age"
                  value={preferredAgeMin || preferredAgeMax ? `${preferredAgeMin ?? "18"} to ${preferredAgeMax ?? "80"}` : null}
                />
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-gray-100 pt-4">
            <ReportBlockMenu myId={myId} targetUserId={userId} targetName={name || "this member"} variant="buttons" onBlocked={() => router.push("/search")} />
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl bg-brand-purple p-6 text-center text-white shadow-sm">
            <p className="text-sm">
              View all private pictures of any person, chat without restrictions, and see who likes you!
            </p>
            <a href="/memberships" className="mt-4 inline-block rounded-full bg-brand-pink px-5 py-2 font-semibold hover:bg-brand-pink-dark">
              Get more credits
            </a>
          </div>
          <div className="rounded-2xl bg-brand-purple p-6 text-center text-white shadow-sm">
            <p className="font-display text-lg font-bold">Your balance</p>
            <p className="mt-2 text-2xl font-bold">{myCreditBalance} credits</p>
            <a href="/credits" className="mt-3 inline-block text-sm underline">Get more credits</a>
          </div>
        </aside>
      </div>
    </main>
  );
}
