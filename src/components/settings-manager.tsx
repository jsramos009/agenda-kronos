"use client";

import { FormEvent, useActionState, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Check, Clock3, Columns3, ImagePlus, LockKeyhole, Palette, Plug, RotateCcw, UsersRound } from "lucide-react";
import { saveAgendaSettings, saveOrganizationSettings, type ActionState } from "@/app/(workspace)/actions";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";
import { nicheList, niches, type NicheId } from "@/lib/niches";

const tabs = ["Empresa e marca", "Nicho e modelos", "Agenda", "Equipe e acesso", "Notificações", "Kanban", "Segurança"] as const;
type Tab = typeof tabs[number];
const initialState: ActionState = { status: "idle", message: "" };

type SettingsValues = {
  description: string;
  colors: { primary: string; accent: string; soft: string; line: string };
  logoUrl: string | null;
  agenda: { start: string; end: string; bookingNotice: string; cancellationNotice: string; days: number[]; slotIntervalMinutes: 10 | 15 | 30 | 60 };
  notifications: { reminder24: boolean; reminder2: boolean; dailyDigest: boolean };
  selectedServices: string[];
  workflowNames: string[];
};

export function SettingsManager({ demo, initialSettings }: { demo: boolean; initialSettings: SettingsValues | null }) {
  const { niche, nicheId, setNicheId, companyName, setCompanyName } = useNiche();
  const [tab, setTab] = useState<Tab>("Empresa e marca");
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState(initialSettings?.description ?? "");
  const [colors, setColors] = useState(initialSettings?.colors ?? niche.theme);
  const [agenda, setAgenda] = useState(initialSettings?.agenda ?? { start: "08:00", end: "18:00", bookingNotice: "60", cancellationNotice: "240", days: [1, 2, 3, 4, 5, 6], slotIntervalMinutes: 30 });
  const [notifications, setNotifications] = useState(initialSettings?.notifications ?? { reminder24: true, reminder2: true, dailyDigest: false });
  const [selectedServices, setSelectedServices] = useState(initialSettings?.selectedServices.length ? initialSettings.selectedServices : niche.services.map((service) => service.name));
  const [workflowNames, setWorkflowNames] = useState(initialSettings?.workflowNames.length ? initialSettings.workflowNames : niche.workflow.map((stage) => stage.name));
  const [logoPreview, setLogoPreview] = useState(initialSettings?.logoUrl ?? "");
  const [state, action, pending] = useActionState(saveOrganizationSettings, initialState);
  const [agendaState, agendaAction, agendaPending] = useActionState(saveAgendaSettings, initialState);
  const activeState = tab === "Agenda" ? agendaState : state;
  const activePending = tab === "Agenda" ? agendaPending : pending;

  useEffect(() => () => {
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  const changeNiche = (id: NicheId) => {
    setNicheId(id);
    setColors(niches[id].theme);
    setSelectedServices(niches[id].services.map((service) => service.name));
    setWorkflowNames(niches[id].workflow.map((stage) => stage.name));
  };
  const saveDemo = (event: FormEvent<HTMLFormElement>) => {
    if (!demo) return;
    event.preventDefault();
    window.localStorage.setItem("kronos:settings", JSON.stringify({ companyName, description, nicheId, colors, agenda, notifications, selectedServices, workflowNames }));
    setMessage("Configurações salvas nesta demonstração.");
  };
  const restore = () => {
    setColors(niches[nicheId].theme);
    setAgenda({ start: "08:00", end: "18:00", bookingNotice: "60", cancellationNotice: "240", days: [1, 2, 3, 4, 5, 6], slotIntervalMinutes: 30 });
    setNotifications({ reminder24: true, reminder2: true, dailyDigest: false });
    setSelectedServices(niches[nicheId].services.map((service) => service.name));
    setWorkflowNames(niches[nicheId].workflow.map((stage) => stage.name));
    setMessage("Modelo recomendado restaurado.");
  };
  const previewStyle = { "--tenant-primary": colors.primary, "--tenant-accent": colors.accent, "--tenant-soft": colors.soft, "--tenant-line": colors.line } as React.CSSProperties;

  return <>
    <PageHeader eyebrow="Sistema · Personalização" title="Configurações" description="Marca, agenda, equipe e regras de operação em uma sequência contínua." action={null} />
    <section className="settings-layout" style={previewStyle}>
      <nav aria-label="Seções das configurações">{tabs.map((item) => <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}{!demo ? <Link href="/configuracoes/integracoes" prefetch><Plug size={15} /> Integrações</Link> : null}</nav>
      <form action={demo ? undefined : tab === "Agenda" ? agendaAction : action} onSubmit={saveDemo} className="settings-panel">
        <input type="hidden" name="companyName" value={companyName} />
        <input type="hidden" name="description" value={description} />
        <input type="hidden" name="nicheId" value={nicheId} />
        <input type="hidden" name="primaryColor" value={colors.primary} />
        <input type="hidden" name="accentColor" value={colors.accent} />
        <input type="hidden" name="softColor" value={colors.soft} />
        <input type="hidden" name="lineColor" value={colors.line} />
        <input type="hidden" name="agendaStart" value={agenda.start} />
        <input type="hidden" name="agendaEnd" value={agenda.end} />
        <input type="hidden" name="bookingNotice" value={agenda.bookingNotice} />
        <input type="hidden" name="cancellationNotice" value={agenda.cancellationNotice} />
        <input type="hidden" name="agendaDays" value={JSON.stringify(agenda.days)} />
        <input type="hidden" name="slotIntervalMinutes" value={agenda.slotIntervalMinutes} />
        <input type="hidden" name="reminder24" value={String(notifications.reminder24)} />
        <input type="hidden" name="reminder2" value={String(notifications.reminder2)} />
        <input type="hidden" name="dailyDigest" value={String(notifications.dailyDigest)} />
        <input type="hidden" name="selectedServices" value={JSON.stringify(selectedServices)} />
        <input type="hidden" name="workflowNames" value={JSON.stringify(workflowNames)} />

        {tab === "Empresa e marca" ? <>
          <section><div className="settings-heading"><div><h2>Dados da empresa</h2><p>Essas informações identificam o workspace em toda a operação.</p></div></div><div className="form-grid"><label className="field"><span>Nome da empresa</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></label><label className="field"><span>Nicho atual</span><select value={nicheId} onChange={(event) => changeNiche(event.target.value as NicheId)}>{nicheList.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label className="field field--full"><span>Descrição</span><textarea rows={4} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explique brevemente como sua empresa atende." /></label></div><label className="settings-logo-uploader"><span>{logoPreview ? <Image src={logoPreview} alt="Prévia do logo da empresa" width={58} height={58} unoptimized /> : <ImagePlus size={26} />}</span><strong>{logoPreview ? "Trocar logo" : "Adicionar logo"}</strong><small>PNG, JPG ou WebP · até 5 MB</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setLogoPreview(URL.createObjectURL(file)); }} /></label></section>
          <section><div className="settings-heading"><div><h2>Tabela de cores</h2><p>Comece pela paleta de {niche.label.toLowerCase()} ou ajuste cada cor.</p></div><span><Palette size={17} /> Editável</span></div><div className="settings-swatches">{Object.entries(colors).map(([name, color]) => <label key={name}><input aria-label={`Cor ${name}`} type="color" value={color} onChange={(event) => setColors((current) => ({ ...current, [name]: event.target.value }))} /><span>{colorLabel(name)}</span><small>{color}</small></label>)}</div><div className="settings-note"><Check size={16} /><p><strong>Prévia imediata</strong><span>As mudanças aparecem ao lado antes de você salvar.</span></p></div></section>
        </> : null}
        {tab === "Nicho e modelos" ? <SettingsSection icon={<Palette />} title={`Modelos de ${niche.label}`} text={`${niche.services.length} serviços, ${niche.workflow.length} etapas e ${niche.knowledge.length} artigos sugeridos.`}>{niche.services.map((service) => <label className="check-row" key={service.name}><input type="checkbox" checked={selectedServices.includes(service.name)} onChange={(event) => setSelectedServices((current) => event.target.checked ? [...new Set([...current, service.name])] : current.filter((name) => name !== service.name))} /><span>{service.name}</span><small>{service.duration}</small></label>)}</SettingsSection> : null}
        {tab === "Agenda" ? <SettingsSection icon={<Clock3 />} title="Regras da agenda" text="Defina os dias de atendimento, expediente, antecedência e intervalo de cancelamento."><fieldset className="availability-days"><legend>Dias com atendimento</legend><div>{[[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [0, "Dom"]].map(([value, label]) => <label key={value}><input type="checkbox" checked={agenda.days.includes(value as number)} onChange={(event) => setAgenda((current) => ({ ...current, days: event.target.checked ? [...current.days, value as number].sort() : current.days.filter((day) => day !== value) }))} /><span>{label}</span></label>)}</div><small>Selecione ao menos um dia. A agenda usa estes dias para indicar disponibilidade.</small></fieldset><div className="form-grid"><label className="field"><span>Início</span><input type="time" value={agenda.start} onChange={(event) => setAgenda((current) => ({ ...current, start: event.target.value }))} /></label><label className="field"><span>Fim</span><input type="time" value={agenda.end} onChange={(event) => setAgenda((current) => ({ ...current, end: event.target.value }))} /></label><label className="field"><span>Intervalo da grade</span><select value={agenda.slotIntervalMinutes} onChange={(event) => setAgenda((current) => ({ ...current, slotIntervalMinutes: Number(event.target.value) as 10 | 15 | 30 | 60 }))}><option value="10">10 minutos</option><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">60 minutos</option></select></label><label className="field"><span>Antecedência mínima</span><select value={agenda.bookingNotice} onChange={(event) => setAgenda((current) => ({ ...current, bookingNotice: event.target.value }))}><option value="0">Sem limite</option><option value="60">1 hora</option><option value="240">4 horas</option></select></label><label className="field"><span>Cancelamento online</span><select value={agenda.cancellationNotice} onChange={(event) => setAgenda((current) => ({ ...current, cancellationNotice: event.target.value }))}><option value="60">1 hora antes</option><option value="240">4 horas antes</option><option value="1440">1 dia antes</option></select></label></div></SettingsSection> : null}
        {tab === "Equipe e acesso" ? <SettingsSection icon={<UsersRound />} title="Papéis e permissões" text="Convide pessoas na conta ou revise todos os acessos no painel administrativo."><div className="settings-link-row"><a className="button button--secondary" href="/conta">Conta e equipe</a><a className="button button--secondary" href="/admin">Painel administrativo</a></div></SettingsSection> : null}
        {tab === "Notificações" ? <SettingsSection icon={<Bell />} title="Lembretes" text="Escolha quais automações serão preparadas para cada agendamento."><Toggle label="Lembrete 24 horas antes" checked={notifications.reminder24} onChange={(checked) => setNotifications((value) => ({ ...value, reminder24: checked }))} /><Toggle label="Lembrete 2 horas antes" checked={notifications.reminder2} onChange={(checked) => setNotifications((value) => ({ ...value, reminder2: checked }))} /><Toggle label="Resumo diário da operação" checked={notifications.dailyDigest} onChange={(checked) => setNotifications((value) => ({ ...value, dailyDigest: checked }))} /></SettingsSection> : null}
        {tab === "Kanban" ? <SettingsSection icon={<Columns3 />} title="Etapas visíveis" text="Edite os nomes sem perder os estados internos ligados à agenda.">{workflowNames.map((stage, index) => <label className="field" key={index}><span>Etapa {index + 1}</span><input value={stage} maxLength={80} onChange={(event) => setWorkflowNames((current) => current.map((name, itemIndex) => itemIndex === index ? event.target.value : name))} /></label>)}</SettingsSection> : null}
        {tab === "Segurança" ? <SettingsSection icon={<LockKeyhole />} title="Segurança da conta" text="Sessões, papéis e dados são isolados por organização."><div className="security-list"><p><Check size={15} /> Políticas de acesso por tenant</p><p><Check size={15} /> Histórico de alterações administrativas</p><p><Check size={15} /> Recuperação segura de senha</p></div><a className="button button--secondary" href="/recuperar-senha">Redefinir minha senha</a></SettingsSection> : null}
        <footer><button type="button" className="button button--ghost" onClick={restore}><RotateCcw size={16} /> Restaurar modelo</button><button className="button button--primary" disabled={activePending}>{activePending ? "Salvando…" : "Salvar alterações"}</button>{(message || activeState.message) ? <span className={`action-feedback action-feedback--${activeState.status === "error" ? "error" : "success"}`}>{message || activeState.message}</span> : null}</footer>
      </form>
      <aside className="settings-preview"><p className="eyebrow">Prévia do workspace</p><div className="preview-card"><span>Hoje · 10:30</span><h3>Maria Santos</h3><p>{niche.services[0].name}</p><div><em>Confirmado</em><strong>{niche.services[0].duration}</strong></div></div><small>A marca Kronos permanece constante; a operação acompanha o seu nicho.</small></aside>
    </section>
  </>;
}

function colorLabel(value: string) { return ({ primary: "Principal", accent: "Destaque", soft: "Fundo suave", line: "Linhas" } as Record<string, string>)[value] ?? value; }
function SettingsSection({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) { return <section className="settings-feature"><span>{icon}</span><div className="settings-heading"><div><h2>{title}</h2><p>{text}</p></div></div><div className="settings-feature__body">{children}</div></section>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="toggle-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>; }
