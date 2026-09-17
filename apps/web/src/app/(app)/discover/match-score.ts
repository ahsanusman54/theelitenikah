export type MatchableProfile = {
  marital_status: string | null;
  religious_practice: string | null;
  willing_to_relocate: boolean | null;
  children: string | null;
  drinks: string | null;
  smokes: string | null;
};

/**
 * A simple, honest compatibility score: the percentage of fields both
 * profiles have filled in that also agree. Not an AI recommendation --
 * that's flagged as future work in the spec (Section 9.2). Returns null
 * when there isn't enough data on either side to compare.
 */
export function computeMatchScore(a: MatchableProfile, b: MatchableProfile): number | null {
  const fields: (keyof MatchableProfile)[] = [
    "marital_status",
    "religious_practice",
    "willing_to_relocate",
    "children",
    "drinks",
    "smokes",
  ];

  let comparable = 0;
  let agree = 0;

  for (const field of fields) {
    const va = a[field];
    const vb = b[field];
    if (va === null || va === undefined || vb === null || vb === undefined) continue;
    comparable += 1;
    if (va === vb) agree += 1;
  }

  if (comparable === 0) return null;
  return Math.round((agree / comparable) * 100);
}

export function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}
