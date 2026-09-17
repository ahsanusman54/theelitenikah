-- Pricing packages, transactions, and a simulated purchase flow --
-- "simulated" because no real payment provider (Stripe/Razorpay) is
-- connected yet. Structured so swapping in a real charge later only means
-- replacing the inside of simulate_purchase with a real webhook handler;
-- everything else (schema, RLS, UI) stays the same.

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('membership', 'credits')),
  price_cents integer not null,
  currency text not null default 'usd',
  credits_included integer,
  duration_days integer,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  amount_cents integer not null,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'refunded')),
  is_simulated boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.packages enable row level security;
alter table public.transactions enable row level security;

create policy "packages are readable by authenticated users"
  on public.packages for select
  to authenticated
  using (is_active = true);

create policy "users can see their own transactions"
  on public.transactions for select
  to authenticated
  using (user_id = auth.uid());

-- Close a real gap: is_premium/is_verified/role/account_status on profiles
-- were writable by the user themselves via the existing "manage own
-- profile" policy (needed so users can edit name/bio/photos). A direct API
-- call could have set is_premium = true with no purchase at all. This
-- trigger reverts those four columns on any UPDATE unless the write is
-- flagged as trusted (set only by security-definer functions below, scoped
-- to the current transaction so it can't leak or be set by a client).
create function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(current_setting('app.trusted_write', true), 'false') <> 'true' then
    new.is_premium := old.is_premium;
    new.is_verified := old.is_verified;
    new.role := old.role;
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;

create trigger protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

create function public.simulate_purchase(p_package_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  pkg record;
begin
  select * into pkg from public.packages where id = p_package_id and is_active = true;
  if not found then
    raise exception 'Package not found or no longer available';
  end if;

  insert into public.transactions (user_id, package_id, amount_cents, status, is_simulated)
  values (auth.uid(), pkg.id, pkg.price_cents, 'completed', true);

  perform set_config('app.trusted_write', 'true', true);

  if pkg.type = 'membership' then
    update public.profiles set is_premium = true where user_id = auth.uid();
  elsif pkg.type = 'credits' then
    update public.credits
    set balance = balance + coalesce(pkg.credits_included, 0), updated_at = now()
    where user_id = auth.uid();
  end if;
end;
$$;

grant execute on function public.simulate_purchase(uuid) to authenticated;

insert into public.packages (name, type, price_cents, credits_included, duration_days, sort_order) values
  ('Monthly Premium', 'membership', 999, null, 30, 1),
  ('Quarterly Premium', 'membership', 2499, null, 90, 2),
  ('Yearly Premium', 'membership', 7999, null, 365, 3),
  ('50 Credits', 'credits', 499, 50, null, 10),
  ('150 Credits', 'credits', 1299, 150, null, 11),
  ('500 Credits', 'credits', 3499, 500, null, 12);
