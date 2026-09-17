import { createSupabaseServerClient } from "@/lib/supabase/server";
import MessagesClient, { type Conversation } from "./messages-client";

export default async function MessagesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user!.id;

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_online")
    .eq("user_id", myId)
    .single();

  const { data: chats } = await supabase
    .from("chats")
    .select("id, user_a, user_b")
    .or(`user_a.eq.${myId},user_b.eq.${myId}`);

  const chatList = chats ?? [];
  const otherIds = chatList.map((c) => (c.user_a === myId ? c.user_b : c.user_a));

  const { data: otherProfiles } = otherIds.length
    ? await supabase.from("profiles").select("user_id, name, photos").in("user_id", otherIds)
    : { data: [] };

  const { data: recentMessages } = chatList.length
    ? await supabase
        .from("messages")
        .select("chat_id, content, sent_at")
        .in(
          "chat_id",
          chatList.map((c) => c.id)
        )
        .order("sent_at", { ascending: false })
    : { data: [] };

  const lastMessageByChat = new Map<string, { content: string; sent_at: string }>();
  for (const m of recentMessages ?? []) {
    if (!lastMessageByChat.has(m.chat_id)) {
      lastMessageByChat.set(m.chat_id, { content: m.content, sent_at: m.sent_at });
    }
  }

  const profileById = new Map((otherProfiles ?? []).map((p) => [p.user_id, p]));

  const conversations: Conversation[] = chatList
    .map((c) => {
      const otherId = c.user_a === myId ? c.user_b : c.user_a;
      const profile = profileById.get(otherId);
      const last = lastMessageByChat.get(c.id);
      return {
        chatId: c.id,
        otherUserId: otherId,
        otherName: profile?.name ?? "Unknown",
        otherPhoto: profile?.photos?.[0] ?? null,
        lastMessage: last?.content ?? null,
        lastMessageAt: last?.sent_at ?? null,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));

  return (
    <MessagesClient
      myId={myId}
      initialConversations={conversations}
      initialIsOnline={myProfile?.is_online ?? false}
    />
  );
}
