import { txlineFromEnvironment } from "../../../../../packages/txline-client/src/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser-safe scores stream proxy. Provider credentials remain server-side. */
export async function GET(request: Request) {
  try {
    const upstream = await txlineFromEnvironment().openEventStream("/api/scores/stream", request.signal);
    return new Response(upstream.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
  } catch {
    return new Response("event: feed-error\ndata: {\"message\":\"TxLINE score stream is unavailable.\"}\n\n", { status: 503, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
  }
}
