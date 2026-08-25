import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kronos — Seu nicho. Seu sistema.",
  description: "Sistema de agendamento adaptativo para negócios de serviço.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

