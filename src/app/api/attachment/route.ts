import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getAttachment, FullDiskAccessError } from "@/lib/imessage/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DIR = path.join(os.tmpdir(), "imsg-attach-cache");

function needsConversion(mime: string, uti: string | null): boolean {
  const m = `${mime} ${uti ?? ""}`.toLowerCase();
  return m.includes("heic") || m.includes("heif") || m.includes("tiff");
}

/** Convert an unsupported image to JPEG via macOS `sips`, with a disk cache. */
function convertToJpeg(src: string, id: number): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const out = path.join(CACHE_DIR, `${id}.jpg`);
    if (fs.existsSync(out)) return resolve(out);
    execFile(
      "sips",
      ["-s", "format", "jpeg", src, "--out", out],
      { timeout: 30000 },
      (err) => (err ? reject(err) : resolve(out))
    );
  });
}

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const att = getAttachment(id);
    if (!att || !fs.existsSync(att.path)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    let filePath = att.path;
    let mime = att.mime;
    if (needsConversion(att.mime, att.uti)) {
      try {
        filePath = await convertToJpeg(att.path, id);
        mime = "image/jpeg";
      } catch {
        // Fall back to the original bytes if conversion fails.
      }
    }

    const data = await fs.promises.readFile(filePath);
    // HTTP header values must be Latin-1. macOS screenshot names contain a
    // U+202F narrow no-break space, so provide an ASCII-safe `filename` plus an
    // RFC 5987 `filename*` for the real (UTF-8) name.
    const asciiName = att.name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    const disposition =
      `inline; filename="${asciiName}"; ` +
      `filename*=UTF-8''${encodeURIComponent(att.name)}`;
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    if (err instanceof FullDiskAccessError) {
      return NextResponse.json({ error: err.message, code: "FDA" }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
