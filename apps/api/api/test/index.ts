export async function GET() {
  return new Response(JSON.stringify({ status: "ok", message: "minimal test works" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
