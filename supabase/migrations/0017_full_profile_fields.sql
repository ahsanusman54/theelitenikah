-- Full profile detail fields, matching the reference layout's About/Base/
-- Interests/Sport/Looking-for sections -- minus a public street address
-- (safety) and "casual vs serious" (doesn't apply to a matrimonial
-- platform). See conversation notes for the reasoning.

create type gender_type as enum ('man', 'woman');

alter table public.profiles
  add column gender gender_type,
  add column country text,
  add column city text,
  add column occupation text,
  add column education text,
  add column religion text,
  add column languages text[] not null default '{}',
  add column interests text[] not null default '{}',
  add column sports text[] not null default '{}',
  add column interested_in_gender gender_type,
  add column preferred_age_min smallint,
  add column preferred_age_max smallint,
  add column verification_requested_at timestamptz;
