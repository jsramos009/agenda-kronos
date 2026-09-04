"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Check, ChevronDown, Clock3, Eye, Sparkles, X } from "lucide-react";
import { markRecommendationRead, updateRecommendation } from "@/app/(workspace)/actions";
import { useNiche } from "@/components/niche-provider";
import { InlineError, PageHeader } from "@/components/ui";
import { emitInsightReadState } from "@/lib/insight-badge-events";
import { isActiveInsight, type InsightStatus } from "@/lib/queries/insights";

export type InsightRow = {
  id: string;
  title: string;
  evidence: string;
  impact: string;
  origin: string;
  effort?: string;
  status: InsightStatus;
  readAt: string | null;
  snoozedUntil: string | null;
};

type InsightTab = "new" | "applied" | "dismissed";

export function InsightsManager({ initialInsights, demo, loadError = "", canManageInsights }: { initialInsights: InsightRow[]; demo: boolean; loadError?: string; canManageInsights: boolean }) {
  const router = useRouter();
  const { niche } = useNiche();
  const incomingSignature = JSON.stringify(initialInsights);
  const [model, setModel] = useState(() => ({ signature: incomingSignature, incoming: initialInsights, insights: initialInsights }));
  const [tab, setTab] = useState<InsightTab>("new");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pendingIds, setPendingIds] = useState(() => new Set<string>());
  const pendingIdsRef = useRef(new Set<string>());
  const retryInFlightRef = useRef(false);
  const [, startTransition] = useTransition();
  const [retryPending, startRetryTransition] = useTransition();

  if (!loadError && model.signature !== incomingSignature) {
    const currentById = new Map(model.insights.map((insight) => [insight.id, insight]));
    setModel({
      signature: incomingSignature,
      incoming: initialInsights,
      insights: initialInsights.map((insight) => pendingIds.has(insight.id) ? (currentById.get(insight.id) ?? insight) : insight),
    });
  }
  const snoozedScheduleSignature = model.insights.filter((insight) => insight.status === "snoozed" && insight.snoozedUntil).map((insight) => `${insight.id}:${insight.snoozedUntil}`).join("|");

  useEffect(() => {
    const now = Date.now();
    const target = snoozedScheduleSignature.split("|").map((entry) => new Date(entry.slice(entry.indexOf(":") + 1)).getTime()).filter((value) => value > now).sort((a, b) => a - b)[0];
    if (!target) return;
    let timer = 0;
    const schedule = () => {
      const remaining = target - Date.now();
      timer = window.setTimeout(() => {
        if (Date.now() >= target) {
          if (demo) {
            const currentTime = Date.now();
            setModel((current) => ({ ...current, insights: current.insights.map((insight) => insight.status === "snoozed" && insight.snoozedUntil && new Date(insight.snoozedUntil).getTime() <= currentTime ? { ...insight, status: "new", snoozedUntil: null } : insight) }));
          } else router.refresh();
        }
        else schedule();
      }, Math.min(Math.max(remaining + 100, 1_000), 300_000));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [demo, router, snoozedScheduleSignature]);

  useEffect(() => {
    if (!retryPending) retryInFlightRef.current = false;
  }, [retryPending]);

  const activeInsights = model.insights.filter((insight) => isActiveInsight(insight));
  const visibleInsights = tab === "new" ? activeInsights : model.insights.filter((insight) => insight.status === tab);

  const setPending = (id: string, value: boolean) => {
    const immediate = new Set(pendingIdsRef.current);
    if (value) immediate.add(id);
    else immediate.delete(id);
    pendingIdsRef.current = immediate;
    setPendingIds((current) => {
      const next = new Set(current);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const openDetails = (insight: InsightRow) => {
    const opening = expandedId !== insight.id;
    setExpandedId(opening ? insight.id : null);
    if (!opening || insight.readAt || demo) return;
    const readAt = new Date().toISOString();
    setPending(insight.id, true);
    setModel((current) => ({ ...current, insights: current.insights.map((item) => item.id === insight.id ? { ...item, readAt } : item) }));
    emitInsightReadState({ id: insight.id, unread: false });
    startTransition(async () => {
      const result = await markRecommendationRead(insight.id);
      setPending(insight.id, false);
      if (result.status === "error") {
        setModel((current) => ({ ...current, insights: current.insights.map((item) => item.id === insight.id ? { ...item, readAt: insight.readAt } : item) }));
        emitInsightReadState({ id: insight.id, unread: true });
        setMessage(result.message);
        return;
      }
      setModel((current) => {
        const incoming = current.incoming.find((item) => item.id === insight.id);
        return { ...current, insights: current.insights.map((item) => item.id === insight.id ? { ...(incoming ?? item), readAt: incoming?.readAt ?? readAt } : item) };
      });
      router.refresh();
    });
  };

  const change = (id: string, status: "new" | "applied" | "dismissed" | "snoozed") => {
    if (pendingIdsRef.current.has(id)) return;
    const snapshot = model.insights.find((insight) => insight.id === id);
    if (!snapshot) return;
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + 1);
    const optimisticInsight: InsightRow = {
      ...snapshot,
      status,
      snoozedUntil: status === "snoozed" ? snoozedUntil.toISOString() : null,
    };
    setPending(id, true);
    setModel((current) => ({ ...current, insights: current.insights.map((insight) => insight.id === id ? optimisticInsight : insight) }));
    if (demo) {
      setPending(id, false);
      setMessage(status === "new" ? "Insight reaberto na demonstração." : status === "applied" ? "Insight aplicado à demonstração." : status === "snoozed" ? "Você será lembrado depois." : "Insight dispensado.");
      return;
    }
    startTransition(async () => {
      const result = await updateRecommendation(id, status);
      setMessage(result.message);
      setPending(id, false);
      if (result.status === "error") {
        setModel((current) => ({ ...current, insights: current.insights.map((insight) => insight.id === id ? snapshot : insight) }));
        return;
      }
      setModel((current) => {
        const incoming = current.incoming.find((insight) => insight.id === id);
        return { ...current, insights: current.insights.map((insight) => insight.id === id ? { ...(incoming ?? insight), status: optimisticInsight.status, snoozedUntil: optimisticInsight.status === "snoozed" ? (incoming?.snoozedUntil ?? optimisticInsight.snoozedUntil) : null } : insight) };
      });
      router.refresh();
    });
  };

  const retryLoad = () => {
    if (retryInFlightRef.current) return;
    retryInFlightRef.current = true;
    startRetryTransition(() => router.refresh());
  };

  return (
    <>
      <PageHeader eyebrow="Inteligência · Sob seu controle" title="Insights" description={`Sugestões explicadas a partir da sua operação e do modelo de ${niche.label.toLowerCase()}.`} action={null} />
      <div className="tabs" aria-label="Estado dos insights">
        <button aria-pressed={tab === "new"} className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}>Novos <span>{activeInsights.length}</span></button>
        <button aria-pressed={tab === "applied"} className={tab === "applied" ? "active" : ""} onClick={() => setTab("applied")}>Aplicados</button>
        <button aria-pressed={tab === "dismissed"} className={tab === "dismissed" ? "active" : ""} onClick={() => setTab("dismissed")}>Dispensados</button>
      </div>
      {loadError ? <InlineError text={loadError} retry={retryLoad} retryPending={retryPending} /> : null}
      {message ? <div className="board-feedback" aria-live="polite">{message}</div> : null}
      <section className="insights-list" aria-label="Insights">
        {visibleInsights.length ? visibleInsights.map((insight, index) => {
          const expanded = expandedId === insight.id;
          const pending = pendingIds.has(insight.id);
          return (
            <article key={insight.id} className={`${insight.readAt ? "is-read" : "is-unread"} ${expanded ? "is-expanded" : ""}`} aria-busy={pending || undefined}>
              <div className="insight-index"><Sparkles size={18} /><span>{String(index + 1).padStart(2, "0")}</span></div>
              <div className="insight-copy">
                <p>{insight.readAt ? "LIDO" : "NOVO INSIGHT"}</p>
                <h2>{insight.title}</h2>
                <span>{insight.evidence}</span>
                <button type="button" className="insight-details-toggle" aria-expanded={expanded} aria-controls={`insight-details-${insight.id}`} onClick={() => openDetails(insight)}>
                  {expanded ? "Ocultar detalhes" : "Ver detalhes"}<ChevronDown size={15} aria-hidden="true" />
                </button>
                {expanded ? <div id={`insight-details-${insight.id}`} className="insight-details">
                  <small><strong>Impacto</strong>{insight.impact}</small>
                  <small><strong>Origem</strong>{insight.origin}</small>
                  {insight.effort ? <small><strong>Esforço</strong>{insight.effort}</small> : null}
                </div> : null}
              </div>
              {canManageInsights ? <aside>
                {tab === "new" ? <>
                  <button className="button button--primary" disabled={pending} onClick={() => change(insight.id, "applied")}>Aplicar <ArrowRight size={16} /></button>
                  <button className="button button--ghost" disabled={pending} onClick={() => change(insight.id, "snoozed")}><Clock3 size={15} /> Lembrar depois</button>
                  <button className="dismiss" disabled={pending} onClick={() => change(insight.id, "dismissed")}><X size={14} /> Dispensar</button>
                </> : <button className="button button--secondary" disabled={pending} onClick={() => change(insight.id, "new")}>Reabrir insight</button>}
              </aside> : <aside className="insight-readonly"><Eye size={16} /><span>Somente visualização</span></aside>}
            </article>
          );
        }) : <div className="empty-state"><span><Check size={22} /></span><h3>Nenhum insight nesta lista</h3><p>{tab === "new" ? "Novas sugestões aparecerão quando houver dados suficientes." : "Os insights movidos para este grupo aparecerão aqui."}</p></div>}
      </section>
      <p className="insight-note"><Check size={15} /> Nenhuma mudança é aplicada sem sua confirmação.</p>
    </>
  );
}
