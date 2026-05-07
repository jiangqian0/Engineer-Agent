import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const WORKSPACE_DIR = path.join(process.cwd(), "..", "backend", "workspace");

export async function GET() {
  try {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(WORKSPACE_DIR, { withFileTypes: true });
    const fileList = files
      .filter((file) => file.isFile())
      .map((file) => {
        const filePath = path.join(WORKSPACE_DIR, file.name);
        const stats = fs.statSync(filePath);
        return {
          name: file.name,
          path: file.name,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json({ files: fileList });
  } catch (error) {
    console.error("Failed to list workspace files:", error);
    return NextResponse.json({ files: [] });
  }
}
