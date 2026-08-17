-- Allow investment requests without fixed amount (pre-IPO / filed companies)

alter table public.ipo_subscription_requests
  alter column amount_eur drop not null;

comment on column public.ipo_subscription_requests.amount_eur is
  'Optional for preliminary IPO investment requests; required when subscription is open.';
