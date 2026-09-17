import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import { CallProvider } from "@/components/calls/CallContext";
import CallScreen from "@/components/calls/CallScreen";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("user_id", user.id)
    .single();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, content, read_status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <CallProvider myId={user.id} myName={profile?.name ?? user.email ?? "You"}>
      <div className="flex min-h-full flex-col">
        <Navbar
          userId={user.id}
          userName={profile?.name ?? null}
          userEmail={user.email ?? ""}
          initialNotifications={notifications ?? []}
        />
        <div className="flex-1 bg-background">{children}</div>
      </div>
      <CallScreen />
    </CallProvider>
  );
}
