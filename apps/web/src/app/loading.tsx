/**
 * Home Page Loading Skeleton
 *
 * Shown during SSR while the home page data is being fetched.
 * Provides better perceived performance with instant visual feedback.
 */
export default function HomeLoading() {
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

        <div className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-6">
          {/* Hero section skeleton */}
          <div className="mb-8 text-center">
            <div className="h-12 w-96 mx-auto rounded bg-white/10 animate-pulse mb-4" />
            <div className="h-6 w-64 mx-auto rounded bg-white/10 animate-pulse" />
          </div>

          {/* Featured markets skeleton */}
          <div className="mb-8">
            <div className="h-8 w-48 rounded bg-white/10 animate-pulse mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
                >
                  <div className="h-6 w-3/4 rounded bg-white/10 animate-pulse mb-4" />
                  <div className="h-4 w-1/2 rounded bg-white/10 animate-pulse mb-2" />
                  <div className="flex justify-between items-center mt-4">
                    <div className="h-8 w-20 rounded bg-white/10 animate-pulse" />
                    <div className="h-8 w-20 rounded bg-white/10 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
