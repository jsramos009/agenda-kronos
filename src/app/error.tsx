"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error("Kronos page error", error); }, [error]); return <main className="not-found-page"><p className="eyebrow">Não foi possível carregar</p><h1>O contexto foi preservado.</h1><p>Tente novamente. Se o erro continuar, informe a área e o código abaixo para localizarmos a causa.</p>{error.digest ? <code className="error-reference">Código: {error.digest}</code> : null}<button className="button button--primary" onClick={reset}><RotateCcw size={16} /> Tentar novamente</button></main>; }
