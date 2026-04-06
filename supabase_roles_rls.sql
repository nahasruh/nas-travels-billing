-- NAS Travels Billing — Roles + RLS upgrade
-- Run this AFTER running supabase_schema.sql
--
-- Adds:
-- - public.profiles (auth users -> role)
-- - Helper: public.is_admin()
-- - Tightens RLS:
--   Admin: full access
--   Salesman: can read reference data, create sales, create customer receipts
--            cannot delete, cannot update master data

begin;

create extension if not exists "pgcrypto";

-- Profiles table (1 row per auth user)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','salesman')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Helper
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self
on public.profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Replace existing permissive policies with role-aware ones
-- Agents
alter table public.agents enable row level security;

drop policy if exists agents_read on public.agents;
create policy agents_read
on public.agents for select
to authenticated
using (true);

drop policy if exists agents_write on public.agents;
create policy agents_write
on public.agents for insert
to authenticated
with check (public.is_admin());

drop policy if exists agents_update on public.agents;
create policy agents_update
on public.agents for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists agents_delete on public.agents;
create policy agents_delete
on public.agents for delete
to authenticated
using (public.is_admin());

-- Salesmen master
alter table public.salesmen enable row level security;

drop policy if exists salesmen_read on public.salesmen;
create policy salesmen_read
on public.salesmen for select
to authenticated
using (true);

drop policy if exists salesmen_write on public.salesmen;
create policy salesmen_write
on public.salesmen for insert
to authenticated
with check (public.is_admin());

drop policy if exists salesmen_update on public.salesmen;
create policy salesmen_update
on public.salesmen for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists salesmen_delete on public.salesmen;
create policy salesmen_delete
on public.salesmen for delete
to authenticated
using (public.is_admin());

-- Sales
alter table public.sales enable row level security;

drop policy if exists sales_read on public.sales;
create policy sales_read
on public.sales for select
to authenticated
using (true);

drop policy if exists sales_write on public.sales;
create policy sales_write
on public.sales for insert
to authenticated
with check (true); -- both admin and salesman can create

-- Block updates/deletes for salesman
-- Allow update/delete only for admin

drop policy if exists sales_update on public.sales;
create policy sales_update
on public.sales for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists sales_delete on public.sales;
create policy sales_delete
on public.sales for delete
to authenticated
using (public.is_admin());

-- Ledger
alter table public.ledger_entries enable row level security;

drop policy if exists ledger_read on public.ledger_entries;
create policy ledger_read
on public.ledger_entries for select
to authenticated
using (true);

drop policy if exists ledger_write on public.ledger_entries;
create policy ledger_write
on public.ledger_entries for insert
to authenticated
with check (
  public.is_admin()
  or (direction = 'customer_in')
);

drop policy if exists ledger_update on public.ledger_entries;
create policy ledger_update
on public.ledger_entries for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists ledger_delete on public.ledger_entries;
create policy ledger_delete
on public.ledger_entries for delete
to authenticated
using (public.is_admin());

commit;
