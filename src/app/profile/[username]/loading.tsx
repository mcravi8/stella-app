export default function Loading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background h-14" />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-28">
        <div className="flex gap-5 items-start mb-10">
          <div className="w-[88px] h-[88px] rounded-2xl bg-border/60 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-6 w-48 rounded bg-border/60" />
            <div className="h-3 w-24 rounded bg-border/60" />
            <div className="h-3 w-3/4 rounded bg-border/60" />
            <div className="flex gap-4 pt-1">
              <div className="h-3 w-20 rounded bg-border/60" />
              <div className="h-3 w-16 rounded bg-border/60" />
            </div>
          </div>
        </div>
        <div className="h-4 w-40 rounded bg-border/60 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 h-16" />
          ))}
        </div>
      </main>
    </div>
  );
}
