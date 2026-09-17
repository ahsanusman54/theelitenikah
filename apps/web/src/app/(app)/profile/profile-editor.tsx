"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import VerificationModal from "@/components/VerificationModal";

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

const GENDER_OPTIONS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
];

type Props = {
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
  initialGender: string;
  initialCountry: string;
  initialCity: string;
  initialOccupation: string;
  initialEducation: string;
  initialReligion: string;
  initialLanguages: string[];
  initialInterests: string[];
  initialSports: string[];
  initialInterestedInGender: string;
  initialPreferredAgeMin: string;
  initialPreferredAgeMax: string;
  initialVerificationRequestedAt: string | null;
};

function parseList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProfileEditor(props: Props) {
  const { userId } = props;
  const [name, setName] = useState(props.initialName);
  const [bio, setBio] = useState(props.initialBio);
  const [photos, setPhotos] = useState<string[]>(props.initialPhotos);
  const [maritalStatus, setMaritalStatus] = useState(props.initialMaritalStatus);
  const [religiousPractice, setReligiousPractice] = useState(props.initialReligiousPractice);
  const [willingToRelocate, setWillingToRelocate] = useState(props.initialWillingToRelocate);
  const [dateOfBirth, setDateOfBirth] = useState(props.initialDateOfBirth);
  const [heightCm, setHeightCm] = useState(props.initialHeightCm);
  const [weightKg, setWeightKg] = useState(props.initialWeightKg);
  const [children, setChildren] = useState(props.initialChildren);
  const [drinks, setDrinks] = useState(props.initialDrinks);
  const [smokes, setSmokes] = useState(props.initialSmokes);
  const [gender, setGender] = useState(props.initialGender);
  const [country, setCountry] = useState(props.initialCountry);
  const [city, setCity] = useState(props.initialCity);
  const [occupation, setOccupation] = useState(props.initialOccupation);
  const [education, setEducation] = useState(props.initialEducation);
  const [religion, setReligion] = useState(props.initialReligion);
  const [languages, setLanguages] = useState(props.initialLanguages.join(", "));
  const [interests, setInterests] = useState(props.initialInterests.join(", "));
  const [sports, setSports] = useState(props.initialSports.join(", "));
  const [interestedInGender, setInterestedInGender] = useState(props.initialInterestedInGender);
  const [preferredAgeMin, setPreferredAgeMin] = useState(props.initialPreferredAgeMin);
  const [preferredAgeMax, setPreferredAgeMax] = useState(props.initialPreferredAgeMax);
  const [verificationRequestedAt, setVerificationRequestedAt] = useState(props.initialVerificationRequestedAt);

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
        gender: gender || null,
        country: country || null,
        city: city || null,
        occupation: occupation || null,
        education: education || null,
        religion: religion || null,
        languages: parseList(languages),
        interests: parseList(interests),
        sports: parseList(sports),
        interested_in_gender: interestedInGender || null,
        preferred_age_min: preferredAgeMin ? Number(preferredAgeMin) : null,
        preferred_age_max: preferredAgeMax ? Number(preferredAgeMax) : null,
      })
      .eq("user_id", userId);

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : "Saved.");
  }

  const [showVerificationModal, setShowVerificationModal] = useState(false);

  async function handleVerificationSubmitted() {
    setShowVerificationModal(false);
    const supabase = createSupabaseBrowserClient();
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ verification_requested_at: now }).eq("user_id", userId);
    setVerificationRequestedAt(now);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const path = `${userId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file);

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

  async function handlePhotoDelete(url: string) {
    setMessage(null);
    const supabase = createSupabaseBrowserClient();

    const marker = "/profile-photos/";
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = url.slice(idx + marker.length);
      await supabase.storage.from("profile-photos").remove([path]);
    }

    const updatedPhotos = photos.filter((p) => p !== url);
    setPhotos(updatedPhotos);

    const { error } = await supabase.from("profiles").update({ photos: updatedPhotos }).eq("user_id", userId);
    setMessage(error ? `Error: ${error.message}` : "Photo deleted.");
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none";
  const sectionClass = "mt-8 border-t border-gray-100 pt-6";
  const sectionTitleClass = "font-display text-lg font-semibold text-foreground";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground/80">Verification</p>
          <p className="text-xs text-foreground/50">
            {verificationRequestedAt ? "Verification requested — pending review." : "Not verified yet."}
          </p>
        </div>
        <button
          onClick={() => setShowVerificationModal(true)}
          disabled={!!verificationRequestedAt}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-foreground/70 hover:bg-gray-50 disabled:opacity-50"
        >
          {verificationRequestedAt ? "Requested" : "Request Verification"}
        </button>
      </div>

      {showVerificationModal && (
        <VerificationModal
          userId={userId}
          onClose={() => setShowVerificationModal(false)}
          onSubmitted={handleVerificationSubmitted}
        />
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Basics</h2>
          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground/80">
              Name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-foreground/80">
              Bio
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-foreground/80">
                Gender
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-foreground/80">
                Date of birth
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
              </label>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>About</h2>
          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground/80">
              Marital status
              <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {MARITAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-foreground/80">
                Country
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground/80">
                City
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-foreground/80">
                Occupation
                <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground/80">
                Education
                <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} className={inputClass} />
              </label>
            </div>
            <label className="text-sm font-medium text-foreground/80">
              Children
              <select value={children} onChange={(e) => setChildren(e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {CHILDREN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <input type="checkbox" checked={willingToRelocate} onChange={(e) => setWillingToRelocate(e.target.checked)} />
              Willing to relocate
            </label>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Base</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-foreground/80">
                Height (cm)
                <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground/80">
                Weight (kg)
                <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={inputClass} />
              </label>
            </div>
            <label className="text-sm font-medium text-foreground/80">
              Languages (comma-separated)
              <input type="text" value={languages} onChange={(e) => setLanguages(e.target.value)} className={inputClass} placeholder="English, Urdu, Arabic" />
            </label>
            <label className="text-sm font-medium text-foreground/80">
              Religion
              <input type="text" value={religion} onChange={(e) => setReligion(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm font-medium text-foreground/80">
              Religious practice
              <select value={religiousPractice} onChange={(e) => setReligiousPractice(e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {RELIGIOUS_PRACTICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-foreground/80">
                Drinks
                <select value={drinks} onChange={(e) => setDrinks(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {HABIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-foreground/80">
                Smokes
                <select value={smokes} onChange={(e) => setSmokes(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {HABIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Interests &amp; Hobbies</h2>
          <label className="mt-4 block text-sm font-medium text-foreground/80">
            Interests (comma-separated)
            <input type="text" value={interests} onChange={(e) => setInterests(e.target.value)} className={inputClass} placeholder="Cooking, Reading, Travel" />
          </label>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Sport</h2>
          <label className="mt-4 block text-sm font-medium text-foreground/80">
            Sports (comma-separated)
            <input type="text" value={sports} onChange={(e) => setSports(e.target.value)} className={inputClass} placeholder="Hiking, Cycling" />
          </label>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>What I&apos;m looking for</h2>
          <div className="mt-4 flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground/80">
              Interested in
              <select value={interestedInGender} onChange={(e) => setInterestedInGender(e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium text-foreground/80">
                Age from
                <input type="number" value={preferredAgeMin} onChange={(e) => setPreferredAgeMin(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm font-medium text-foreground/80">
                Age to
                <input type="number" value={preferredAgeMax} onChange={(e) => setPreferredAgeMax(e.target.value)} className={inputClass} />
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 self-start rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Photos</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" width={100} height={100} className="h-24 w-24 rounded-lg object-cover" />
              <button
                onClick={() => handlePhotoDelete(url)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white opacity-0 shadow group-hover:opacity-100"
                aria-label="Delete photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="mt-3 text-sm" />
      </div>

      {message && <p className="mt-3 text-sm text-foreground/70">{message}</p>}
    </div>
  );
}
