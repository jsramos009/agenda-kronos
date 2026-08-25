import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { niches, type NicheId } from "@/lib/niches";

export type Workspace = {
  organizationId: string | null;
  companyName: string;
  nicheId: NicheId;
  fullName: string;
  role: string;
  theme: { primary: string; accent: string; soft: string; line: string };
  demo: boolean;
};

export const demoWorkspace: Workspace = {
  organizationId: null,
  companyName: "Clima Prime",
  nicheId: "climatizacao",
  fullName: "Ana Martins",
  role: "Administradora",
  theme: niches.climatizacao.theme,
  demo: true,
};

export async function getCurrentWorkspace(): Promise<Workspace | null> {
  if (!isSupabaseConfigured) return demoWorkspace;

  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (!userId) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role, display_name")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(`Não foi possível carregar o espaço: ${membershipError.message}`);
  if (!membership) return null;

  const [{ data: organization, error: organizationError }, { data: theme }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, niche_id")
      .eq("id", membership.organization_id)
      .single(),
    supabase
      .from("organization_themes")
      .select("primary_color, accent_color, soft_color, line_color")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
  ]);

  if (organizationError) throw new Error(`Não foi possível carregar a empresa: ${organizationError.message}`);
  const nicheId = (organization.niche_id in niches ? organization.niche_id : "climatizacao") as NicheId;

  return {
    organizationId: membership.organization_id,
    companyName: organization.name,
    nicheId,
    fullName: membership.display_name,
    role: roleLabel(membership.role),
    theme: theme
      ? {
          primary: theme.primary_color,
          accent: theme.accent_color,
          soft: theme.soft_color,
          line: theme.line_color,
        }
      : niches[nicheId].theme,
    demo: false,
  };
}

function roleLabel(role: string) {
  return {
    owner: "Proprietário",
    admin: "Administrador",
    reception: "Recepção",
    professional: "Profissional",
    analyst: "Analista",
  }[role] ?? role;
}
