import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileEditor from "./profile-editor";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, bio, photos")
    .eq("user_id", user.id)
    .single();

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>My Profile</h1>
      <ProfileEditor
        userId={user.id}
        initialName={profile?.name ?? ""}
        initialBio={profile?.bio ?? ""}
        initialPhotos={profile?.photos ?? []}
      />
    </main>
  );
}
