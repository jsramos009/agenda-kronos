import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { niches, type NicheId } from "@/lib/niches";

export type Workspace = {
  organizationId: string | null;
  companyName: string;
  nicheId: NicheId;
  fullName: string;
  role: string;
  roleKey: string;
  theme: { primary: string; accent: string; soft: string; line: string };
  subscriptionStatus: "pending" | "active" | "past_due" | "cancelled";
  demo: boolean;
};

export type WorkspaceSummary = {
  organizationId: string;
  companyName: string;
  nicheId: NicheId;
  role: string;
  roleKey: string;
  displayName: string;
};

export const demoWorkspace: Workspace = {
  organizationId: null,
  companyName: "Clima Prime",
  nicheId: "climatizacao",
  fullName: "Ana Martins",
  role: "Administradora",
  roleKey: "admin",
  theme: niches.climatizacao.theme,
  subscriptionStatus: "active",
  demo: true,
};

export const getCurrentWorkspace = cache(async function getCurrentWorkspace(): Promise<Workspace | null> {
  const cookieStore = await cookies();
  if (!isSupabaseConfigured) return demoWorkspace;

  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (!userId) return cookieStore.get("kronos_demo")?.value === "1" ? demoWorkspace : null;

  const workspaces = await getAvailableWorkspaces();
  if (!workspaces.length) return null;
  const requestedId = cookieStore.get("kronos_workspace")?.value;
  const membership = workspaces.find((item) => item.organizationId === requestedId) ?? workspaces[0];

  const [{ data: organization, error: organizationError }, { data: theme }, { data: subscription }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, niche_id")
      .eq("id", membership.organizationId)
      .single(),
    supabase
      .from("organization_themes")
      .select("primary_color, accent_color, soft_color, line_color")
      .eq("organization_id", membership.organizationId)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("organization_id", membership.organizationId)
      .maybeSingle(),
  ]);

  if (organizationError) throw new Error(`Não foi possível carregar a empresa: ${organizationError.message}`);
  const nicheId = (organization.niche_id in niches ? organization.niche_id : "climatizacao") as NicheId;

  return {
    organizationId: membership.organizationId,
    companyName: organization.name,
    nicheId,
    fullName: membership.displayName,
    role: membership.role,
    roleKey: membership.roleKey,
    theme: theme
      ? {
          primary: theme.primary_color,
          accent: theme.accent_color,
          soft: theme.soft_color,
          line: theme.line_color,
        }
      : niches[nicheId].theme,
    subscriptionStatus: subscription?.status ?? "pending",
    demo: false,
  };
});

export const getAvailableWorkspaces = cache(async function getAvailableWorkspaces(): Promise<WorkspaceSummary[]> {
  const cookieStore = await cookies();
  if (!isSupabaseConfigured) {
    return [{
      organizationId: "demo-workspace",
      companyName: demoWorkspace.companyName,
      nicheId: demoWorkspace.nicheId,
      role: demoWorkspace.role,
      roleKey: demoWorkspace.roleKey,
      displayName: demoWorkspace.fullName,
    }];
  }

  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (!userId) {
    if (cookieStore.get("kronos_demo")?.value !== "1") return [];
    return [{
      organizationId: "demo-workspace",
      companyName: demoWorkspace.companyName,
      nicheId: demoWorkspace.nicheId,
      role: demoWorkspace.role,
      roleKey: demoWorkspace.roleKey,
      displayName: demoWorkspace.fullName,
    }];
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role, display_name")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at");

  if (membershipError) throw new Error(`Não foi possível carregar seus espaços: ${membershipError.message}`);
  if (!memberships?.length) return [];

  const ids = memberships.map((membership) => membership.organization_id);
  const { data: organizations, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, niche_id")
    .in("id", ids);

  if (organizationError) throw new Error(`Não foi possível carregar as empresas: ${organizationError.message}`);
  const byId = new Map((organizations ?? []).map((organization) => [organization.id, organization]));

  return memberships.flatMap((membership) => {
    const organization = byId.get(membership.organization_id);
    if (!organization) return [];
    const roleKey = String(membership.role);
    return [{
      organizationId: membership.organization_id,
      companyName: organization.name,
      nicheId: (organization.niche_id in niches ? organization.niche_id : "climatizacao") as NicheId,
      role: roleLabel(roleKey),
      roleKey,
      displayName: membership.display_name,
    }];
  });
});

function roleLabel(role: string) {
  return {
    owner: "Proprietário",
    admin: "Administrador",
    reception: "Recepção",
    professional: "Profissional",
    analyst: "Analista",
  }[role] ?? role;
}
