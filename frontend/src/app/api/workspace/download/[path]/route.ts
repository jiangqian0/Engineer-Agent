import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const WORKSPACE_DIR = path.join(process.cwd(), "..", "backend", "workspace");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path: filePath } = await params;
    const decodedPath = decodeURIComponent(filePath);
    const fullPath = path.join(WORKSPACE_DIR, decodedPath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const fileName = path.basename(fullPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Failed to download file:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
