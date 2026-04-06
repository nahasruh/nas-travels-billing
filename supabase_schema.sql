-- NAS Travels Billing (Saudi Arabia) — Supabase schema
-- English-only, no VAT
--
-- How to use:
-- 1) Open Supabase Dashboard → SQL editor
-- 2) Paste and run this file
--
-- Notes:
-- - Uses UUID primary keys.
-- - Multi-tenant is not implemented (single company).
-- - RLS is enabled; policies allow authenticated users.
--   For production, tighten policies by user role/company.

begin;

-- Extensions
create extension if not exists "pgcrypto";

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Agents: suppliers you buy tickets from
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  opening_balance_sar numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists agents_name_uq on public.agents (lower(name));

-- Salesmen: your internal staff
create table if not exists public.salesmen (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists salesmen_name_uq on public.salesmen (lower(name));

-- Sales (Tickets)
-- You can link to agent (supplier) and salesman (internal)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null default (now()::date),

  customer_name text not null,
  customer_mobile text,

  ticket_number text,                 -- e.g., PNR / ticket no.
  route text,                         -- optional: RUH-JED
  passenger_name text,                -- optional

  agent_id uuid references public.agents(id) on delete set null,
  salesman_id uuid references public.salesmen(id) on delete set null,

  sell_amount_sar numeric(14,2) not null default 0,   -- what customer pays
  cost_amount_sar numeric(14,2) not null default 0,   -- what you owe agent
  profit_sar numeric(14,2) generated always as (sell_amount_sar - cost_amount_sar) stored,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sales_sale_date_idx on public.sales (sale_date desc);
create index if not exists sales_customer_name_idx on public.sales (lower(customer_name));
create index if not exists sales_customer_mobile_idx on public.sales (customer_mobile);
create index if not exists sales_ticket_number_idx on public.sales (ticket_number);
create index if not exists sales_agent_id_idx on public.sales (agent_id);
create index if not exists sales_salesman_id_idx on public.sales (salesman_id);

-- Payments / Ledger
-- Tracks money received from customers OR paid to agents.
-- direction:
--   customer_in  = money received from customer
--   agent_out    = money paid to agent
--   agent_credit = credit adjustment you owe agent (optional use)
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'ledger_direction'
  ) then
    create type public.ledger_direction as enum ('customer_in', 'agent_out', 'agent_credit');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'payment_method'
  ) then
    create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'credit');
  end if;
end
$$;

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default (now()::date),
  direction public.ledger_direction not null,
  method public.payment_method not null,

  sale_id uuid references public.sales(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,

  amount_sar numeric(14,2) not null check (amount_sar >= 0),
  reference text, -- receipt no / bank ref
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ledger_entry_date_idx on public.ledger_entries (entry_date desc);
create index if not exists ledger_sale_id_idx on public.ledger_entries (sale_id);
create index if not exists ledger_agent_id_idx on public.ledger_entries (agent_id);
create index if not exists ledger_direction_idx on public.ledger_entries (direction);

-- Views: quick totals
create or replace view public.v_dashboard_totals as
select
  coalesce((select sum(sell_amount_sar) from public.sales), 0) as total_sales_sar,
  coalesce((select sum(cost_amount_sar) from public.sales), 0) as total_cost_sar,
  coalesce((select sum(profit_sar) from public.sales), 0) as total_profit_sar,
  coalesce((
    select sum(
      case
        when direction = 'customer_in' then amount_sar
        when direction in ('agent_out','agent_credit') then -amount_sar
        else 0
      end
    )
    from public.ledger_entries
  ), 0) as ledger_balance_sar;

-- Agent balance (what you owe agent): opening_balance + total_cost - payments_out - credits?
-- Here:
-- owed = opening + sum(cost from sales linked to agent) - sum(agent_out payments)
create or replace view public.v_agent_balances as
select
  a.id as agent_id,
  a.name as agent_name,
  a.opening_balance_sar,
  coalesce(s.total_cost_sar, 0) as total_cost_sar,
  coalesce(p.total_paid_out_sar, 0) as total_paid_out_sar,
  (a.opening_balance_sar + coalesce(s.total_cost_sar, 0) - coalesce(p.total_paid_out_sar, 0)) as balance_sar
from public.agents a
left join (
  select agent_id, sum(cost_amount_sar) as total_cost_sar
  from public.sales
  where agent_id is not null
  group by agent_id
) s on s.agent_id = a.id
left join (
  select agent_id, sum(amount_sar) as total_paid_out_sar
  from public.ledger_entries
  where agent_id is not null and direction = 'agent_out'
  group by agent_id
) p on p.agent_id = a.id;

-- updated_at triggers
drop trigger if exists trg_agents_updated_at on public.agents;
create trigger trg_agents_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

drop trigger if exists trg_salesmen_updated_at on public.salesmen;
create trigger trg_salesmen_updated_at
before update on public.salesmen
for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_updated_at on public.sales;
create trigger trg_sales_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists trg_ledger_updated_at on public.ledger_entries;
create trigger trg_ledger_updated_at
before update on public.ledger_entries
for each row execute function public.set_updated_at();

-- RLS
alter table public.agents enable row level security;
alter table public.salesmen enable row level security;
alter table public.sales enable row level security;
alter table public.ledger_entries enable row level security;

-- Simple policies for authenticated users (tighten later)
drop policy if exists "agents_read" on public.agents;
create policy "agents_read" on public.agents for select to authenticated using (true);
drop policy if exists "agents_write" on public.agents;
create policy "agents_write" on public.agents for insert to authenticated with check (true);
drop policy if exists "agents_update" on public.agents;
create policy "agents_update" on public.agents for update to authenticated using (true) with check (true);
drop policy if exists "agents_delete" on public.agents;
create policy "agents_delete" on public.agents for delete to authenticated using (true);

-- salesmen
drop policy if exists "salesmen_read" on public.salesmen;
create policy "salesmen_read" on public.salesmen for select to authenticated using (true);
drop policy if exists "salesmen_write" on public.salesmen;
create policy "salesmen_write" on public.salesmen for insert to authenticated with check (true);
drop policy if exists "salesmen_update" on public.salesmen;
create policy "salesmen_update" on public.salesmen for update to authenticated using (true) with check (true);
drop policy if exists "salesmen_delete" on public.salesmen;
create policy "salesmen_delete" on public.salesmen for delete to authenticated using (true);

-- sales
drop policy if exists "sales_read" on public.sales;
create policy "sales_read" on public.sales for select to authenticated using (true);
drop policy if exists "sales_write" on public.sales;
create policy "sales_write" on public.sales for insert to authenticated with check (true);
drop policy if exists "sales_update" on public.sales;
create policy "sales_update" on public.sales for update to authenticated using (true) with check (true);
drop policy if exists "sales_delete" on public.sales;
create policy "sales_delete" on public.sales for delete to authenticated using (true);

-- ledger
drop policy if exists "ledger_read" on public.ledger_entries;
create policy "ledger_read" on public.ledger_entries for select to authenticated using (true);
drop policy if exists "ledger_write" on public.ledger_entries;
create policy "ledger_write" on public.ledger_entries for insert to authenticated with check (true);
drop policy if exists "ledger_update" on public.ledger_entries;
create policy "ledger_update" on public.ledger_entries for update to authenticated using (true) with check (true);
drop policy if exists "ledger_delete" on public.ledger_entries;
create policy "ledger_delete" on public.ledger_entries for delete to authenticated using (true);

commit;
