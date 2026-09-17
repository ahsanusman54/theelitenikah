"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const DOC_TYPES = [
  { value: "cnic", label: "CNIC" },
  { value: "passport", label: "Passport" },
  { value: "nin", label: "NIN" },
  { value: "ssn", label: "SSN" },
];

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

export default function VerificationModal({
  userId,
  onClose,
  onSubmitted,
}: {
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [docType, setDocType] = useState("cnic");
  const [docNumber, setDocNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!docNumber.trim()) {
      setError("Please enter your document number.");
      return;
    }
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      setError("File must be JPG, JPEG, PNG, or PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be 2MB or smaller.");
      return;
    }

    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${userId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("verification-documents").upload(path, file);
    if (uploadError) {
      setSubmitting(false);
      setError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("verification_requests").insert({
      user_id: userId,
      document_type: docType,
      document_number: docNumber.trim(),
      document_path: path,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-xl text-foreground/50 hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium text-brand-purple">
            CNIC / Passport / NIN / SSN <span className="text-red-500">*</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>

          <input
            type="text"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            placeholder="Document number"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
          />

          <div>
            <p className="text-sm font-medium text-brand-purple">Upload Document</p>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 text-sm"
            />
            <p className="mt-1 text-xs text-foreground/50">
              Accepted file types: JPG, JPEG, PNG, PDF (Max size: 2MB)
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-navbar px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}
