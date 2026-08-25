import { FaqExplorer } from "@/components/faq-explorer";
import { PageHeader } from "@/components/ui";

export default function AjudaPage() {
  return <><PageHeader eyebrow="Sistema · Ajuda" title="Ajuda e perguntas frequentes" description="Encontre respostas sem sair do seu espaço de trabalho." action={null} /><FaqExplorer /></>;
}
