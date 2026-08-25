import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KronosMark } from "@/components/kronos-mark";

export default function NotFound() {
  return <main className="not-found-page"><KronosMark /><p className="eyebrow">Erro 404</p><h1>Esse horário não existe na agenda.</h1><p>A página pode ter mudado ou o endereço foi digitado de forma diferente.</p><Link className="button button--primary" href="/"><ArrowLeft size={16} /> Voltar ao início</Link></main>;
}
