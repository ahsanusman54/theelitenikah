-- theelitenikah is a matrimonial (nikah) platform, not a casual dating app.
-- Adds the profile fields that distinction implies. These are reasonable
-- defaults, not a final list -- see the project spec for what's still open.

create type marital_status as enum ('never_married', 'divorced', 'widowed');
create type religious_practice_level as enum ('very_practicing', 'practicing', 'moderately_practicing', 'learning');

alter table public.profiles
  add column marital_status marital_status,
  add column religious_practice religious_practice_level,
  add column willing_to_relocate boolean;
