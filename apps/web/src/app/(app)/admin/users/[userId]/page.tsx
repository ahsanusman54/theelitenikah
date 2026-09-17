import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import UserDetailClient, { type ChatSummary, type ReportSummary } from "./user-detail-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, name, bio, photos, role, account_status, is_verified, is_premium, is_online, date_of_birth, gender, country, city, created_at, last_active_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) notFound();

  const [likesGiven, likesReceived, matches, visitsMade, visitsReceived] = await Promise.all([
    supabase.from("likes").select("id", { count: "exact", head: true }).eq("from_user", userId),
    supabase.from("likes").select("id", { count: "exact", head: true }).eq("to_user", userId),
    supabase.from("matches").select("id", { count: "exact", head: true }).or(`user_a.eq.${userId},user_b.eq.${userId}`),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("visitor_id", userId),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("visited_id", userId),
  ]);

  const { data: chats } = await supabase
    .from("chats")
    .select("id, user_a, user_b, created_at")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  const otherIds = (chats ?? []).map((c) => (c.user_a === userId ? c.user_b : c.user_a));
  const { data: chatProfiles } = otherIds.length
    ? await supabase.from("profiles").select("user_id, name").in("user_id", otherIds)
    : { data: [] };
  const nameById = new Map((chatProfiles ?? []).map((p) => [p.user_id, p.name]));

  const chatSummaries: ChatSummary[] = (chats ?? []).map((c) => ({
    chatId: c.id,
    otherName: nameById.get(c.user_a === userId ? c.user_b : c.user_a) ?? "Unknown",
    createdAt: c.created_at,
  }));

  const { data: reportsAgainst } = await supabase
    .from("reports")
    .select("id, reporter_id, reason, details, status, created_at")
    .eq("reported_id", userId)
    .order("created_at", { ascending: false });
  const { data: reportsFiled } = await supabase
    .from("reports")
    .select("id, reported_id, reason, details, status, created_at")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  const reportUserIds = Array.from(
    new Set([...(reportsAgainst ?? []).map((r) => r.reporter_id), ...(reportsFiled ?? []).map((r) => r.reported_id)])
  );
  const { data: reportProfiles } = reportUserIds.length
    ? await supabase.from("profiles").select("user_id, name").in("user_id", reportUserIds)
    : { data: [] };
  const reportNameById = new Map((reportProfiles ?? []).map((p) => [p.user_id, p.name]));

  const reportsAgainstSummary: ReportSummary[] = (reportsAgainst ?? []).map((r) => ({
    id: r.id,
    otherName: reportNameById.get(r.reporter_id) ?? "Unknown",
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at,
  }));
  const reportsFiledSummary: ReportSummary[] = (reportsFiled ?? []).map((r) => ({
    id: r.id,
    otherName: reportNameById.get(r.reported_id) ?? "Unknown",
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at,
  }));

  return (
    <UserDetailClient
      userId={profile.user_id}
      name={profile.name}
      bio={profile.bio}
      photo={profile.photos?.[0] ?? null}
      role={profile.role}
      accountStatus={profile.account_status}
      isVerified={profile.is_verified}
      isPremium={profile.is_premium}
      isOnline={profile.is_online}
      dateOfBirth={profile.date_of_birth}
      gender={profile.gender}
      country={profile.country}
      city={profile.city}
      joinedAt={profile.created_at}
      lastActiveAt={profile.last_active_at}
      stats={{
        likesGiven: likesGiven.count ?? 0,
        likesReceived: likesReceived.count ?? 0,
        matches: matches.count ?? 0,
        visitsMade: visitsMade.count ?? 0,
        visitsReceived: visitsReceived.count ?? 0,
      }}
      chats={chatSummaries}
      reportsAgainst={reportsAgainstSummary}
      reportsFiled={reportsFiledSummary}
    />
  );
}
