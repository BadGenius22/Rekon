import { AppHeader } from "@/components/app-header";
import { DashboardContent } from "./dashboard-content";

/**
 * Dashboard Page - Server Component
 *
 * Renders the dashboard layout and delegates data fetching to client components.
 * This ensures all data is fetched using the synced wallet address from context.
 *
 * Best Practices:
 * - Server component handles layout and static content
 * - Client component (DashboardContent) handles personalized data
 * - All components use the same wallet address from DashboardDataContext
 * - Consistent data across all dashboard sections
 */
export async function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a1628] via-[#030711] to-[#0d0d1a] -z-10" />
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] -z-10" />

      <div className="min-h-screen flex flex-col">
        <AppHeader />

        <div className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6 xl:px-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 text-base text-white/60">
              Your esports trading performance on Polymarket
            </p>
          </div>

          {/* Dashboard Content - Client Component */}
          <DashboardContent />
        </div>
      </div>
    </main>
  );
}
