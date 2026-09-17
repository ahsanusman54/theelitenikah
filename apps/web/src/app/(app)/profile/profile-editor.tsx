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

const CHILDREN_OPTIONS = [
  { value: "none", label: "No children" },
  { value: "have_children", label: "Have children" },
];

const HABIT_OPTIONS = [
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "Yes" },
];

export default function ProfileEditor({
  userId,
  initialName,
  initialBio,
  initialPhotos,
  initialMaritalStatus,
  initialReligiousPractice,
  initialWillingToRelocate,
  initialDateOfBirth,
  initialHeightCm,
  initialWeightKg,
  initialChildren,
  initialDrinks,
  initialSmokes,
}: {
  userId: string;
  initialName: string;
  initialBio: string;
  initialPhotos: string[];
  initialMaritalStatus: string;
  initialReligiousPractice: string;
  initialWillingToRelocate: boolean;
  initialDateOfBirth: string;
  initialHeightCm: string;
  initialWeightKg: string;
  initialChildren: string;
  initialDrinks: string;
  initialSmokes: string;
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [maritalStatus, setMaritalStatus] = useState(initialMaritalStatus);
  const [religiousPractice, setReligiousPractice] = useState(initialReligiousPractice);
  const [willingToRelocate, setWillingToRelocate] = useState(initialWillingToRelocate);
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
  const [heightCm, setHeightCm] = useState(initialHeightCm);
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [children, setChildren] = useState(initialChildren);
  const [drinks, setDrinks] = useState(initialDrinks);
  const [smokes, setSmokes] = useState(initialSmokes);
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
        date_of_birth: dateOfBirth || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        children: children || null,
        drinks: drinks || null,
        smokes: smokes || null,
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

  const inputClass =
    "mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none";

  return (
    <div>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-foreground/80">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium text-foreground/80">
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium text-foreground/80">
          Marital status
          <select
            value={maritalStatus}
            onChange={(e) => setMaritalStatus(e.target.value)}
            className={inputClass}
          >
            <option value="">Select...</option>
            {MARITAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-foreground/80">
          Religious practice
          <select
            value={religiousPractice}
            onChange={(e) => setReligiousPractice(e.target.value)}
            className={inputClass}
          >
            <option value="">Select...</option>
            {RELIGIOUS_PRACTICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <input
            type="checkbox"
            checked={willingToRelocate}
            onChange={(e) => setWillingToRelocate(e.target.checked)}
          />
          Willing to relocate
        </label>

        <label className="text-sm font-medium text-foreground/80">
          Date of birth
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium text-foreground/80">
            Height (cm)
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Weight (kg)
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="text-sm font-medium text-foreground/80">
          Children
          <select value={children} onChange={(e) => setChildren(e.target.value)} className={inputClass}>
            <option value="">Select...</option>
            {CHILDREN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium text-foreground/80">
            Drinks
            <select value={drinks} onChange={(e) => setDrinks(e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {HABIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-foreground/80">
            Smokes
            <select value={smokes} onChange={(e) => setSmokes(e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {HABIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      <h2 className="mt-8 font-display text-lg font-semibold text-foreground">Photos</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {photos.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt=""
            width={100}
            height={100}
            className="h-24 w-24 rounded-lg object-cover"
          />
        ))}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        disabled={uploading}
        className="mt-3 text-sm"
      />

      {message && <p className="mt-3 text-sm text-foreground/70">{message}</p>}
    </div>
  );
}
