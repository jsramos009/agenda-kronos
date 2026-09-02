import "server-only";

type WelcomeEmail = { to: string; name: string; companyName: string };

export async function sendWelcomeEmail({ to, name, companyName }: WelcomeEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Kronos <${from}>`,
      to: [to],
      subject: `Seu espaço ${companyName} está pronto`,
      html: `<div style="background:#f5efe7;padding:32px 16px;font-family:Arial,sans-serif;color:#2f211b"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dfd1c5;border-radius:14px;padding:32px"><p style="margin:0 0 20px;color:#9a603f;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Kronos</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">Seu espaço está pronto.</h1><p style="margin:0 0 14px;line-height:1.6">Olá, ${escapeHtml(name)}. A configuração inicial de <strong>${escapeHtml(companyName)}</strong> foi concluída com segurança.</p><p style="margin:0;color:#69554a;line-height:1.6">Assim que a assinatura for confirmada, sua agenda ficará disponível com as cores, os serviços e o fluxo escolhidos.</p></div></div>`,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
  return { sent: true as const };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
