create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email extensions.citext not null,
  role public.organization_role not null default 'professional',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email, status)
);

revoke all on public.organization_invitations from anon, authenticated;
grant select, insert, update, delete on public.organization_invitations to authenticated;
alter table public.organization_invitations enable row level security;

create policy invitations_select_admin on public.organization_invitations for select to authenticated using ((select private.can_manage_organization(organization_id)));
create policy invitations_insert_admin on public.organization_invitations for insert to authenticated with check ((select private.can_manage_organization(organization_id)) and invited_by = (select auth.uid()));
create policy invitations_update_admin on public.organization_invitations for update to authenticated using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));
create policy invitations_delete_admin on public.organization_invitations for delete to authenticated using ((select private.can_manage_organization(organization_id)));

create trigger organization_invitations_set_updated_at before update on public.organization_invitations for each row execute function private.set_updated_at();
