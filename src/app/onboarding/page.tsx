"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, ImagePlus, Sparkles, Upload } from "lucide-react";
import { KronosMark } from "@/components/kronos-mark";
import { nicheList, niches, type NicheId } from "@/lib/niches";
import { completeOnboarding } from "./actions";

const steps = ["Empresa", "Identidade", "Operação", "Modelos", "Revisão"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("Clima Prime");
  const [description, setDescription] = useState("Instalação e manutenção de ar-condicionado para casas e empresas.");
  const [nicheId, setNicheId] = useState<NicheId>("climatizacao");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const niche = niches[nicheId];

  const themeVars = {
    "--tenant-primary": niche.theme.primary,
    "--tenant-accent": niche.theme.accent,
    "--tenant-soft": niche.theme.soft,
    "--tenant-line": niche.theme.line,
  } as React.CSSProperties;

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
    formData.set("companyName", companyName);
    formData.set("description", description);
    formData.set("nicheId", nicheId);
    if (logoFile) formData.set("logo", logoFile);
    const result = await completeOnboarding(formData);
    if (!result.ok) {
      setActivationError(result.message);
      setActivating(false);
      return;
    }
    window.localStorage.setItem("kronos:niche", nicheId);
    window.localStorage.setItem("kronos:company", companyName || "Minha empresa");
    router.push("/dashboard");
    router.refresh();
  };

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
        <p className="onboarding__save"><CheckCircle2 size={15} /> Seu progresso é salvo automaticamente</p>
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
                <label className="field field--full"><span>Nome da empresa</span><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></label>
                <label className="field field--full"><span>Descrição do negócio</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
              </div>
              <fieldset className="niche-fieldset">
                <legend>Qual é o seu nicho?</legend>
                <div className="niche-grid">
                  {nicheList.map((item) => (
                    <button type="button" key={item.id} className={nicheId === item.id ? "selected" : ""} onClick={() => setNicheId(item.id)}>
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
                  <div className="swatches">
                    {Object.entries(niche.theme).map(([name, color]) => <div key={name}><i style={{ background: color }} /><span>{name}</span><small>{color}</small></div>)}
                  </div>
                  <p><Sparkles size={15} /> Cores escolhidas para dar clareza ao fluxo de {niche.label.toLowerCase()}.</p>
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
                <label className="field"><span>Início do expediente</span><input type="time" defaultValue="08:00" /></label>
                <label className="field"><span>Fim do expediente</span><input type="time" defaultValue="18:00" /></label>
                <label className="field"><span>Tamanho da equipe</span><select defaultValue="2-5"><option>Somente eu</option><option value="2-5">2 a 5 pessoas</option><option>6 a 15 pessoas</option><option>Mais de 15</option></select></label>
                <label className="field"><span>{niche.resource}</span><input defaultValue="2 disponíveis" /></label>
              </div>
              <fieldset className="days-fieldset"><legend>Dias de atendimento</legend><div>{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, index) => <label key={day}><input type="checkbox" defaultChecked={index < 6} /><span>{day}</span></label>)}</div></fieldset>
              <fieldset className="channel-fieldset"><legend>Como chegam os agendamentos?</legend><div>{["WhatsApp", "Telefone", "Instagram", "Presencial", "Site"].map((channel) => <label key={channel}><input type="checkbox" defaultChecked={channel !== "Site"} /><span>{channel}</span></label>)}</div></fieldset>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="step-panel">
              <p className="eyebrow">04 · Modelos</p>
              <h2>Preparamos um começo específico.</h2>
              <p>Serviços e etapas vieram do modelo de {niche.label}. Aceite agora e refine quando quiser.</p>
              <div className="models-grid">
                <section><div className="section-heading"><h3>Serviços iniciais</h3><span>{niche.services.length} itens</span></div>{niche.services.map((service) => <div className="model-row" key={service.name}><CheckCircle2 size={17} /><div><strong>{service.name}</strong><small>{service.duration} · {service.price}</small></div><button>Editar</button></div>)}</section>
                <section><div className="section-heading"><h3>Fluxo de atendimento</h3><span>{niche.workflow.length} etapas</span></div><div className="mini-flow">{niche.workflow.map((stage, index) => <div key={stage.name}><span>{index + 1}</span><strong>{stage.name}</strong></div>)}</div></section>
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
                  <div><span>Atendimentos hoje</span><strong>23</strong><small>+12% vs. ontem</small></div>
                  <div><span>Agenda ocupada</span><strong>84%</strong><small>3 janelas livres</small></div>
                  <section><h3>Seu fluxo</h3><div>{niche.workflow.map((stage, index) => <span key={stage.name}><i>{index + 1}</i>{stage.name}</span>)}</div></section>
                </div>
              </div>
              <div className="review-checks"><span><Check size={15} /> Tabela de cores aplicada</span><span><Check size={15} /> {niche.services.length} serviços criados</span><span><Check size={15} /> Kanban com {niche.workflow.length} etapas</span><span><Check size={15} /> Insights do nicho ativados</span></div>
              {activationError ? <div className="form-message form-message--error">{activationError}</div> : null}
            </div>
          ) : null}
        </div>
        <footer className="onboarding__actions">
          <button className="button button--ghost" disabled={step === 0} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} /> Voltar</button>
          {step < steps.length - 1 ? <button className="button button--primary" onClick={() => setStep((current) => current + 1)}>Continuar <ArrowRight size={17} /></button> : <button className="button button--primary" disabled={activating} onClick={activate}>{activating ? "Configurando…" : "Ativar meu espaço"} <Check size={17} /></button>}
        </footer>
      </section>
    </main>
  );
}
