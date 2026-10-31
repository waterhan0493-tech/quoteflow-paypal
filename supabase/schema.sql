-- QuoteFlow database schema.
-- Run once in the Supabase SQL Editor (Dashboard > SQL Editor > New query > paste > Run).
-- Safe to run again: every statement checks before it creates.
--
-- Only the QuoteFlow server reads and writes these tables, with the secret key.
-- Row level security is on with no policies, so the public (anon/publishable) key gets nothing.

create table if not exists public.businesses (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  industry    text not null,
  config      jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  business_slug       text not null,
  quote_id            text not null,
  status              text not null default 'booked',
  customer_name       text not null,
  customer_email      text not null,
  industry_id         text not null,
  industry_label      text not null,
  scope_summary       text not null,
  total_price         numeric(10, 2) not null check (total_price >= 0),
  urgency             text not null check (urgency in ('standard', 'rush')),
  frequency_label     text not null,
  date_slot           date not null,
  time_slot           text not null,
  signature_data_url  text,
  deposit_provider    text check (deposit_provider in ('paypal', 'demo')),
  deposit_amount      numeric(10, 2),
  deposit_currency    text,
  deposit_order_id    text,
  deposit_capture_id  text,
  payer_email         text,
  deposit_paid_at     timestamptz,
  created_at          timestamptz not null default now(),
  unique (business_slug, quote_id)
);

create index if not exists bookings_business_created_idx
  on public.bookings (business_slug, created_at desc);

-- One booking per deposit order (PayPal or demo), so a retried save cannot record the same payment twice.
create unique index if not exists bookings_deposit_order_idx
  on public.bookings (deposit_order_id) where deposit_order_id is not null;

-- The owner who signs in to the dashboard (Supabase Auth). One business per owner.
alter table public.businesses
  add column if not exists owner_id uuid references auth.users (id) on delete set null;
create unique index if not exists businesses_owner_idx
  on public.businesses (owner_id) where owner_id is not null;

-- After the visit: the balance the customer pays through a QuoteFlow link, or a cancellation refund.
alter table public.bookings add column if not exists quote_selection jsonb;
alter table public.bookings add column if not exists balance_amount numeric(10, 2);
alter table public.bookings add column if not exists balance_requested_at timestamptz;
alter table public.bookings add column if not exists balance_order_id text;
alter table public.bookings add column if not exists balance_capture_id text;
alter table public.bookings add column if not exists balance_paid_at timestamptz;
alter table public.bookings add column if not exists refund_id text;
alter table public.bookings add column if not exists refund_amount numeric(10, 2);
alter table public.bookings add column if not exists refunded_at timestamptz;

-- booked -> balance_requested -> paid, or booked/balance_requested -> cancelled (deposit refunded).
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('booked', 'balance_requested', 'paid', 'cancelled'));

alter table public.businesses enable row level security;
alter table public.bookings enable row level security;
