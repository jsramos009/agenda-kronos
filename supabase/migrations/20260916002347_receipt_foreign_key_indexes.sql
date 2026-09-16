create index organization_pix_settings_updated_by_idx on public.organization_pix_settings (updated_by);
create index receipts_customer_fk_idx on public.receipts (customer_id);
create index receipts_service_fk_idx on public.receipts (service_id);
create index receipts_created_by_idx on public.receipts (created_by);
create index receipt_items_organization_idx on public.receipt_items (organization_id);
