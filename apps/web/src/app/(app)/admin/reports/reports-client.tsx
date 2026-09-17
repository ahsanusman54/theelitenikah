"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  reportedPhoto: string | null;
  reportedStatus: "active" | "deactivated" | "deleted";
};

const STATUS_FILTERS = ["pending", "reviewed", "dismissed", "all"] as const;

export default function ReportsClient({ initialReports }: { initialReports: ReportRow[] }) {
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter]
  );

  async function handleReview(reportId: string, status: "reviewed" | "dismissed", action: "deactivate" | "delete" | null) {
    if (action && !confirm(`This will ${action} the reported member's account. Continue?`)) return;
    setBusyId(reportId);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_review_report", {
      p_report_id: reportId,
      p_new_status: status,
      p_action: action,
    });
    setBusyId(null);
    if (!error) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status, reportedStatus: action ? (action === "delete" ? "deleted" : "deactivated") : r.reportedStatus }
            : r
        )
      );
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Report Management</h1>

      <div className="mt-4 flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              filter === f ? "bg-brand-purple text-white" : "border border-gray-200 text-foreground/60"
            }`}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {filtered.length === 0 && (
          <p className="rounded-2xl bg-white p-10 text-center text-foreground/50 shadow-sm">No reports here.</p>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                  {r.reportedPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.reportedPhoto} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <a href={`/admin/users/${r.reportedId}`} className="font-semibold text-brand-purple hover:underline">
                    {r.reportedName}
                  </a>
                  <p className="text-xs text-foreground/50">
                    Reported by {r.reporterName} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    r.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : r.status === "reviewed"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {r.status}
                </span>
                {r.reportedStatus !== "active" && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                    account {r.reportedStatus}
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm font-medium text-foreground">{r.reason}</p>
            {r.details && <p className="mt-1 text-sm text-foreground/60">{r.details}</p>}

            {r.status === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleReview(r.id, "dismissed", null)}
                  disabled={busyId === r.id}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleReview(r.id, "reviewed", null)}
                  disabled={busyId === r.id}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Mark reviewed (no action)
                </button>
                <button
                  onClick={() => handleReview(r.id, "reviewed", "deactivate")}
                  disabled={busyId === r.id}
                  className="rounded-full bg-yellow-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  Deactivate account
                </button>
                <button
                  onClick={() => handleReview(r.id, "reviewed", "delete")}
                  disabled={busyId === r.id}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Delete account
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
