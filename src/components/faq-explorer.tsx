"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Search, Send } from "lucide-react";
import { faqCategories, faqItems, type FaqCategory } from "@/lib/faq";

export function FaqExplorer({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Todas" | FaqCategory>("Todas");
  const [selectedId, setSelectedId] = useState(faqItems[0].id);
  const [sent, setSent] = useState(false);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return faqItems.filter((item) => (category === "Todas" || item.category === category) && (!normalized || `${item.question} ${item.answer}`.toLocaleLowerCase("pt-BR").includes(normalized)));
  }, [category, query]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    event.currentTarget.reset();
  };

  return (
    <div className={`faq-explorer ${compact ? "faq-explorer--compact" : ""}`}>
      <div className="faq-tools">
        <label className="faq-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque uma pergunta ou palavra-chave" /></label>
        <div className="faq-categories" aria-label="Categorias de ajuda">{faqCategories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>
      <div className="faq-browser">
        <div className="faq-question-list">
          {filtered.length ? filtered.map((item) => <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><small>{item.category}</small><span>{item.question}</span><ArrowRight size={16} /></button>) : <p>Nenhuma pergunta encontrada. Tente outro termo.</p>}
        </div>
        <article className="faq-answer" aria-live="polite">
          {selected ? <><p className="eyebrow">{selected.category}</p><h2>{selected.question}</h2><p>{selected.answer}</p>{selected.related ? <aside><Check size={16} /><span>{selected.related}</span></aside> : null}</> : <><h2>Não encontramos essa resposta.</h2><p>Envie sua pergunta abaixo para ela entrar na triagem da equipe.</p></>}
        </article>
      </div>
      {compact ? null : <form className="faq-question-form" onSubmit={submitQuestion}><div><p className="eyebrow">Ainda precisa de ajuda?</p><h2>Envie sua pergunta com contexto.</h2><p>Não inclua senhas, documentos ou dados pessoais de clientes.</p></div><label className="field"><span>E-mail da conta</span><input type="email" required placeholder="voce@empresa.com" /></label><label className="field field--full"><span>Sua pergunta</span><textarea rows={4} minLength={12} required placeholder="Conte o que você estava tentando fazer e em qual tela." /></label><button className="button button--primary"><Send size={16} /> Enviar para triagem</button>{sent ? <span className="action-feedback action-feedback--success">Pergunta registrada nesta demonstração.</span> : null}</form>}
    </div>
  );
}
