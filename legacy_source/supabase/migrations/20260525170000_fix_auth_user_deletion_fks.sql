-- Fix foreign keys that block auth.users deletion from Supabase dashboard.
-- Normal users with support messages or stock order history could not be deleted.

-- 1) Stock orders: executed_by had no ON DELETE rule (RESTRICT by default).
alter table public.user_stock_orders
  drop constraint if exists user_stock_orders_executed_by_fkey;

alter table public.user_stock_orders
  add constraint user_stock_orders_executed_by_fkey
  foreign key (executed_by) references auth.users (id) on delete set null;

-- 2) Support messages: sender_id was NOT NULL but FK used ON DELETE SET NULL.
alter table public.support_messages
  alter column sender_id drop not null;
