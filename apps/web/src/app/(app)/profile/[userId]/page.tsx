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
      "user_id, name, bio, photos, is_verified, is_premium, is_online, date_of_birth, marital_status, religious_practice, willing_to_relocate, children, drinks, smokes, gender, country, city, occupation, education, religion, languages, interests, sports, interested_in_gender, preferred_age_min, preferred_age_max, last_active_at, photo_privacy"
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

  return (
    <ProfileDetailClient
      myId={myId}
      userId={profile.user_id}
      name={profile.name}
      bio={profile.bio}
      photos={profile.photo_privacy && !match ? [] : profile.photos ?? []}
      isVerified={profile.is_verified}
      isPremium={profile.is_premium}
      isOnline={profile.is_online}
      age={age}
      matchScore={matchScore}
      maritalStatus={profile.marital_status}
      religiousPractice={profile.religious_practice}
      willingToRelocate={profile.willing_to_relocate}
      children={profile.children}
      drinks={profile.drinks}
      smokes={profile.smokes}
      gender={profile.gender}
      country={profile.country}
      city={profile.city}
      occupation={profile.occupation}
      education={profile.education}
      religion={profile.religion}
      languages={profile.languages ?? []}
      interests={profile.interests ?? []}
      sports={profile.sports ?? []}
      interestedInGender={profile.interested_in_gender}
      preferredAgeMin={profile.preferred_age_min}
      preferredAgeMax={profile.preferred_age_max}
      lastActiveAt={profile.last_active_at}
      myCreditBalance={myCredits?.balance ?? 0}
      alreadyLiked={!!existingLike}
      alreadySuperLiked={!!existingLike?.is_super}
      theyLikedYou={!!theyLikedMe}
      isMatched={!!match}
    />
  );
}
