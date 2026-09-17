"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type StoryEntry = {
  storyId: string;
  userId: string;
  name: string;
  photoUrl: string;
  isMine: boolean;
};

export type MatchProfile = {
  userId: string;
  name: string;
  photo: string | null;
  matchedAt: string;
};

type SortOption = "recent" | "name";

export default function MatchClient({
  myId,
  myName,
  myPhoto,
  initialStories,
  initialMatches,
}: {
  myId: string;
  myName: string;
  myPhoto: string | null;
  initialStories: StoryEntry[];
  initialMatches: MatchProfile[];
}) {
  const [stories, setStories] = useState(initialStories);
  const [matches] = useState(initialMatches);
  const [sort, setSort] = useState<SortOption>("recent");
  const [uploadingStory, setUploadingStory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myStory = stories.find((s) => s.isMine);

  async function handleAddStory(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingStory(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${myId}/stories/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file);
    if (uploadError) {
      setUploadingStory(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-photos").getPublicUrl(path);

    const { data: story, error } = await supabase
      .from("stories")
      .insert({ user_id: myId, photo_url: publicUrl })
      .select("id, user_id, photo_url")
      .single();

    setUploadingStory(false);
    if (!error && story) {
      setStories((prev) => [
        { storyId: story.id, userId: myId, name: myName, photoUrl: story.photo_url, isMine: true },
        ...prev.filter((s) => !s.isMine),
      ]);
    }
  }

  async function handleDeleteStory() {
    if (!myStory) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("stories").delete().eq("id", myStory.storyId);
    setStories((prev) => prev.filter((s) => s.storyId !== myStory.storyId));
  }

  const sortedMatches = [...matches].sort((a, b) =>
    sort === "recent" ? b.matchedAt.localeCompare(a.matchedAt) : a.name.localeCompare(b.name)
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Stories row */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="flex flex-shrink-0 flex-col items-center gap-1">
          <button
            onClick={() => (myStory ? handleDeleteStory() : fileInputRef.current?.click())}
            disabled={uploadingStory}
            className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-brand-pink bg-gray-100"
            title={myStory ? "Click to remove your story" : "Add a story"}
          >
            {myStory ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={myStory.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : myPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={myPhoto} alt="" className="h-full w-full object-cover" />
            ) : null}
            <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-pink text-xs text-white">
              {myStory ? "✕" : "+"}
            </span>
          </button>
          <span className="text-xs text-foreground/70">{myStory ? "Your story" : "Add story"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAddStory}
          />
        </div>

        {stories
          .filter((s) => !s.isMine)
          .map((s) => (
            <div key={s.storyId} className="flex flex-shrink-0 flex-col items-center gap-1">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-brand-purple">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
              </div>
              <span className="max-w-16 truncate text-xs text-foreground/70">{s.name}</span>
            </div>
          ))}
      </div>

      {/* Matches header */}
      <div className="mt-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Matches <span className="text-brand-pink">{matches.length}</span>
        </h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
        >
          <option value="recent">Sort by: Most recent</option>
          <option value="name">Sort by: Name</option>
        </select>
      </div>

      {sortedMatches.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">💬</span>
          <h2 className="font-display text-xl font-bold text-foreground">Not found</h2>
          <p className="text-foreground/60">No matches yet.</p>
          <a
            href="/discover"
            className="rounded-full bg-brand-purple px-6 py-2.5 font-semibold text-white hover:bg-brand-purple-light"
          >
            Discover
          </a>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {sortedMatches.map((m) => (
            <a
              key={m.userId}
              href="/messages"
              className="overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md"
            >
              <div className="h-40 w-full bg-gray-100">
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <p className="p-3 font-semibold">{m.name}</p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
