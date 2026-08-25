export function KronosMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`} aria-label="Kronos">
      <span className="brand-mark" aria-hidden="true"><i /><b /></span>
      {compact ? null : (
        <span className="brand-type">
          <strong>Kronos</strong>
          <small>Seu nicho. Seu sistema.</small>
        </span>
      )}
    </div>
  );
}

