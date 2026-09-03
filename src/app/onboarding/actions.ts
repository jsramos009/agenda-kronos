"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sendWelcomeEmail } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";

const nicheSchema = z.enum(["climatizacao", "odontologia", "advocacia", "assistencia-tecnica", "manicure", "salao"]);
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const onboardingDraftSchema = z.object({
  step: z.number().int().min(0).max(4),
  companyName: z.string().trim().max(120),
  description: z.string().trim().max(500),
  nicheId: nicheSchema,
  theme: z.object({ primary: hexColor, accent: hexColor, soft: hexColor, line: hexColor }),
  operation: z.object({
    startsAt: time,
    endsAt: time,
    teamSize: z.string().max(32),
    resourceCount: z.string().max(80),
    days: z.array(z.number().int().min(0).max(6)).min(1),
    channels: z.array(z.enum(["WhatsApp", "Telefone", "Instagram", "Presencial", "Site"])).min(1),
  }),
  selectedServices: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
  workflowNames: z.array(z.string().trim().min(2).max(80)).min(2).max(10),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
export type OnboardingResult =
  | { ok: true; demo?: boolean; organizationId?: string }
  | { ok: false; message: string };

export async function getOnboardingDraft(): Promise<OnboardingDraft | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase
    .from("onboarding_drafts")
    .select("step, draft")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const parsed = onboardingDraftSchema.safeParse({ ...data.draft, step: data.step });
  return parsed.success ? parsed.data : null;
}

export async function saveOnboardingDraft(input: OnboardingDraft): Promise<{ ok: boolean }> {
  const parsed = onboardingDraftSchema.safeParse(input);
  if (!parsed.success || !isSupabaseConfigured) return { ok: false };
  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (!userId) return { ok: false };
  const { step, ...draft } = parsed.data;
  const { error } = await supabase
    .from("onboarding_drafts")
    .upsert({ user_id: userId, step, draft }, { onConflict: "user_id" });
  return { ok: !error };
}

export async function completeOnboarding(formData: FormData): Promise<OnboardingResult> {
  let rawConfiguration: unknown;
  try {
    rawConfiguration = JSON.parse(String(formData.get("configuration") ?? "{}"));
  } catch {
    return { ok: false, message: "Não foi possível ler a configuração. Revise os dados." };
  }

  const parsed = onboardingDraftSchema.safeParse({ ...(rawConfiguration as object), step: 4 });
  if (!parsed.success || parsed.data.companyName.length < 2) {
    return { ok: false, message: "Revise empresa, cores, horários e modelos antes de continuar." };
  }
  if (parsed.data.operation.endsAt <= parsed.data.operation.startsAt) {
    return { ok: false, message: "O fim do expediente precisa ser depois do início." };
  }

  const logo = formData.get("logo");
  const logoExtensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 5 * 1024 * 1024) return { ok: false, message: "O logo deve ter no máximo 5 MB." };
    if (!logoExtensions[logo.type]) return { ok: false, message: "Envie o logo em PNG, JPG ou WebP." };
  }
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
  const userMetadata = claims.user_metadata as { full_name?: string; name?: string } | undefined;
  const { step: _step, ...configuration } = parsed.data;
  void _step;

  const { error } = await supabase.rpc("bootstrap_organization_v2", {
    organization_id: organizationId,
    organization_name: parsed.data.companyName,
    organization_slug: `${slugBase}-${organizationId.slice(0, 6)}`,
    organization_description: parsed.data.description,
    template_id: parsed.data.nicheId,
    owner_display_name: userMetadata?.full_name ?? userMetadata?.name ?? "Administrador",
    configuration,
  });

  if (error) {
    console.error("[onboarding.bootstrap_failed]", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    const friendly = error.message.includes("WORKSPACE_LIMIT_REACHED")
      ? "Você já atingiu o limite de duas agendas do plano."
      : error.code === "42501"
        ? "Sua sessão não tem permissão para criar este espaço. Entre novamente e repita a ativação."
        : error.code === "22023"
          ? "Uma configuração do espaço ficou inválida. Volte uma etapa, revise os campos e tente novamente."
          : `Não foi possível criar seu espaço agora. Código de diagnóstico: ${error.code || "ONB-001"}.`;
    return { ok: false, message: friendly };
  }

  if (logo instanceof File && logo.size > 0) {
    const extension = logoExtensions[logo.type];
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

  const cookieStore = await cookies();
  cookieStore.delete("kronos_demo");
  cookieStore.set("kronos_workspace", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  const email = typeof claims.email === "string" ? claims.email : null;
  if (email) {
    await sendWelcomeEmail({
      to: email,
      name: userMetadata?.full_name ?? userMetadata?.name ?? "Administrador",
      companyName: parsed.data.companyName,
    }).catch(() => undefined);
  }
  return { ok: true, organizationId };
}
