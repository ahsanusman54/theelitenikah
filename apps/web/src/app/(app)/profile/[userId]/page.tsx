import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeMatchScore, computeAge } from "../../discover/match-score";
import ProfileDetailClient from "./profile-detail-client";

const FIELD_LABELS: Record<string, Record<string, string>> = {
  marital_status: { never_married: "Never married", divorced: "Divorced", widowed: "Widowed" },
  religious_practice: {
    very_practicing: "Very practicing",
    practicing: "Practicing",
    moderately_practicing: "Moderately practicing",
    learning: "Learning",
  },
  children: { none: "No children", have_children: "Has children" },
  drinks: { no: "Doesn't drink", occasionally: "Drinks occasionally", yes: "Drinks" },
  smokes: { no: "Doesn't smoke", occasionally: "Smokes occasionally", yes: "Smokes" },
};

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user!.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, name, bio, photos, is_verified, is_premium, is_online, date_of_birth, marital_status, religious_practice, willing_to_relocate, children, drinks, smokes"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) notFound();

  // Record the view (upsert so repeat visits update the timestamp instead
  // of spamming new rows / new "viewed your profile" notifications).
  if (userId !== myId) {
    await supabase
      .from("visits")
      .upsert({ visitor_id: myId, visited_id: userId, viewed_at: new Date().toISOString() }, { onConflict: "visitor_id,visited_id" });
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("marital_status, religious_practice, willing_to_relocate, children, drinks, smokes")
    .eq("user_id", myId)
    .single();

  const { data: existingLike } = await supabase
    .from("likes")
    .select("id, is_super")
    .eq("from_user", myId)
    .eq("to_user", userId)
    .maybeSingle();

  const { data: theyLikedMe } = await supabase
    .from("likes")
    .select("id")
    .eq("from_user", userId)
    .eq("to_user", myId)
    .maybeSingle();

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .maybeSingle();

  const matchScore = myProfile ? computeMatchScore(myProfile, profile) : null;
  const age = computeAge(profile.date_of_birth);

  const details = [
    profile.marital_status && FIELD_LABELS.marital_status[profile.marital_status],
    profile.religious_practice && FIELD_LABELS.religious_practice[profile.religious_practice],
    profile.children && FIELD_LABELS.children[profile.children],
    profile.drinks && FIELD_LABELS.drinks[profile.drinks],
    profile.smokes && FIELD_LABELS.smokes[profile.smokes],
    profile.willing_to_relocate !== null &&
      (profile.willing_to_relocate ? "Willing to relocate" : "Not willing to relocate"),
  ].filter(Boolean) as string[];

  return (
    <ProfileDetailClient
      myId={myId}
      userId={profile.user_id}
      name={profile.name}
      bio={profile.bio}
      photos={profile.photos ?? []}
      isVerified={profile.is_verified}
      isPremium={profile.is_premium}
      isOnline={profile.is_online}
      age={age}
      matchScore={matchScore}
      details={details}
      alreadyLiked={!!existingLike}
      alreadySuperLiked={!!existingLike?.is_super}
      theyLikedYou={!!theyLikedMe}
      isMatched={!!match}
    />
  );
}
