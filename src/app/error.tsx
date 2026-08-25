"use client";

import { RotateCcw } from "lucide-react";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="not-found-page"><p className="eyebrow">Não foi possível carregar</p><h1>O contexto foi preservado.</h1><p>Tente novamente. Se o erro continuar, abra a central de ajuda e informe em qual área aconteceu.</p><button className="button button--primary" onClick={reset}><RotateCcw size={16} /> Tentar novamente</button></main>; }
