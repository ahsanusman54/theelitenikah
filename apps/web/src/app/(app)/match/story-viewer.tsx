"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryEntry } from "./match-client";

const IMAGE_DURATION_MS = 5000;

export default function StoryViewer({
  stories,
  startIndex,
  onClose,
  onDeleteOwn,
}: {
  stories: StoryEntry[];
  startIndex: number;
  onClose: () => void;
  onDeleteOwn: (storyId: string) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const current = stories[index];

  function goNext() {
    if (index >= stories.length - 1) {
      onClose();
    } else {
      setIndex((i) => i + 1);
    }
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  useEffect(() => {
    setProgress(0);
    if (!current) return;

    if (current.mediaType === "video") {
      // Progress is driven by the video's own timeupdate event (see below).
      return;
    }

    startRef.current = performance.now();
    function tick(now: number) {
      const elapsed = now - startRef.current;
      const pct = Math.min(1, elapsed / IMAGE_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="relative h-full w-full max-w-md">
        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-3 z-10 flex gap-1 px-3">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{
                  width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%",
                  transition: i === index && current.mediaType === "video" ? "none" : undefined,
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-3 right-3 top-8 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/10 text-xs font-semibold text-white">
              {current.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-white">{current.name}</span>
          </div>
          <button onClick={onClose} className="text-2xl text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Media */}
        <div className="flex h-full w-full items-center justify-center">
          {current.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={current.photoUrl}
              autoPlay
              playsInline
              muted
              className="max-h-full max-w-full"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
              onEnded={goNext}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.photoUrl} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>

        {/* Tap zones */}
        <button
          onClick={goPrev}
          className="absolute left-0 top-0 h-full w-1/3"
          aria-label="Previous story"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-0 h-full w-1/3"
          aria-label="Next story"
        />

        {current.isMine && (
          <button
            onClick={() => {
              onDeleteOwn(current.storyId);
              onClose();
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white"
          >
            Delete story
          </button>
        )}
      </div>
    </div>
  );
}
