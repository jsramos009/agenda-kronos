import "server-only";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const value = configured || (vercelProduction ? `https://${vercelProduction}` : "http://localhost:3000");
  return value.replace(/\/$/, "");
}
