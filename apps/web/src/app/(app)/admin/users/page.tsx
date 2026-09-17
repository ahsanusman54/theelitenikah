import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import UsersClient, { type AdminUserRow } from "./users-client";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user!.id)
    .single();

  const myRole = myProfile?.role ?? "user";
  const isAdmin = ["admin", "super_admin", "moderator"].includes(myRole);
  if (!isAdmin) {
    redirect("/");
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("user_id, name, photos, role, account_status, is_verified, is_premium, created_at")
    .order("created_at", { ascending: false });

  return (
    <UsersClient
      myUserId={user!.id}
      myRole={myRole as "admin" | "super_admin" | "moderator"}
      initialUsers={(users ?? []) as AdminUserRow[]}
    />
  );
}
