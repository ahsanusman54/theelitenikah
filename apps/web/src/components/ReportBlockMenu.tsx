"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const REASONS = [
  "Fake profile",
  "Inappropriate photos",
  "Harassment or abuse",
  "Scam or solicitation",
  "Other",
];

export default function ReportBlockMenu({
  myId,
  targetUserId,
  targetName,
  onBlocked,
  variant = "menu",
}: {
  myId: string;
  targetUserId: string;
  targetName: string;
  onBlocked?: () => void;
  variant?: "menu" | "buttons";
}) {
  const [open, setOpen] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("reports").insert({
      reporter_id: myId,
      reported_id: targetUserId,
      reason,
      details: details || null,
    });
    setSubmitting(false);
    setShowReportForm(false);
    setOpen(false);
    setStatus(error ? `Error: ${error.message}` : `${targetName} was reported.`);
  }

  async function handleBlock() {
    if (!confirm(`Block ${targetName}? You won't see each other, like, or message anymore.`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("blocks").insert({
      blocker_id: myId,
      blocked_id: targetUserId,
    });
    setOpen(false);
    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }
    setBlocked(true);
    setStatus(`${targetName} has been blocked.`);
    onBlocked?.();
  }

  if (blocked) {
    return <p className="text-sm text-foreground/60">Blocked.</p>;
  }

  if (variant === "buttons") {
    return (
      <div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowReportForm((v) => !v)}
            className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-gray-50"
          >
            Report
          </button>
          <button
            onClick={handleBlock}
            className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Block
          </button>
        </div>
        {showReportForm && (
          <form onSubmit={submitReport} className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={2}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <button type="submit" disabled={submitting} className="self-start rounded-full bg-red-500 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit report"}
            </button>
          </form>
        )}
        {status && <p className="mt-2 text-sm text-foreground/60">{status}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-foreground hover:bg-white"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => setShowReportForm((v) => !v)}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
          >
            Report
          </button>
          <button
            onClick={handleBlock}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
          >
            Block
          </button>
          {showReportForm && (
            <form onSubmit={submitReport} className="flex flex-col gap-2 border-t border-gray-100 p-3">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Details (optional)"
                rows={2}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
              />
              <button type="submit" disabled={submitting} className="self-start rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          )}
        </div>
      )}
      {status && !open && <p className="absolute right-0 top-9 w-44 text-xs text-foreground/60">{status}</p>}
    </div>
  );
}
