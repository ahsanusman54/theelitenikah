"use client";

import { useState } from "react";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😉", "😎", "🤔",
  "😢", "😭", "😡", "😴", "🥳", "😇", "🙄", "😬", "🤗", "🤩",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "🤞", "👋", "🤟",
  "❤️", "💕", "💖", "💗", "💔", "💯", "🔥", "✨", "🎉", "🌹",
];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Add emoji"
        aria-label="Add emoji"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
      >
        😊
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-11 right-0 z-20 grid w-64 grid-cols-8 gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onSelect(e);
                  setOpen(false);
                }}
                className="rounded p-1 text-lg hover:bg-gray-100"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
