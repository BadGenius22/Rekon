/**
 * Markets Page Loading Skeleton
 *
 * Shown during SSR while the markets list is being fetched.
 * Provides better perceived performance with instant visual feedback.
 */
export default function MarketsLoading() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a1628] via-[#030711] to-[#0d0d1a] -z-10" />
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] -z-10" />

      <div className="min-h-screen flex flex-col">
        {/* Header skeleton */}
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#030711]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
            <div className="h-8 w-32 rounded bg-white/10 animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>
        </header>

        <div className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6">
          {/* Page title skeleton */}
          <div className="mb-6">
            <div className="h-10 w-48 rounded bg-white/10 animate-pulse mb-2" />
            <div className="h-5 w-64 rounded bg-white/10 animate-pulse" />
          </div>

          {/* Filter tabs skeleton */}
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="h-10 w-24 rounded-lg bg-white/10 animate-pulse"
              />
            ))}
          </div>

          {/* Game sections skeleton */}
          {["CS2", "Dota 2", "LoL", "Valorant"].map((game) => (
            <div key={game} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-7 w-32 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-5 w-16 rounded bg-white/10 animate-pulse" />
                      <div className="h-5 w-12 rounded bg-white/10 animate-pulse" />
                    </div>
                    <div className="h-5 w-full rounded bg-white/10 animate-pulse mb-2" />
                    <div className="h-5 w-3/4 rounded bg-white/10 animate-pulse mb-4" />
                    <div className="flex gap-2 mt-4">
                      <div className="h-10 flex-1 rounded-lg bg-emerald-500/20 animate-pulse" />
                      <div className="h-10 flex-1 rounded-lg bg-rose-500/20 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
