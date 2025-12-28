import { MarketsPage } from "@/modules/markets/markets-page";

// Use ISR (Incremental Static Regeneration) for better performance
// Revalidates every 10 seconds - good balance between freshness and performance
// Fetch functions handle build-time errors gracefully by returning empty data
export const revalidate = 10;

export default MarketsPage;
