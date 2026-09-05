import { SettingsManager } from "@/components/settings-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function ConfiguracoesPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace || workspace.demo || !workspace.organizationId) {
    return <SettingsManager demo initialSettings={null} />;
  }

  const supabase = await createClient();
  const organizationId = workspace.organizationId;
  const [{ data: organization }, { data: theme }, { data: availability }, { data: services }, { data: stages }] = await Promise.all([
    supabase
      .from("organizations")
      .select("description, booking_notice_minutes, cancellation_notice_minutes, preferences")
      .eq("id", organizationId)
      .single(),
    supabase
      .from("organization_themes")
      .select("logo_path, primary_color, accent_color, soft_color, line_color")
      .eq("organization_id", organizationId)
      .single(),
    supabase
      .from("availability_rules")
      .select("weekday, starts_at, ends_at")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("weekday")
      .limit(7),
    supabase
      .from("services")
      .select("name, active")
      .eq("organization_id", organizationId)
      .order("created_at"),
    supabase
      .from("workflow_stages")
      .select("name")
      .eq("organization_id", organizationId)
      .eq("visible", true)
      .order("position"),
  ]);

  const preferences = (organization?.preferences ?? {}) as {
    agenda?: { startsAt?: string; endsAt?: string; slotIntervalMinutes?: 10 | 15 | 30 | 60 };
    notifications?: { reminder24?: boolean; reminder2?: boolean; dailyDigest?: boolean };
  };
  const logoUrl = theme?.logo_path
    ? supabase.storage.from("organization-logos").getPublicUrl(theme.logo_path).data.publicUrl
    : null;

  return <SettingsManager demo={false} initialSettings={{
    description: organization?.description ?? "",
    colors: {
      primary: theme?.primary_color ?? workspace.theme.primary,
      accent: theme?.accent_color ?? workspace.theme.accent,
      soft: theme?.soft_color ?? workspace.theme.soft,
      line: theme?.line_color ?? workspace.theme.line,
    },
    logoUrl,
    agenda: {
      start: String(availability?.[0]?.starts_at ?? preferences.agenda?.startsAt ?? "08:00").slice(0, 5),
      end: String(availability?.[0]?.ends_at ?? preferences.agenda?.endsAt ?? "18:00").slice(0, 5),
      bookingNotice: String(organization?.booking_notice_minutes ?? 60),
      cancellationNotice: String(organization?.cancellation_notice_minutes ?? 240),
      days: availability?.length ? [...new Set(availability.map((rule) => rule.weekday))] : [1, 2, 3, 4, 5, 6],
      slotIntervalMinutes: preferences.agenda?.slotIntervalMinutes ?? 30,
    },
    notifications: {
      reminder24: preferences.notifications?.reminder24 ?? true,
      reminder2: preferences.notifications?.reminder2 ?? true,
      dailyDigest: preferences.notifications?.dailyDigest ?? false,
    },
    selectedServices: (services ?? []).filter((service) => service.active).map((service) => service.name),
    workflowNames: (stages ?? []).map((stage) => stage.name),
  }} />;
}
