export function KronosMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`} aria-label="Kronos">
      <svg className="brand-mark" aria-hidden="true" viewBox="0 0 48 56" role="presentation">
        <circle className="brand-mark__clock" cx="24" cy="28" r="22" />
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
