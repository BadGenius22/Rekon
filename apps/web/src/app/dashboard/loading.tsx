/**
 * Dashboard Page Loading Skeleton
 *
 * Shown during SSR while the dashboard data is being fetched.
 * Provides better perceived performance with instant visual feedback.
 */
export default function DashboardLoading() {
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

        <div className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6 xl:px-10">
          {/* Page title skeleton */}
          <div className="mb-8">
            <div className="h-10 w-48 rounded bg-white/10 animate-pulse mb-2" />
            <div className="h-5 w-80 rounded bg-white/10 animate-pulse" />
          </div>

          {/* Hero row - bento grid */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Trader profile card */}
            <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-white/10 animate-pulse" />
                <div>
                  <div className="h-6 w-32 rounded bg-white/10 animate-pulse mb-2" />
                  <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
                </div>
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio value card */}
            <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="h-5 w-32 rounded bg-white/10 animate-pulse mb-4" />
              <div className="h-10 w-40 rounded bg-white/10 animate-pulse mb-6" />
              <div className="h-32 w-full rounded bg-white/10 animate-pulse" />
            </div>

            {/* Stats cards */}
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="col-span-6 lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-white/10 animate-pulse" />
                  <div>
                    <div className="h-4 w-20 rounded bg-white/10 animate-pulse mb-1" />
                    <div className="h-3 w-16 rounded bg-white/10 animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Open positions and trade history */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Open positions */}
            <div className="col-span-12 lg:col-span-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="h-6 w-40 rounded bg-white/10 animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-white/[0.03] animate-pulse"
                  />
                ))}
              </div>
            </div>

            {/* Trade history */}
            <div className="col-span-12 lg:col-span-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="h-6 w-32 rounded bg-white/10 animate-pulse mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-lg bg-white/[0.03] animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="h-6 w-40 rounded bg-white/10 animate-pulse mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2">
                      <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
                      <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
                    </div>
                    <div className="h-3 w-full rounded-full bg-white/10 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="h-6 w-32 rounded bg-white/10 animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-white/[0.03] animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
