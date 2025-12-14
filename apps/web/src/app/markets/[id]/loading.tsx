/**
 * Market Detail Page Loading Skeleton
 *
 * Shown during SSR while the market detail data is being fetched.
 * Provides better perceived performance with instant visual feedback.
 */
export default function MarketDetailLoading() {
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
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-4 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Market header */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-white/10 animate-pulse" />
                    <div>
                      <div className="h-6 w-48 rounded bg-white/10 animate-pulse mb-2" />
                      <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
                </div>
                <div className="h-5 w-full rounded bg-white/10 animate-pulse mb-2" />
                <div className="h-5 w-3/4 rounded bg-white/10 animate-pulse" />
              </div>

              {/* Chart placeholder */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="h-6 w-32 rounded bg-white/10 animate-pulse mb-4" />
                <div className="h-64 w-full rounded bg-white/10 animate-pulse" />
              </div>

              {/* Orderbook placeholder */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="h-6 w-32 rounded bg-white/10 animate-pulse mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className="h-8 rounded bg-emerald-500/10 animate-pulse"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className="h-8 rounded bg-rose-500/10 animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Trade panel */}
            <div className="space-y-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sticky top-24">
                <div className="h-6 w-24 rounded bg-white/10 animate-pulse mb-6" />

                {/* Outcome buttons */}
                <div className="flex gap-2 mb-6">
                  <div className="h-12 flex-1 rounded-lg bg-emerald-500/20 animate-pulse" />
                  <div className="h-12 flex-1 rounded-lg bg-rose-500/20 animate-pulse" />
                </div>

                {/* Amount input */}
                <div className="space-y-4 mb-6">
                  <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
                  <div className="h-12 w-full rounded-lg bg-white/10 animate-pulse" />
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
                      <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
                    </div>
                  ))}
                </div>

                {/* Trade button */}
                <div className="h-12 w-full rounded-lg bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
