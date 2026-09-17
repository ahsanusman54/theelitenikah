"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import StoryViewer from "./story-viewer";

export type StoryEntry = {
  storyId: string;
  userId: string;
  name: string;
  photoUrl: string;
  mediaType: "image" | "video";
  isMine: boolean;
};

export type MatchProfile = {
  userId: string;
  name: string;
  photo: string | null;
  matchedAt: string;
};

type SortOption = "recent" | "name";

const MAX_VIDEO_SECONDS = 10;

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Could not read video metadata"));
    };
    video.src = URL.createObjectURL(file);
  });
}

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myStory = stories.find((s) => s.isMine);
  // Rendered order: mine first (if any), then everyone else -- this is also
  // the order the full-screen viewer advances through.
  const orderedStories = [
    ...(myStory ? [myStory] : []),
    ...stories.filter((s) => !s.isMine),
  ];

  async function handleAddStory(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      try {
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_SECONDS) {
          setUploadError(`Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.`);
          e.target.value = "";
          return;
        }
      } catch {
        setUploadError("Couldn't read that video file. Try a different one.");
        e.target.value = "";
        return;
      }
    }

    setUploadingStory(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${myId}/stories/${Date.now()}-${file.name}`;

    const { error: uploadErr } = await supabase.storage.from("profile-photos").upload(path, file);
    if (uploadErr) {
      setUploadingStory(false);
      setUploadError(uploadErr.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-photos").getPublicUrl(path);

    const mediaType = isVideo ? "video" : "image";
    const { data: story, error } = await supabase
      .from("stories")
      .insert({ user_id: myId, photo_url: publicUrl, media_type: mediaType })
      .select("id, user_id, photo_url, media_type")
      .single();

    setUploadingStory(false);
    e.target.value = "";

    if (error) {
      setUploadError(error.message);
      return;
    }
    if (story) {
      setStories((prev) => [
        {
          storyId: story.id,
          userId: myId,
          name: myName,
          photoUrl: story.photo_url,
          mediaType: story.media_type,
          isMine: true,
        },
        ...prev.filter((s) => !s.isMine),
      ]);
    }
  }

  async function handleDeleteStory(storyId: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("stories").delete().eq("id", storyId);
    setStories((prev) => prev.filter((s) => s.storyId !== storyId));
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
            onClick={() => (myStory ? setViewerIndex(0) : fileInputRef.current?.click())}
            disabled={uploadingStory}
            className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-brand-pink bg-gray-100 transition-transform hover:scale-105"
            title={myStory ? "View your story" : "Add a story"}
          >
            {myStory ? (
              myStory.mediaType === "video" ? (
                <video src={myStory.photoUrl} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={myStory.photoUrl} alt="" className="h-full w-full object-cover" />
              )
            ) : myPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={myPhoto} alt="" className="h-full w-full object-cover" />
            ) : null}
            {uploadingStory && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                ...
              </span>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploadingStory}
            className="-mt-4 ml-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-pink text-xs font-bold text-white shadow"
            title="Add a new story"
          >
            +
          </button>
          <span className="text-xs text-foreground/70">{myStory ? "Your story" : "Add story"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleAddStory}
          />
        </div>

        {stories
          .filter((s) => !s.isMine)
          .map((s) => {
            const orderIndex = orderedStories.findIndex((o) => o.storyId === s.storyId);
            return (
              <button
                key={s.storyId}
                onClick={() => setViewerIndex(orderIndex)}
                className="flex flex-shrink-0 flex-col items-center gap-1 transition-transform hover:scale-105"
              >
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-brand-purple">
                  {s.mediaType === "video" ? (
                    <video src={s.photoUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="max-w-16 truncate text-xs text-foreground/70">{s.name}</span>
              </button>
            );
          })}
      </div>
      {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}

      {viewerIndex !== null && (
        <StoryViewer
          stories={orderedStories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDeleteOwn={handleDeleteStory}
        />
      )}

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
              className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
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
