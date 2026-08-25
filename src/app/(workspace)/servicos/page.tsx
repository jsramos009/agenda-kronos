"use client";

import { Clock3, MoreHorizontal, UsersRound } from "lucide-react";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

export default function ServicosPage() {
  const { niche } = useNiche();
  return (
    <>
      <PageHeader eyebrow="Configuração · Catálogo" title="Serviços" description={`Modelos de ${niche.label.toLowerCase()} com duração, preço e recursos necessários.`} action="Novo serviço" />
      <section className="service-grid">
        {niche.services.map((service, index) => <article key={service.name}><header><span>0{index + 1}</span><button aria-label="Opções do serviço"><MoreHorizontal size={18} /></button></header><h2>{service.name}</h2><p>Serviço configurado a partir do modelo de {niche.label.toLowerCase()}.</p><div><span><Clock3 size={15} /> {service.duration}</span><span><UsersRound size={15} /> Equipe</span></div><footer><strong>{service.price}</strong><em>Ativo</em></footer></article>)}
        <article className="service-template"><span>MODELO DO NICHO</span><h2>Adicione a partir da biblioteca</h2><p>Use um modelo pronto ou crie um serviço do zero.</p><button className="button button--secondary">Abrir biblioteca</button></article>
      </section>
    </>
  );
}

