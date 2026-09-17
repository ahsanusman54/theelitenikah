"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MARITAL_STATUS_OPTIONS = [
  { value: "never_married", label: "Never married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const RELIGIOUS_PRACTICE_OPTIONS = [
  { value: "very_practicing", label: "Very practicing" },
  { value: "practicing", label: "Practicing" },
  { value: "moderately_practicing", label: "Moderately practicing" },
  { value: "learning", label: "Learning" },
];

export default function ProfileEditor({
  userId,
  initialName,
  initialBio,
  initialPhotos,
  initialMaritalStatus,
  initialReligiousPractice,
  initialWillingToRelocate,
}: {
  userId: string;
  initialName: string;
  initialBio: string;
  initialPhotos: string[];
  initialMaritalStatus: string;
  initialReligiousPractice: string;
  initialWillingToRelocate: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [maritalStatus, setMaritalStatus] = useState(initialMaritalStatus);
  const [religiousPractice, setReligiousPractice] = useState(initialReligiousPractice);
  const [willingToRelocate, setWillingToRelocate] = useState(initialWillingToRelocate);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        bio,
        photos,
        marital_status: maritalStatus || null,
        religious_practice: religiousPractice || null,
        willing_to_relocate: willingToRelocate,
      })
      .eq("user_id", userId);

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : "Saved.");
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const path = `${userId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, file);

    if (uploadError) {
      setUploading(false);
      setMessage(`Upload error: ${uploadError.message}`);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-photos").getPublicUrl(path);

    const updatedPhotos = [...photos, publicUrl];
    setPhotos(updatedPhotos);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ photos: updatedPhotos })
      .eq("user_id", userId);

    setUploading(false);
    setMessage(updateError ? `Error: ${updateError.message}` : "Photo uploaded.");
  }

  return (
    <div>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Marital status
          <select
            value={maritalStatus}
            onChange={(e) => setMaritalStatus(e.target.value)}
            style={{ display: "block", width: "100%" }}
          >
            <option value="">Select...</option>
            {MARITAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Religious practice
          <select
            value={religiousPractice}
            onChange={(e) => setReligiousPractice(e.target.value)}
            style={{ display: "block", width: "100%" }}
          >
            <option value="">Select...</option>
            {RELIGIOUS_PRACTICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={willingToRelocate}
            onChange={(e) => setWillingToRelocate(e.target.checked)}
          />
          Willing to relocate
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      <h2 style={{ marginTop: 32 }}>Photos</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {photos.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt="" width={100} height={100} style={{ objectFit: "cover" }} />
        ))}
      </div>
      <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
