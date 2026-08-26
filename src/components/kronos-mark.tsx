import Image from "next/image";

export function KronosMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup brand-lockup--original ${compact ? "brand-lockup--compact" : ""}`} aria-label="Kronos">
      <span className="brand-original-crop brand-original-crop--mark" aria-hidden="true">
        <Image src="/brand/kronos-original.png" alt="" width={2000} height={2000} priority />
      </span>
      {compact ? null : (
        <span className="brand-original-crop brand-original-crop--word" aria-hidden="true">
          <Image src="/brand/kronos-original.png" alt="" width={2000} height={2000} priority />
        </span>
      )}
    </div>
  );
}
