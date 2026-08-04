import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST /api/files — Upload a file (staff only)
export async function POST(req: Request) {
  const staff = await requireStaff(["admin", "facilitator", "coordinator"]);
  if (!staff) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const filename = `${Date.now()}-${safe}`;

    // Save to public/uploads directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, fileName: file.name });
  } catch (err) {
    console.error("[files] Upload failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
