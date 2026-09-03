-- Multi-tenant Asaas integration. Provider credentials are encrypted by the
-- application before persistence and are never granted to browser roles.

create table public.payment_provider_connections (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'asaas' check (provider = 'asaas'),
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  status text not null default 'connected' check (status in ('connected', 'error', 'disconnected')),
  account_name text,
  account_document_masked text,
  webhook_id text,
  webhook_token_hash text not null check (webhook_token_hash ~ '^[0-9a-f]{64}$'),
  connected_by uuid references auth.users(id) on delete set null,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_provider_credentials (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'asaas' check (provider = 'asaas'),
  encrypted_api_key text not null check (char_length(encrypted_api_key) between 16 and 4096),
  initialization_vector text not null check (char_length(initialization_vector) between 12 and 128),
  auth_tag text not null check (char_length(auth_tag) between 12 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_payment_provider_links (
  organization_id uuid not null,
  customer_id uuid not null,
  provider text not null default 'asaas' check (provider = 'asaas'),
  provider_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, customer_id, provider),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade,
  unique (organization_id, provider, provider_customer_id)
);

create table public.payment_charges (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  appointment_id uuid,
  provider text not null default 'asaas' check (provider = 'asaas'),
  provider_payment_id text,
  external_reference text not null,
  billing_type text not null default 'BOLETO' check (billing_type in ('BOLETO', 'PIX', 'UNDEFINED')),
  status text not null default 'pending' check (status in (
    'pending', 'confirmed', 'received', 'received_in_cash', 'overdue',
    'refunded', 'refund_requested', 'refund_in_progress', 'deleted',
    'cancelled', 'chargeback_requested', 'chargeback_dispute',
    'awaiting_chargeback_reversal', 'dunning_requested', 'dunning_received',
    'awaiting_risk_analysis', 'unknown'
  )),
  amount_cents bigint not null check (amount_cents > 0),
  net_amount_cents bigint check (net_amount_cents is null or net_amount_cents >= 0),
  due_date date not null,
  description text not null check (char_length(description) between 2 and 500),
  invoice_url text check (invoice_url is null or invoice_url ~ '^https://'),
  bank_slip_url text check (bank_slip_url is null or bank_slip_url ~ '^https://'),
  paid_at timestamptz,
  provider_created_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, appointment_id)
    references public.appointments(organization_id, id) on delete set null (appointment_id),
  unique (organization_id, provider, external_reference),
  unique (organization_id, provider, provider_payment_id)
);

create table public.payment_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'asaas' check (provider = 'asaas'),
  provider_event_id text not null,
  event_type text not null,
  provider_payment_id text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (organization_id, provider, provider_event_id)
);

create trigger payment_provider_connections_set_updated_at
before update on public.payment_provider_connections
for each row execute function private.set_updated_at();

create trigger payment_provider_credentials_set_updated_at
before update on public.payment_provider_credentials
for each row execute function private.set_updated_at();

create trigger customer_payment_provider_links_set_updated_at
before update on public.customer_payment_provider_links
for each row execute function private.set_updated_at();

create trigger payment_charges_set_updated_at
before update on public.payment_charges
for each row execute function private.set_updated_at();

create index payment_charges_org_due_date_idx
  on public.payment_charges (organization_id, due_date desc);
create index payment_charges_org_status_idx
  on public.payment_charges (organization_id, status, due_date);
create index payment_charges_provider_payment_idx
  on public.payment_charges (provider_payment_id) where provider_payment_id is not null;
create index payment_webhook_events_received_idx
  on public.payment_webhook_events (organization_id, received_at desc);

grant select on public.payment_provider_connections to authenticated;
grant select on public.customer_payment_provider_links to authenticated;
grant select on public.payment_charges to authenticated;

grant all on public.payment_provider_connections to service_role;
grant all on public.payment_provider_credentials to service_role;
grant all on public.customer_payment_provider_links to service_role;
grant all on public.payment_charges to service_role;
grant all on public.payment_webhook_events to service_role;

revoke all on public.payment_provider_credentials from anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
revoke insert, update, delete on public.payment_provider_connections from authenticated;
revoke insert, update, delete on public.customer_payment_provider_links from authenticated;
revoke insert, update, delete on public.payment_charges from authenticated;

alter table public.payment_provider_connections enable row level security;
alter table public.payment_provider_credentials enable row level security;
alter table public.customer_payment_provider_links enable row level security;
alter table public.payment_charges enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy payment_connections_select_member
on public.payment_provider_connections for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy customer_provider_links_select_operator
on public.customer_payment_provider_links for select to authenticated
using ((select private.has_organization_role(
  organization_id,
  array['owner', 'admin', 'reception']::public.organization_role[]
)));

create policy payment_charges_select_operator
on public.payment_charges for select to authenticated
using ((select private.has_organization_role(
  organization_id,
  array['owner', 'admin', 'reception']::public.organization_role[]
)));
