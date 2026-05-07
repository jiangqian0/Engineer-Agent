import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const WORKSPACE_DIR = path.join(process.cwd(), "..", "backend", "workspace");

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path: filePath } = await params;
    const decodedPath = decodeURIComponent(filePath);
    const fullPath = path.join(WORKSPACE_DIR, decodedPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error) {
    console.error("Failed to delete file:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
