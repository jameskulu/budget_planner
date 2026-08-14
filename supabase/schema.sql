-- Budget Planner: run this in the Supabase SQL editor.
-- Set up the transactions table with row-level security so each user
-- only ever sees their own rows.
--
-- Setup note: for "Continue as guest" to work, enable the Anonymous provider
-- in the dashboard: Authentication → Sign In / Providers → Anonymous. Guest
-- users are real (anonymous) auth.users rows, so every table + RLS policy
-- below works for them automatically.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  date date not null,
  category text not null,
  note text not null default '',
  is_investment boolean not null default false,
  created_at timestamptz not null default now()
);

-- Backfill for databases created before the is_investment column existed.
alter table public.transactions
  add column if not exists is_investment boolean not null default false;

create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc);

alter table public.transactions enable row level security;

drop policy if exists "users can manage their own transactions" on public.transactions;
create policy "users can manage their own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Monthly recurring income & bills, e.g. salary, rent, Netflix.
-- Persisted so recurring bills work across devices and logins.

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'investment')),
  amount numeric not null check (amount > 0),
  label text not null,
  day integer not null check (day between 1 and 31),
  created_at timestamptz not null default now()
);

create index if not exists recurring_user_created_idx
  on public.recurring (user_id, created_at desc);

alter table public.recurring enable row level security;

drop policy if exists "users can manage their own recurring" on public.recurring;
create policy "users can manage their own recurring"
  on public.recurring
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Per-user account state (follows the user across devices). The onboarding
-- flag lives here so a returning user isn't forced through the wizard again.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  onboarding_completed boolean not null default false,
  onboarding jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "users can manage their own profile" on public.user_profiles;
create policy "users can manage their own profile"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
