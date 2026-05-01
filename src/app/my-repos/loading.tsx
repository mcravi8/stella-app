export default function Loading() {
  return (
    <div
      className="h-dvh flex flex-col bg-background animate-pulse overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav className="shrink-0 border-b border-border h-14" />
      <div className="flex-1 overflow-y-auto">
      <main className="max-w-4xl mx-auto px-4 pt-8 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-5 border border-border/50 h-40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-border/60" />
                <div className="h-3 w-20 rounded bg-border/60" />
              </div>
              <div className="h-4 w-3/4 rounded bg-border/60 mb-2" />
              <div className="h-3 w-full rounded bg-border/60 mb-1.5" />
              <div className="h-3 w-2/3 rounded bg-border/60" />
            </div>
          ))}
        </div>
      </main>
      </div>
    </div>
  );
}
