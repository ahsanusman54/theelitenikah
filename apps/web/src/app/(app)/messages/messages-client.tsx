"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCall } from "@/components/calls/CallContext";
import EmojiPicker from "@/components/EmojiPicker";

export type Conversation = {
  chatId: string;
  otherUserId: string;
  otherName: string;
  otherPhoto: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

type MessageType = "text" | "voice" | "image" | "video" | "file";

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  duration_seconds: number | null;
  file_name: string | null;
  sent_at: string;
};

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function useSignedUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase.storage
      .from("chat-media")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

function VoiceMessage({ path, duration }: { path: string; duration: number | null }) {
  const url = useSignedUrl(path);
  return (
    <div className="flex items-center gap-2">
      {url ? <audio controls src={url} className="h-9 max-w-[220px]" /> : <span className="text-xs opacity-70">Loading...</span>}
      {duration !== null && <span className="text-xs opacity-70">{duration}s</span>}
    </div>
  );
}

function ImageMessage({ path }: { path: string }) {
  const url = useSignedUrl(path);
  if (!url) return <span className="text-xs opacity-70">Loading image...</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="max-h-64 max-w-full rounded-lg object-cover" />;
}

function VideoMessage({ path }: { path: string }) {
  const url = useSignedUrl(path);
  if (!url) return <span className="text-xs opacity-70">Loading video...</span>;
  return <video controls src={url} className="max-h-64 max-w-full rounded-lg" />;
}

function FileMessage({ path, fileName }: { path: string; fileName: string | null }) {
  const url = useSignedUrl(path);
  return (
    <a
      href={url ?? undefined}
      download={fileName ?? undefined}
      className="flex items-center gap-2 underline"
      onClick={(e) => {
        if (!url) e.preventDefault();
      }}
    >
      📎 {fileName || "Attachment"}
    </a>
  );
}

