-- Explicit deny policies document the intentional server-only boundary and
-- keep browser roles blocked even if grants are changed accidentally later.

create policy payment_credentials_deny_browser
on public.payment_provider_credentials for select to authenticated
using (false);

create policy payment_webhook_events_deny_browser
on public.payment_webhook_events for select to authenticated
using (false);

create index payment_provider_connections_connected_by_idx
  on public.payment_provider_connections (connected_by)
  where connected_by is not null;

create index payment_charges_customer_idx
  on public.payment_charges (organization_id, customer_id);

create index payment_charges_appointment_idx
  on public.payment_charges (organization_id, appointment_id)
  where appointment_id is not null;

create index payment_charges_created_by_idx
  on public.payment_charges (created_by)
  where created_by is not null;
