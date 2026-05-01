export default function Loading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background h-14" />
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-28">
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
  );
}
