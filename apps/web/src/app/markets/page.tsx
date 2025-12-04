import { MarketsPage } from "@/modules/markets/markets-page";

// Use ISR (Incremental Static Regeneration) for better performance
// Revalidates every 10 seconds - good balance between freshness and performance
// For real-time updates, use WebSocket or client-side polling (future enhancement)
export const revalidate = 10; // Revalidate every 10 seconds

export default MarketsPage;
