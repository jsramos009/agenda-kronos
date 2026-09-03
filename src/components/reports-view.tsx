"use client";

import { useMemo, useState } from "react";
import { CalendarX2, Download } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { dateKeyInBrazil, shiftDateKey } from "@/lib/calendar-date";

export type ReportAppointment = {
  startsAt: string;
  endsAt: string;
  status: string;
  professional: string;
  priceCents: number;
};

type Period = "7d" | "30d" | "year";
const periodLabels: Record<Period, string> = { "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", year: "Este ano" };

export function ReportsView({ appointments, professionals, today, demo = false }: { appointments: ReportAppointment[]; professionals: string[]; today: string; demo?: boolean }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [professional, setProfessional] = useState("Todos");
  const data = useMemo(() => calculateReport(appointments, period, professional, professionals.length, today), [appointments, period, professional, professionals.length, today]);

  const exportReport = () => {
    const rows = [
      ["Período", periodLabels[period]],
      ["Profissional", professional],
      ["Agendamentos", String(data.total)],
      ["Ocupação", percent(data.occupancy)],
      ["Taxa de faltas", percent(data.noShow)],
      ["Tempo médio", durationLabel(data.averageMinutes)],
      ["Receita realizada", money(data.revenueCents)],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv" }));
    link.download = `relatorio-kronos-${period}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <>
    <PageHeader eyebrow="Análise · Operação" title="Relatórios" description="Indicadores calculados com os agendamentos reais deste espaço." action={null} />
    <div className="toolbar"><div className="filter-pills">{(["7d", "30d", "year"] as const).map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{periodLabels[item]}</button>)}</div><div><label className="chip chip--select">Profissional <select value={professional} onChange={(event) => setProfessional(event.target.value)}><option>Todos</option>{professionals.map((name) => <option key={name}>{name}</option>)}</select></label><button className="chip" onClick={exportReport}><Download size={15} /> Exportar CSV</button></div></div>
    <section className="report-stats"><article><span>Ocupação da agenda</span><strong>{percent(data.occupancy)}</strong><small className="neutral">{data.total} agendamento(s)</small></article><article><span>Taxa de faltas</span><strong>{percent(data.noShow)}</strong><small className="neutral">Baseada nos status reais</small></article><article><span>Tempo médio</span><strong>{durationLabel(data.averageMinutes)}</strong><small className="neutral">Por atendimento</small></article><article><span>Receita realizada</span><strong>{money(data.revenueCents)}</strong><small className="neutral">Serviços concluídos</small></article></section>
    <section className="reports-grid"><article className="panel report-chart"><div className="section-heading"><div><p className="eyebrow">Ocupação</p><h2>Ritmo do período</h2></div><span>Média {percent(data.occupancy)}</span></div>{data.total ? <div className="bar-chart">{data.bars.map((bar, index) => <div key={index}><i style={{ height: `${Math.max(bar.height, bar.count ? 8 : 0)}%` }} /><span>{bar.label}</span></div>)}</div> : <ReportEmpty />}</article><article className="panel distribution"><div className="section-heading"><div><p className="eyebrow">Distribuição</p><h2>Situação dos horários</h2></div></div>{data.total ? data.distribution.map((item, index) => <div key={item.label}><span><i style={{ opacity: 1 - index * 0.18 }} />{item.label}</span><strong>{percent(item.value)}</strong></div>) : <ReportEmpty compact />}</article></section>
    <p className="report-footnote">Filtros ativos: {periodLabels[period]} · {professional}.{demo ? " Dados ilustrativos da demonstração." : " Fonte: agenda deste espaço."}</p>
  </>;
}

function calculateReport(all: ReportAppointment[], period: Period, professional: string, professionalCount: number, today: string) {
  const start = period === "7d" ? shiftDateKey(today, -6) : period === "30d" ? shiftDateKey(today, -29) : `${today.slice(0, 4)}-01-01`;
  const rows = all.filter((item) => {
    const key = dateKeyInBrazil(item.startsAt);
    return key >= start && key <= today && (professional === "Todos" || item.professional === professional);
  });
  const active = rows.filter((item) => item.status !== "cancelled");
  const bookedMinutes = active.reduce((total, item) => total + Math.max(0, (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60_000), 0);
  const capacity = workdays(start, today) * 8 * 60 * (professional === "Todos" ? Math.max(1, professionalCount) : 1);
  const noShows = rows.filter((item) => item.status === "no_show").length;
  const revenueCents = rows.filter((item) => item.status === "completed").reduce((total, item) => total + item.priceCents, 0);
  const statuses = [
    { label: "Agendado ou confirmado", count: rows.filter((item) => ["scheduled", "confirmed"].includes(item.status)).length },
    { label: "Em atendimento ou espera", count: rows.filter((item) => ["in_progress", "waiting"].includes(item.status)).length },
    { label: "Concluído", count: rows.filter((item) => item.status === "completed").length },
    { label: "Falta ou cancelamento", count: rows.filter((item) => ["no_show", "cancelled"].includes(item.status)).length },
  ];
  const barCount = period === "7d" ? 7 : period === "30d" ? 10 : 12;
  const span = Math.max(1, daysBetweenKeys(start, today) + 1);
  const counts = Array.from({ length: barCount }, () => 0);
  rows.forEach((item) => {
    const offset = daysBetweenKeys(start, dateKeyInBrazil(item.startsAt));
    const bucket = Math.min(barCount - 1, Math.floor(offset / span * barCount));
    counts[bucket] += 1;
  });
  const max = Math.max(1, ...counts);

  return {
    total: rows.length,
    occupancy: capacity ? Math.min(100, bookedMinutes / capacity * 100) : 0,
    noShow: rows.length ? noShows / rows.length * 100 : 0,
    averageMinutes: active.length ? bookedMinutes / active.length : 0,
    revenueCents,
    bars: counts.map((count, index) => ({ count, height: count / max * 100, label: period === "year" ? new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(Number(today.slice(0, 4)), index, 1))).replace(".", "") : String(index + 1) })),
    distribution: statuses.map((item) => ({ label: item.label, value: rows.length ? item.count / rows.length * 100 : 0 })),
  };
}

function ReportEmpty({ compact = false }: { compact?: boolean }) {
  return <div className={`report-empty ${compact ? "report-empty--compact" : ""}`}><CalendarX2 size={24} /><strong>Nenhum agendamento no período</strong><span>Os indicadores serão calculados assim que a agenda receber dados.</span></div>;
}

function daysBetweenKeys(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86_400_000); }
function workdays(start: string, end: string) { let total = 0; for (let index = 0; index <= daysBetweenKeys(start, end); index += 1) { const day = new Date(`${shiftDateKey(start, index)}T00:00:00Z`).getUTCDay(); if (day > 0 && day < 6) total += 1; } return total; }
function percent(value: number) { return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`; }
function durationLabel(value: number) { if (!value) return "0 min"; const rounded = Math.round(value); const hours = Math.floor(rounded / 60); const minutes = rounded % 60; return hours ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`; }
function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
