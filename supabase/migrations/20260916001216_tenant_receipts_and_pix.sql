create table public.organization_pix_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  key_type text not null check (key_type in ('cpf','cnpj','email','phone','random')),
  pix_key text not null check (char_length(pix_key) between 3 and 140),
  merchant_name text not null check (char_length(merchant_name) between 2 and 25),
  merchant_city text not null check (char_length(merchant_city) between 2 and 15),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  public_token uuid not null default gen_random_uuid() unique,
  receipt_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  customer_name text not null,
  customer_document text,
  customer_email text,
  customer_phone text,
  service_description text not null,
  notes text,
  total_cents bigint not null check (total_cents > 0),
  pix_key_snapshot text not null,
  pix_payload text not null,
  status text not null default 'issued' check (status in ('draft','issued','cancelled')),
  issued_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, receipt_number)
);

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  item_type text not null check (item_type in ('service','material','product','other')),
  description text not null check (char_length(description) between 2 and 240),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now()
);

create index receipts_org_issued_idx on public.receipts (organization_id, issued_at desc);
create index receipts_org_customer_idx on public.receipts (organization_id, customer_id, issued_at desc);
create index receipt_items_receipt_idx on public.receipt_items (receipt_id, position);

grant select, insert, update on public.organization_pix_settings to authenticated;
grant select, insert, update on public.receipts to authenticated;
grant select, insert, update, delete on public.receipt_items to authenticated;

alter table public.organization_pix_settings enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

create policy pix_settings_select_member on public.organization_pix_settings for select to authenticated
using ((select private.is_organization_member(organization_id)));
create policy pix_settings_insert_admin on public.organization_pix_settings for insert to authenticated
with check ((select private.can_manage_organization(organization_id)) and updated_by = (select auth.uid()));
create policy pix_settings_update_admin on public.organization_pix_settings for update to authenticated
using ((select private.can_manage_organization(organization_id)))
with check ((select private.can_manage_organization(organization_id)) and updated_by = (select auth.uid()));

create policy receipts_select_operator on public.receipts for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','reception','professional']::public.organization_role[])));
create policy receipts_insert_operator on public.receipts for insert to authenticated
with check ((select private.has_organization_role(organization_id, array['owner','admin','reception','professional']::public.organization_role[])) and created_by = (select auth.uid()));
create policy receipts_update_admin on public.receipts for update to authenticated
using ((select private.can_manage_organization(organization_id)))
with check ((select private.can_manage_organization(organization_id)));

create policy receipt_items_select_operator on public.receipt_items for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','reception','professional']::public.organization_role[])));
create policy receipt_items_insert_operator on public.receipt_items for insert to authenticated
with check (
  (select private.has_organization_role(organization_id, array['owner','admin','reception','professional']::public.organization_role[]))
  and exists (select 1 from public.receipts receipt where receipt.id = receipt_id and receipt.organization_id = organization_id)
);
create policy receipt_items_update_admin on public.receipt_items for update to authenticated
using ((select private.can_manage_organization(organization_id)))
with check ((select private.can_manage_organization(organization_id)));
create policy receipt_items_delete_admin on public.receipt_items for delete to authenticated
using ((select private.can_manage_organization(organization_id)));
