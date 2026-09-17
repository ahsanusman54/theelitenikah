import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import VerificationsClient, { type VerificationRequest } from "./verifications-client";

export default async function AdminVerificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user!.id)
    .single();

  const isAdmin = ["admin", "super_admin", "moderator"].includes(myProfile?.role ?? "");
  if (!isAdmin) {
    redirect("/");
  }

  const { data: requests } = await supabase
    .from("verification_requests")
    .select("id, user_id, document_type, document_number, document_path, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const userIds = (requests ?? []).map((r) => r.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, name, photos").in("user_id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const withUrls: VerificationRequest[] = [];
  for (const r of requests ?? []) {
    const { data: signed } = await supabase.storage
      .from("verification-documents")
      .createSignedUrl(r.document_path, 3600);
    const profile = profileById.get(r.user_id);
    withUrls.push({
      id: r.id,
      userName: profile?.name ?? "Unknown",
      userPhoto: profile?.photos?.[0] ?? null,
      documentType: r.document_type,
      documentNumber: r.document_number,
      documentUrl: signed?.signedUrl ?? null,
      createdAt: r.created_at,
    });
  }

  return <VerificationsClient initialRequests={withUrls} />;
}
