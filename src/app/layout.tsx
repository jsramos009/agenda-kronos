import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kronos — Seu nicho. Seu sistema.", template: "%s | Kronos" },
  description: "Sistema de agendamento adaptativo para negócios de serviço.",
  openGraph: { title: "Kronos — Seu nicho. Seu sistema.", description: "Agenda, fluxo de trabalho e decisões moldadas ao seu negócio.", locale: "pt_BR", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body><a className="skip-link" href="#conteudo-principal">Ir para o conteúdo</a><div id="conteudo-principal">{children}</div></body>
    </html>
  );
}
