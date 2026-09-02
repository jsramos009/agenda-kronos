"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, ImagePlus, Sparkles, Upload } from "lucide-react";
import { KronosMark } from "@/components/kronos-mark";
import { nicheList, niches, type NicheId } from "@/lib/niches";
import { completeOnboarding, getOnboardingDraft, saveOnboardingDraft, type OnboardingDraft } from "./actions";

const steps = ["Empresa", "Identidade", "Operação", "Modelos", "Revisão"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [nicheId, setNicheId] = useState<NicheId>("climatizacao");
  const [theme, setTheme] = useState(niches.climatizacao.theme);
  const [operation, setOperation] = useState<OnboardingDraft["operation"]>({ startsAt: "08:00", endsAt: "18:00", teamSize: "2-5", resourceCount: "2 disponíveis", days: [1, 2, 3, 4, 5, 6], channels: ["WhatsApp", "Telefone", "Instagram", "Presencial"] });
  const [selectedServices, setSelectedServices] = useState(niches.climatizacao.services.map((service) => service.name));
  const [workflowNames, setWorkflowNames] = useState(niches.climatizacao.workflow.map((stage) => stage.name));
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Carregando suas escolhas…");
  const niche = niches[nicheId];

  const themeVars = {
    "--tenant-primary": theme.primary,
    "--tenant-accent": theme.accent,
    "--tenant-soft": theme.soft,
    "--tenant-line": theme.line,
  } as React.CSSProperties;

  const buildDraft = useCallback((): OnboardingDraft => ({
    step,
    companyName,
    description,
    nicheId,
    theme,
    operation,
    selectedServices,
    workflowNames,
  }), [companyName, description, nicheId, operation, selectedServices, step, theme, workflowNames]);

  useEffect(() => {
    let mounted = true;
    void getOnboardingDraft().then((draft) => {
      if (!mounted) return;
      if (draft) {
        setStep(draft.step);
        setCompanyName(draft.companyName);
        setDescription(draft.description);
        setNicheId(draft.nicheId);
        setTheme(draft.theme);
        setOperation(draft.operation);
        setSelectedServices(draft.selectedServices);
        setWorkflowNames(draft.workflowNames);
      }
      setDraftReady(true);
      setSaveStatus("Seu progresso é salvo automaticamente");
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      setSaveStatus("Salvando suas escolhas…");
      void saveOnboardingDraft(buildDraft()).then(({ ok }) => {
        setSaveStatus(ok ? "Progresso salvo" : "As escolhas serão mantidas neste dispositivo");
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [buildDraft, draftReady]);

  const changeNiche = (id: NicheId) => {
    const next = niches[id];
    setNicheId(id);
    setTheme(next.theme);
    setSelectedServices(next.services.map((service) => service.name));
    setWorkflowNames(next.workflow.map((stage) => stage.name));
  };

  const onLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  const activate = async () => {
    setActivating(true);
    setActivationError(null);
    const formData = new FormData();
    formData.set("configuration", JSON.stringify(buildDraft()));
    if (logoFile) formData.set("logo", logoFile);
    const result = await completeOnboarding(formData);
    if (!result.ok) {
      setActivationError(result.message);
      setActivating(false);
      return;
    }
    router.push(result.demo ? "/dashboard" : "/assinatura");
    router.refresh();
  };

  const canContinue = step === 0
    ? companyName.trim().length >= 2
    : step === 2
      ? operation.days.length > 0 && operation.channels.length > 0 && operation.endsAt > operation.startsAt
      : step === 3
        ? selectedServices.length > 0 && workflowNames.every((name) => name.trim().length >= 2)
        : true;

  return (
    <main className="onboarding" style={themeVars}>
      <aside className="onboarding__aside">
        <KronosMark />
        <div className="onboarding__promise">
          <span><Clock3 size={19} /></span>
          <p>Conte como você trabalha.</p>
          <h1>A Kronos prepara o restante.</h1>
        </div>
        <ol className="onboarding__steps">
          {steps.map((label, index) => (
            <li key={label} className={index === step ? "active" : index < step ? "done" : ""}>
              <span>{index < step ? <Check size={14} /> : index + 1}</span>
              <div><strong>{label}</strong><small>{index === step ? "Em andamento" : index < step ? "Concluído" : "A seguir"}</small></div>
            </li>
          ))}
        </ol>
        <p className="onboarding__save"><CheckCircle2 size={15} /> {saveStatus}</p>
      </aside>

      <section className="onboarding__content">
        <div className="onboarding__top"><span>Personalização inicial</span><strong>{step + 1} de {steps.length}</strong></div>
        <div className="onboarding__card">
          {step === 0 ? (
            <div className="step-panel">
              <p className="eyebrow">01 · Sua empresa</p>
              <h2>O que organiza o seu dia?</h2>
              <p>Essas respostas criam uma primeira configuração. Tudo poderá ser ajustado depois.</p>
              <div className="form-grid">
                <label className="field field--full"><span>Nome da empresa</span><input value={companyName} placeholder="Ex.: Studio Aurora" autoComplete="organization" onChange={(e) => setCompanyName(e.target.value)} /></label>
                <label className="field field--full"><span>Descrição do negócio</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
              </div>
              <fieldset className="niche-fieldset">
                <legend>Qual é o seu nicho?</legend>
                <div className="niche-grid">
                  {nicheList.map((item) => (
                    <button type="button" key={item.id} className={nicheId === item.id ? "selected" : ""} onClick={() => changeNiche(item.id)}>
                      <span style={{ background: item.theme.primary }} />
                      <div><strong>{item.label}</strong><small>{item.descriptor}</small></div>
                      {nicheId === item.id ? <CheckCircle2 size={18} /> : null}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="step-panel">
              <p className="eyebrow">02 · Identidade</p>
              <h2>Faça o sistema ter a sua cara.</h2>
              <p>A assinatura Kronos permanece. Sua marca conduz os pontos de ação e reconhecimento.</p>
              <div className="identity-layout">
                <label className="logo-drop">
                  {logo ? <Image src={logo} alt="Prévia do logo enviado" width={180} height={120} unoptimized /> : <><span><ImagePlus size={25} /></span><strong>Envie seu logo</strong><small>PNG, JPG ou WebP · até 5 MB</small></>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} />
                  <em><Upload size={14} /> Escolher arquivo</em>
                </label>
                <div className="palette-preview">
                  <span className="field-label">Tabela sugerida · {niche.label}</span>
                  <div className="swatches swatches--editable">
                    {Object.entries(theme).map(([name, color]) => <label key={name}><input type="color" value={color} aria-label={`Editar cor ${name}`} onChange={(event) => setTheme((current) => ({ ...current, [name]: event.target.value }))} /><span>{colorLabel(name)}</span><small>{color}</small></label>)}
                  </div>
                  <button className="text-button palette-reset" type="button" onClick={() => setTheme(niche.theme)}>Restaurar paleta de {niche.label}</button>
                  <p><Sparkles size={15} /> Ajuste cada cor agora ou novamente nas configurações.</p>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="step-panel">
              <p className="eyebrow">03 · Operação</p>
              <h2>Quando e com quais recursos você atende?</h2>
              <p>Usaremos isso para prevenir conflitos e sugerir encaixes reais.</p>
              <div className="form-grid">
                <label className="field"><span>Início do expediente</span><input type="time" value={operation.startsAt} onChange={(event) => setOperation((current) => ({ ...current, startsAt: event.target.value }))} /></label>
                <label className="field"><span>Fim do expediente</span><input type="time" value={operation.endsAt} onChange={(event) => setOperation((current) => ({ ...current, endsAt: event.target.value }))} /></label>
                <label className="field"><span>Tamanho da equipe</span><select value={operation.teamSize} onChange={(event) => setOperation((current) => ({ ...current, teamSize: event.target.value }))}><option value="1">Somente eu</option><option value="2-5">2 a 5 pessoas</option><option value="6-15">6 a 15 pessoas</option><option value="16+">Mais de 15</option></select></label>
                <label className="field"><span>{niche.resource}</span><input value={operation.resourceCount} onChange={(event) => setOperation((current) => ({ ...current, resourceCount: event.target.value }))} /></label>
              </div>
              <fieldset className="days-fieldset"><legend>Dias de atendimento</legend><div>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, index) => <label key={day}><input type="checkbox" checked={operation.days.includes(index)} onChange={() => setOperation((current) => ({ ...current, days: toggleNumber(current.days, index) }))} /><span>{day}</span></label>)}</div></fieldset>
              <fieldset className="channel-fieldset"><legend>Como chegam os agendamentos?</legend><div>{(["WhatsApp", "Telefone", "Instagram", "Presencial", "Site"] as const).map((channel) => <label key={channel}><input type="checkbox" checked={operation.channels.includes(channel)} onChange={() => setOperation((current) => ({ ...current, channels: toggleValue(current.channels, channel) }))} /><span>{channel}</span></label>)}</div></fieldset>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="step-panel">
              <p className="eyebrow">04 · Modelos</p>
              <h2>Preparamos um começo específico.</h2>
              <p>Serviços e etapas vieram do modelo de {niche.label}. Aceite agora e refine quando quiser.</p>
              <div className="models-grid">
                <section><div className="section-heading"><h3>Serviços iniciais</h3><span>{selectedServices.length} selecionados</span></div>{niche.services.map((service) => <label className="model-row model-row--selectable" key={service.name}><input type="checkbox" checked={selectedServices.includes(service.name)} onChange={() => setSelectedServices((current) => toggleValue(current, service.name))} /><div><strong>{service.name}</strong><small>{service.duration} · {service.price}</small></div><span>{selectedServices.includes(service.name) ? "Incluído" : "Não incluir"}</span></label>)}</section>
                <section><div className="section-heading"><h3>Fluxo de atendimento</h3><span>{workflowNames.length} etapas editáveis</span></div><div className="mini-flow mini-flow--editable">{workflowNames.map((stage, index) => <label key={index}><span>{index + 1}</span><input value={stage} aria-label={`Nome da etapa ${index + 1}`} onChange={(event) => setWorkflowNames((current) => current.map((name, position) => position === index ? event.target.value : name))} /></label>)}</div></section>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="step-panel review-panel">
              <p className="eyebrow">05 · Revisão</p>
              <h2>Seu espaço está pronto para começar.</h2>
              <p>Montamos a primeira versão. Você continua no controle de cada detalhe.</p>
              <div className="system-preview">
                <div className="system-preview__bar"><span>{logo ? <Image src={logo} alt="" width={32} height={32} unoptimized /> : companyName.slice(0, 2).toUpperCase()}</span><div><strong>{companyName || "Minha empresa"}</strong><small>{niche.label}</small></div><em>Prévia</em></div>
                <div className="system-preview__body">
                  <div><span>Expediente</span><strong>{operation.startsAt}</strong><small>até {operation.endsAt}</small></div>
                  <div><span>Serviços iniciais</span><strong>{selectedServices.length}</strong><small>todos editáveis</small></div>
                  <section><h3>Seu fluxo</h3><div>{workflowNames.map((stage, index) => <span key={`${stage}-${index}`}><i>{index + 1}</i>{stage}</span>)}</div></section>
                </div>
              </div>
              <div className="review-checks"><span><Check size={15} /> Tabela de cores aplicada</span><span><Check size={15} /> {selectedServices.length} serviços criados</span><span><Check size={15} /> Kanban com {workflowNames.length} etapas</span><span><Check size={15} /> Tenant independente e protegido</span></div>
              {activationError ? <div className="form-message form-message--error">{activationError}</div> : null}
            </div>
          ) : null}
        </div>
        <footer className="onboarding__actions">
          <button className="button button--ghost" disabled={step === 0} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Voltar</button>
          {step < steps.length - 1 ? <button className="button button--primary" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Continuar <ArrowRight size={17} /></button> : <button className="button button--primary" disabled={activating || !canContinue} onClick={activate}>{activating ? "Configurando…" : "Ativar meu espaço"} <Check size={17} /></button>}
        </footer>
      </section>
    </main>
  );
}

function toggleNumber(values: number[], value: number) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value].sort();
}

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function colorLabel(value: string) {
  return ({ primary: "Principal", accent: "Destaque", soft: "Fundo suave", line: "Linhas" } as Record<string, string>)[value] ?? value;
}
