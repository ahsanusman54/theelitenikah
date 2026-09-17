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
      "name, bio, photos, marital_status, religious_practice, willing_to_relocate, date_of_birth, height_cm, weight_kg, children, drinks, smokes"
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
        />
      </div>
    </main>
  );
}
