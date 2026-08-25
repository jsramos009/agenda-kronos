"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(""),
  nicheId: z.enum(["climatizacao", "odontologia", "advocacia", "assistencia-tecnica", "manicure", "salao"]),
});

export type OnboardingResult = { ok: true; demo?: boolean } | { ok: false; message: string };

export async function completeOnboarding(formData: FormData): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse({
    companyName: formData.get("companyName"),
    description: formData.get("description"),
    nicheId: formData.get("nicheId"),
  });
  if (!parsed.success) return { ok: false, message: "Revise os dados da empresa antes de continuar." };
  if (!isSupabaseConfigured) return { ok: true, demo: true };

  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const claims = claimData?.claims;
  if (!claims?.sub) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const organizationId = crypto.randomUUID();
  const slugBase = parsed.data.companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "empresa";
  const userMetadata = claims.user_metadata as { full_name?: string } | undefined;

  const { error } = await supabase.rpc("bootstrap_organization", {
    organization_id: organizationId,
    organization_name: parsed.data.companyName,
    organization_slug: `${slugBase}-${organizationId.slice(0, 6)}`,
    organization_description: parsed.data.description,
    template_id: parsed.data.nicheId,
    owner_display_name: userMetadata?.full_name ?? "Administrador",
  });

  if (error) return { ok: false, message: `Não foi possível criar o espaço: ${error.message}` };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 5 * 1024 * 1024) return { ok: false, message: "O logo deve ter no máximo 5 MB." };
    const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
    const logoPath = `${organizationId}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("organization-logos")
      .upload(logoPath, logo, { contentType: logo.type, upsert: true });

    if (!uploadError) {
      await supabase
        .from("organization_themes")
        .update({ logo_path: logoPath })
        .eq("organization_id", organizationId);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
