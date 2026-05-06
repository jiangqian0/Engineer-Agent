import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const body = await request.json();

  console.log("[API Route] Received request to /api/chat/stream");
  console.log("[API Route] Request body:", JSON.stringify(body).slice(0, 200));

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  console.log("[API Route] Backend URL:", backendUrl);

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
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const stream = response.body;
    console.log("[API Route] Stream obtained, returning response");

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[API Route] Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 500 }
    );
  }
}