import { Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCurrentAccount } from "./actions";

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : null;
  if (email !== "josegabrielramos2004@gmail.com") redirect("/dashboard");
  return <main className="not-found-page"><p className="eyebrow">Recriar acesso</p><h1>Excluir a conta atual.</h1><p>Esta ação remove o workspace vazio, o logotipo e o login de <strong>{email}</strong>. Depois, use o Google para criar uma conta nova.</p><form action={deleteCurrentAccount}><button className="button button--primary"><Trash2 size={16} /> Excluir e voltar ao login</button></form></main>;
}
