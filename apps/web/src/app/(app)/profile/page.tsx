import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileEditor from "./profile-editor";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "name, bio, photos, marital_status, religious_practice, willing_to_relocate, date_of_birth, height_cm, weight_kg, children, drinks, smokes, gender, country, city, occupation, education, religion, languages, interests, sports, interested_in_gender, preferred_age_min, preferred_age_max, verification_requested_at"
    )
    .eq("user_id", user!.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <ProfileEditor
          userId={user!.id}
          initialName={profile?.name ?? ""}
          initialBio={profile?.bio ?? ""}
          initialPhotos={profile?.photos ?? []}
          initialMaritalStatus={profile?.marital_status ?? ""}
          initialReligiousPractice={profile?.religious_practice ?? ""}
          initialWillingToRelocate={profile?.willing_to_relocate ?? false}
          initialDateOfBirth={profile?.date_of_birth ?? ""}
          initialHeightCm={profile?.height_cm?.toString() ?? ""}
          initialWeightKg={profile?.weight_kg?.toString() ?? ""}
          initialChildren={profile?.children ?? ""}
          initialDrinks={profile?.drinks ?? ""}
          initialSmokes={profile?.smokes ?? ""}
          initialGender={profile?.gender ?? ""}
          initialCountry={profile?.country ?? ""}
          initialCity={profile?.city ?? ""}
          initialOccupation={profile?.occupation ?? ""}
          initialEducation={profile?.education ?? ""}
          initialReligion={profile?.religion ?? ""}
          initialLanguages={profile?.languages ?? []}
          initialInterests={profile?.interests ?? []}
          initialSports={profile?.sports ?? []}
          initialInterestedInGender={profile?.interested_in_gender ?? ""}
          initialPreferredAgeMin={profile?.preferred_age_min?.toString() ?? ""}
          initialPreferredAgeMax={profile?.preferred_age_max?.toString() ?? ""}
          initialVerificationRequestedAt={profile?.verification_requested_at ?? null}
        />
      </div>
    </main>
  );
}
