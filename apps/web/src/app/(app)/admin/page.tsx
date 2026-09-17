import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function count(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, table: string, filters?: Record<string, string>) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filters) {
    for (const [k, v] of Object.entries(filters)) query = query.eq(k, v);
  }
  const { count: c } = await query;
  return c ?? 0;
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [totalUsers, activeUsers, pendingVerifications, pendingReports, totalMatches, totalMessages] = await Promise.all([
    count(supabase, "profiles"),
    count(supabase, "profiles", { account_status: "active" }),
    count(supabase, "verification_requests", { status: "pending" }),
    count(supabase, "reports", { status: "pending" }),
    count(supabase, "matches"),
    count(supabase, "messages"),
  ]);

  const cards = [
    { label: "Total members", value: totalUsers, href: "/admin/users" },
    { label: "Active accounts", value: activeUsers, href: "/admin/users" },
    { label: "Pending verifications", value: pendingVerifications, href: "/admin/verifications", alert: pendingVerifications > 0 },
    { label: "Pending reports", value: pendingReports, href: "/admin/reports", alert: pendingReports > 0 },
    { label: "Total matches", value: totalMatches, href: "/admin/users" },
    { label: "Messages sent", value: totalMessages, href: "/admin/users" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-2xl bg-white p-5 shadow-sm hover:shadow-md ${c.alert ? "ring-2 ring-brand-pink" : ""}`}
          >
            <p className="text-3xl font-bold text-foreground">{c.value}</p>
            <p className="mt-1 text-sm text-foreground/60">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin/reports" className="rounded-full border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Review reports</Link>
          <Link href="/admin/verifications" className="rounded-full border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Review verifications</Link>
          <Link href="/admin/users" className="rounded-full border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Manage users</Link>
          <Link href="/admin/settings" className="rounded-full border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Feature flags & settings</Link>
        </div>
      </div>
    </div>
  );
}
