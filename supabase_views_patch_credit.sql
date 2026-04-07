-- Patch: include agent_credit in agent balances and exclude it from cash ledger balance
-- Run this in Supabase SQL Editor (safe to re-run)

begin;

-- Dashboard totals: agent_credit is NOT cash movement
-- Safe replace: drop then recreate to avoid column mismatch
create or replace view public.v_dashboard_totals as
select
  coalesce((select sum(sell_amount_sar) from public.sales), 0) as total_sales_sar,
  coalesce((select sum(cost_amount_sar) from public.sales), 0) as total_cost_sar,
  coalesce((select sum(profit_sar) from public.sales), 0) as total_profit_sar,
  coalesce((
    select sum(
      case
        when direction = 'customer_in' then amount_sar
        when direction = 'agent_out' then -amount_sar
        when direction = 'agent_credit' then 0
        else 0
      end
    )
    from public.ledger_entries
  ), 0) as ledger_balance_sar;

-- Agent balances:
-- balance owed to agent = opening + total_cost + credit_adjustments - cash_paid_out
-- We DROP the old view first because Postgres will not allow column signature changes on CREATE OR REPLACE.
drop view if exists public.v_agent_balances;
create view public.v_agent_balances as
select
  a.id as agent_id,
  a.name as agent_name,
  a.opening_balance_sar,
  coalesce(s.total_cost_sar, 0) as total_cost_sar,
  coalesce(p.total_paid_out_sar, 0) as total_paid_out_sar,
  coalesce(c.total_credit_sar, 0) as total_credit_sar,
  (a.opening_balance_sar + coalesce(s.total_cost_sar, 0) + coalesce(c.total_credit_sar, 0) - coalesce(p.total_paid_out_sar, 0)) as balance_sar
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
) p on p.agent_id = a.id
left join (
  select agent_id, sum(amount_sar) as total_credit_sar
  from public.ledger_entries
  where agent_id is not null and direction = 'agent_credit'
  group by agent_id
) c on c.agent_id = a.id;

commit;
