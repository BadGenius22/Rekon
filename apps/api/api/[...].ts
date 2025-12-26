/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * Catch-all route handler for all API requests.
 * Uses dynamic import to handle workspace package resolution issues.
 */

// Dynamic import to handle potential workspace package resolution issues
let appPromise: Promise<{
  default: { fetch: (req: Request) => Promise<Response> };
}> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = import("../src/index");
  }
  return appPromise;
}

// Vercel serverless function handler
export default async (req: Request): Promise<Response> => {
  try {
    const appModule = await getApp();
    return await appModule.default.fetch(req);
  } catch (error) {
    // Log the error for debugging
    console.error("[Vercel Handler] Error:", error);

    // Return a proper error response
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
