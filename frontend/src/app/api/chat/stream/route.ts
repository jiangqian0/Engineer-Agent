import { NextRequest } from "next/server";
import { Readable } from "stream";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();

  console.log("[API Route] Received request to /api/chat/stream");
  console.log("[API Route] Request body:", JSON.stringify(body).slice(0, 200));

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${backendUrl}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("[API Route] Backend response status:", response.status);

    if (!response.ok) {
      console.error("[API Route] Backend error:", response.status);
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Backend error: ${response.status}`, details: errorText }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 将 Web Fetch 流转换为 Node.js Readable 流
    const nodeStream = Readable.fromWeb(response.body as any);

    return new Response(nodeStream as any, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[API Route] Proxy error:", error);
    return new Response(JSON.stringify({ error: `Failed to connect to backend: ${error}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}