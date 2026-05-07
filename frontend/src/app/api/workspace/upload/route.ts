import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const WORKSPACE_DIR = path.join(process.cwd(), "..", "backend", "workspace");

export async function POST(request: Request) {
  try {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(WORKSPACE_DIR, file.name);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, path: file.name });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
