import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PLATFORM_ADMIN_EMAILS = new Set([
  "josegabrielramos2004@gmail.com",
  "axionsolution26@gmail.com",
]);

export function isPlatformAdminEmail(email: unknown) {
  return typeof email === "string" && PLATFORM_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export async function getPlatformAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email.trim().toLowerCase() : null;
  return userId && email && isPlatformAdminEmail(email) ? { userId, email } : null;
}

export async function requirePlatformAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/dashboard");
  return admin;
}
