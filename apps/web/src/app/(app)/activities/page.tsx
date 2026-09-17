import { createSupabaseServerClient } from "@/lib/supabase/server";
import ActivitiesClient, { type ActivityProfile } from "./activities-client";

export default async function ActivitiesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user!.id;

  const profileCols = "user_id, name, photos, is_verified, is_premium, date_of_birth";

  async function loadProfiles(ids: string[]): Promise<Map<string, ActivityProfile>> {
    if (ids.length === 0) return new Map();
    const { data } = await supabase.from("profiles").select(profileCols).in("user_id", ids);
    return new Map((data ?? []).map((p) => [p.user_id, p]));
  }

  // Likes me
  const { data: likesMeRows } = await supabase
    .from("likes")
    .select("from_user, is_super, created_at")
    .eq("to_user", myId)
    .order("created_at", { ascending: false });
  const likesMeProfiles = await loadProfiles((likesMeRows ?? []).map((r) => r.from_user));
  const likesMe = (likesMeRows ?? [])
    .map((r) => likesMeProfiles.get(r.from_user))
    .filter((p): p is ActivityProfile => !!p);

  // You like
  const { data: youLikeRows } = await supabase
    .from("likes")
    .select("to_user, is_super, created_at")
    .eq("from_user", myId)
    .order("created_at", { ascending: false });
  const youLikeProfiles = await loadProfiles((youLikeRows ?? []).map((r) => r.to_user));
  const youLike = (youLikeRows ?? [])
    .map((r) => youLikeProfiles.get(r.to_user))
    .filter((p): p is ActivityProfile => !!p);

  // Who's viewed me
  const { data: viewRows } = await supabase
    .from("visits")
    .select("visitor_id, viewed_at")
    .eq("visited_id", myId)
    .order("viewed_at", { ascending: false });
  const viewProfiles = await loadProfiles((viewRows ?? []).map((r) => r.visitor_id));
  const whoViewedMe = (viewRows ?? [])
    .map((r) => viewProfiles.get(r.visitor_id))
    .filter((p): p is ActivityProfile => !!p);

  // Suitable: everyone not yet liked, excluding self
  const excludeIds = new Set([myId, ...(youLikeRows ?? []).map((r) => r.to_user)]);
  const { data: allProfiles } = await supabase.from("profiles").select(profileCols).limit(200);
  const suitable = (allProfiles ?? []).filter((p) => !excludeIds.has(p.user_id));

  return (
    <ActivitiesClient
      likesMe={likesMe}
      youLike={youLike}
      whoViewedMe={whoViewedMe}
      suitable={suitable}
    />
  );
}
