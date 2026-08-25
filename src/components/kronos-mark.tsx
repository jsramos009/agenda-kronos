export function KronosMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`} aria-label="Kronos">
      <svg className="brand-mark" aria-hidden="true" viewBox="0 0 48 56" role="presentation">
        <path className="brand-mark__ticks" d="M24 2v5M35 5l-2 5M43 13l-4 3M46 28h-5M43 43l-4-3M35 51l-2-5M24 54v-5M13 51l2-5M5 43l4-3M2 28h5M5 13l4 3M13 5l2 5" />
        <path className="brand-mark__rear" d="M23 28 15 32" />
        <path className="brand-mark__upper" d="M23 7v21m0 0 14-18" />
        <path className="brand-mark__lower" d="M23 28v21m0-21 14 18" />
      </svg>
      {compact ? null : (
        <span className="brand-type">
          <strong>kronos</strong>
          <small>Seu nicho. Seu sistema.</small>
        </span>
      )}
    </div>
  );
}
