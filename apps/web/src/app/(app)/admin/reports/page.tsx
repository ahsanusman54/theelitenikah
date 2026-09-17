import { createSupabaseServerClient } from "@/lib/supabase/server";
import ReportsClient, { type ReportRow } from "./reports-client";

export default async function AdminReportsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, reporter_id, reported_id, reason, details, status, created_at")
    .order("created_at", { ascending: false });

  const userIds = Array.from(
    new Set((reports ?? []).flatMap((r) => [r.reporter_id, r.reported_id]))
  );
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, name, photos, account_status").in("user_id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const rows: ReportRow[] = (reports ?? []).map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at,
    reporterName: profileById.get(r.reporter_id)?.name ?? "Unknown",
    reportedId: r.reported_id,
    reportedName: profileById.get(r.reported_id)?.name ?? "Unknown",
    reportedPhoto: profileById.get(r.reported_id)?.photos?.[0] ?? null,
    reportedStatus: profileById.get(r.reported_id)?.account_status ?? "active",
  }));

  return <ReportsClient initialReports={rows} />;
}
