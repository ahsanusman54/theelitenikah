"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type VerificationRequest = {
  id: string;
  userName: string;
  userPhoto: string | null;
  documentType: string;
  documentNumber: string;
  documentUrl: string | null;
  createdAt: string;
};

const DOC_LABELS: Record<string, string> = {
  cnic: "CNIC",
  passport: "Passport",
  nin: "NIN",
  ssn: "SSN",
};

export default function VerificationsClient({ initialRequests }: { initialRequests: VerificationRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleReview(id: string, approve: boolean) {
    setBusyId(id);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("review_verification", { p_request_id: id, p_approve: approve });
    setBusyId(null);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Verification Requests</h1>
      <p className="mt-1 text-sm text-foreground/60">
        {requests.length} pending request{requests.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {requests.length === 0 && (
          <p className="rounded-2xl bg-white p-10 text-center text-foreground/50 shadow-sm">
            No pending verification requests.
          </p>
        )}
        {requests.map((r) => (
          <div key={r.id} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
              {r.userPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.userPhoto} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{r.userName}</p>
              <p className="text-sm text-foreground/60">
                {DOC_LABELS[r.documentType] ?? r.documentType}: {r.documentNumber}
              </p>
              {r.documentUrl && (
                <a href={r.documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-purple underline">
                  View document
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleReview(r.id, true)}
                disabled={busyId === r.id}
                className="rounded-full bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleReview(r.id, false)}
                disabled={busyId === r.id}
                className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
