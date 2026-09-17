import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeMatchScore, computeAge } from "../../discover/match-score";
import ProfileDetailClient from "./profile-detail-client";

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
      "user_id, name, bio, photos, is_verified, is_premium, is_online, date_of_birth, marital_status, religious_practice, willing_to_relocate, children, drinks, smokes, gender, country, city, occupation, education, religion, languages, interests, sports, interested_in_gender, preferred_age_min, preferred_age_max, last_active_at, photo_privacy, profile_visibility"
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

  const { data: myCredits } = await supabase.from("credits").select("balance").eq("user_id", myId).single();

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

  // "Matches only" visibility restricts the detail page, not Discover/
  // Search listing -- see the migration notes for why (you must still be
  // findable to ever become a match in the first place).
  const isLimited = profile.profile_visibility === "matches_only" && !match && userId !== myId;

  return (
    <ProfileDetailClient
      myId={myId}
      userId={profile.user_id}
      name={profile.name}
      bio={isLimited ? null : profile.bio}
      photos={profile.photo_privacy && !match ? [] : profile.photos ?? []}
      isVerified={profile.is_verified}
      isPremium={profile.is_premium}
      isOnline={profile.is_online}
      age={age}
      matchScore={matchScore}
      isLimitedProfile={isLimited}
      maritalStatus={isLimited ? null : profile.marital_status}
      religiousPractice={isLimited ? null : profile.religious_practice}
      willingToRelocate={isLimited ? null : profile.willing_to_relocate}
      children={isLimited ? null : profile.children}
      drinks={isLimited ? null : profile.drinks}
      smokes={isLimited ? null : profile.smokes}
      gender={isLimited ? null : profile.gender}
      country={isLimited ? null : profile.country}
      city={isLimited ? null : profile.city}
      occupation={isLimited ? null : profile.occupation}
      education={isLimited ? null : profile.education}
      religion={isLimited ? null : profile.religion}
      languages={isLimited ? [] : profile.languages ?? []}
      interests={isLimited ? [] : profile.interests ?? []}
      sports={isLimited ? [] : profile.sports ?? []}
      interestedInGender={isLimited ? null : profile.interested_in_gender}
      preferredAgeMin={isLimited ? null : profile.preferred_age_min}
      preferredAgeMax={isLimited ? null : profile.preferred_age_max}
      lastActiveAt={profile.last_active_at}
      myCreditBalance={myCredits?.balance ?? 0}
      alreadyLiked={!!existingLike}
      alreadySuperLiked={!!existingLike?.is_super}
      theyLikedYou={!!theyLikedMe}
      isMatched={!!match}
    />
  );
}
