import { createSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient, { type BlockedProfile } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user!.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_visibility, photo_privacy, email_notification_prefs, push_notifications_enabled")
    .eq("user_id", myId)
    .single();

  const { data: blocks } = await supabase.from("blocks").select("id, blocked_id").eq("blocker_id", myId);
  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);
  const { data: blockedProfiles } = blockedIds.length
    ? await supabase.from("profiles").select("user_id, name, photos").in("user_id", blockedIds)
    : { data: [] };
  const profileById = new Map((blockedProfiles ?? []).map((p) => [p.user_id, p]));

  const blocked: BlockedProfile[] = (blocks ?? []).map((b) => ({
    blockId: b.id,
    userId: b.blocked_id,
    name: profileById.get(b.blocked_id)?.name ?? "Unknown",
    photo: profileById.get(b.blocked_id)?.photos?.[0] ?? null,
  }));

  return (
    <SettingsClient
      userId={myId}
      email={user!.email ?? ""}
      initialProfileVisibility={profile?.profile_visibility ?? "everyone"}
      initialPhotoPrivacy={profile?.photo_privacy ?? false}
      initialEmailPrefs={
        profile?.email_notification_prefs ?? {
          verification: true,
          new_messages: true,
          new_visitors: true,
          likes: true,
          new_matches: true,
          promotions: true,
        }
      }
      initialPushNotifications={profile?.push_notifications_enabled ?? true}
      initialBlocked={blocked}
    />
  );
}
