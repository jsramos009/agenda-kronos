import { Skeleton } from "@/components/ui";

export default function InsightsLoading() {
  return (
    <div className="insights-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando insights.</span>
      <header className="insights-loading__header">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </header>
      <div className="insights-loading__tabs" aria-hidden="true"><Skeleton /><Skeleton /><Skeleton /></div>
      <section className="insights-list" aria-hidden="true">
        {[0, 1].map((item) => <article className="insights-loading__card" key={item}>
          <Skeleton className="insights-loading__index" />
          <div className="insights-loading__copy"><Skeleton /><Skeleton /><Skeleton /></div>
          <div className="insights-loading__actions"><Skeleton /><Skeleton /></div>
        </article>)}
      </section>
    </div>
  );
}
