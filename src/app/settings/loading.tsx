export default function Loading() {
  return (
    <div
      className="h-dvh flex flex-col bg-background animate-pulse overflow-hidden"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      <nav className="shrink-0 border-b border-border h-14" />
      <div className="flex-1 overflow-y-auto">
      <main className="max-w-2xl mx-auto px-4 pt-10 pb-28 space-y-12">
        <section>
          <div className="h-6 w-24 rounded bg-border/60 mb-2" />
          <div className="h-3 w-64 rounded bg-border/60 mb-4" />
          <div className="h-24 w-full rounded-xl bg-surface border border-border" />
        </section>
        <section>
          <div className="h-6 w-28 rounded bg-border/60 mb-3" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="h-9 w-20 rounded-full bg-surface border border-border" />
            ))}
          </div>
        </section>
        <section>
          <div className="h-6 w-40 rounded bg-border/60 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-surface border border-border" />
            ))}
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}
