-- RLS already blocks arbitrary subscription writes. Tighten the table grants
-- as defense in depth: browsers may read their tenant subscription, while the
-- onboarding uses private.ensure_pending_subscription for the fixed pending row.

revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