export default function MessagesClient({
  myId,
  initialConversations,
  initialIsOnline,
}: {
  myId: string;
  initialConversations: Conversation[];
  initialIsOnline: boolean;
}) {
  const { startCall } = useCall();
  const [conversations] = useState(initialConversations);
  const [search, setSearch] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialConversations[0]?.chatId ?? null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = conversations.find((c) => c.chatId === selectedChatId) ?? null;

  const filtered = search
    ? conversations.filter((c) => c.otherName.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    supabase
      .from("messages")
      .select("id, chat_id, sender_id, content, message_type, duration_seconds, file_name, sent_at")
      .eq("chat_id", selectedChatId)
      .order("sent_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setMessages((data ?? []) as Message[]);
      });

    const channel = supabase
      .channel(`messages-${selectedChatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${selectedChatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !selectedChatId || sending) return;

    setSending(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("messages").insert({
      chat_id: selectedChatId,
      sender_id: myId,
      content: draft.trim(),
      message_type: "text",
    });
    setSending(false);
    if (!error) setDraft("");
  }

  async function startRecording() {
    if (!selectedChatId) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    setRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  }

  async function stopRecordingAndSend() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !selectedChatId) return;

    const finalDuration = recordSeconds;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;

    const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    if (blob.size === 0) return;

    setUploadingVoice(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${selectedChatId}/${myId}/${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, blob);
    if (!uploadError) {
      await supabase.from("messages").insert({
        chat_id: selectedChatId,
        sender_id: myId,
        content: path,
        message_type: "voice",
        duration_seconds: finalDuration,
      });
    }
    setUploadingVoice(false);
  }

  function cancelRecording() {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleAttachment(e: React.ChangeEvent<HTMLInputElement>, kind: "media" | "file") {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId) return;
    setAttachError(null);

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError("That file is over 25MB. Please choose a smaller one.");
      e.target.value = "";
      return;
    }

    const messageType: MessageType = kind === "file" ? "file" : file.type.startsWith("video/") ? "video" : "image";

    setUploadingAttachment(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${selectedChatId}/${myId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, file);
    if (uploadError) {
      setAttachError(uploadError.message);
    } else {
      await supabase.from("messages").insert({
        chat_id: selectedChatId,
        sender_id: myId,
        content: path,
        message_type: messageType,
        file_name: file.name,
      });
    }
    setUploadingAttachment(false);
    e.target.value = "";
  }

  function insertEmoji(emoji: string) {
    setDraft((d) => d + emoji);
    textInputRef.current?.focus();
  }

  async function toggleOnline() {
    const next = !isOnline;
    setIsOnline(next);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("profiles").update({ is_online: next }).eq("user_id", myId);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">My messages</h1>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground/70">
          Online
          <button
            onClick={toggleOnline}
            className={`h-6 w-11 rounded-full transition-colors ${isOnline ? "bg-green-500" : "bg-gray-300"}`}
          >
            <span
              className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${isOnline ? "translate-x-5" : ""}`}
            />
          </button>
        </label>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr_260px]">
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="p-3">
            <input
              type="text"
              placeholder="Search conversation"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
            />
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-foreground/50">
                No conversations yet.
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.chatId}
                onClick={() => setSelectedChatId(c.chatId)}
                className={`flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                  c.chatId === selectedChatId ? "bg-gray-50" : ""
                }`}
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                  {c.otherPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.otherPhoto} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-semibold text-sm">{c.otherName}</p>
                    <span className="flex-shrink-0 text-xs text-foreground/40">
                      {formatDate(c.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-foreground/60">{c.lastMessage || "Say hello!"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl bg-white shadow-sm">
          {selectedConversation ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 overflow-hidden rounded-full bg-gray-200">
                    {selectedConversation.otherPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedConversation.otherPhoto} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <p className="font-semibold">{selectedConversation.otherName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      startCall(selectedConversation.chatId, selectedConversation.otherUserId, selectedConversation.otherName, false)
                    }
                    title="Voice call"
                    aria-label={`Voice call ${selectedConversation.otherName}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple text-white hover:bg-brand-purple-light"
                  >
                    📞
                  </button>
                  <button
                    onClick={() =>
                      startCall(selectedConversation.chatId, selectedConversation.otherUserId, selectedConversation.otherName, true)
                    }
                    title="Video call"
                    aria-label={`Video call ${selectedConversation.otherName}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple text-white hover:bg-brand-purple-light"
                  >
                    🎥
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ minHeight: 340 }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.sender_id === myId
                        ? "ml-auto bg-brand-pink text-white"
                        : "bg-gray-100 text-foreground"
                    }`}
                  >
                    {m.message_type === "voice" && <VoiceMessage path={m.content} duration={m.duration_seconds} />}
                    {m.message_type === "image" && <ImageMessage path={m.content} />}
                    {m.message_type === "video" && <VideoMessage path={m.content} />}
                    {m.message_type === "file" && <FileMessage path={m.content} fileName={m.file_name} />}
                    {m.message_type === "text" && m.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-100 p-3">
                {attachError && <p className="mb-2 text-xs text-red-600">{attachError}</p>}
                {recording ? (
                  <div className="flex items-center gap-3 rounded-full border border-red-200 bg-red-50 px-4 py-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="flex-1 text-sm text-red-600">Recording... {recordSeconds}s</span>
                    <button onClick={cancelRecording} className="text-sm text-foreground/50" aria-label="Cancel recording">
                      Cancel
                    </button>
                    <button
                      onClick={stopRecordingAndSend}
                      className="rounded-full bg-brand-pink px-4 py-1.5 text-sm font-semibold text-white"
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <form onSubmit={sendMessage} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAttachment}
                      title="Attach a file"
                      aria-label="Attach a file"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      📎
                    </button>
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      disabled={uploadingAttachment}
                      title="Share a photo or video"
                      aria-label="Share a photo or video"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      🖼️
                    </button>
                    <input
                      type="text"
                      ref={textInputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-brand-purple focus:outline-none"
                    />
                    <EmojiPicker onSelect={insertEmoji} />
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={uploadingVoice}
                      title="Record a voice note"
                      aria-label="Record a voice note"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {uploadingVoice ? "..." : "🎙️"}
                    </button>
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-50"
                    >
                      Send
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleAttachment(e, "file")}
                    />
                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleAttachment(e, "media")}
                    />
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center text-foreground/60">
              <span className="text-3xl">💬</span>
              <p className="font-semibold">Select a conversation to display</p>
              <p className="text-sm">Conversations start automatically when you match with someone.</p>
            </div>
          )}
        </div>

        <aside className="rounded-2xl bg-brand-purple p-6 text-center text-white shadow-sm">
          <p className="text-sm">
            View all private pictures of any person, chat without restrictions, and see who likes
            you!
          </p>
          <a
            href="/credits"
            className="mt-4 inline-block rounded-full bg-brand-pink px-5 py-2 font-semibold hover:bg-brand-pink-dark"
          >
            Get premium now
          </a>
        </aside>
      </div>
    </main>
  );
}
