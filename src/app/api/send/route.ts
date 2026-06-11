import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSendTarget, FullDiskAccessError } from "@/lib/imessage/db";
import {
  sendToBuddy,
  sendToChat,
  sendFileToBuddy,
  sendFileToChat,
} from "@/lib/imessage/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let chatId = 0;
    let text = "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      chatId = Number(form.get("chatId"));
      text = String(form.get("text") || "");
      const f = form.get("file");
      if (f instanceof File) file = f;
    } else {
      const body = (await req.json()) as { chatId?: number; text?: string };
      chatId = Number(body.chatId);
      text = body.text || "";
    }

    if (!chatId || (!text.trim() && !file)) {
      return NextResponse.json(
        { error: "chatId and text or file required" },
        { status: 400 }
      );
    }

    const target = getSendTarget(chatId);

    // Attachment first, then any accompanying text (mirrors how Messages sends).
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      const dir = path.join(os.tmpdir(), "imsg-outgoing");
      fs.mkdirSync(dir, { recursive: true });
      const safe = (file.name || "upload").replace(/[^\w.\-]/g, "_");
      const tmpPath = path.join(dir, `${Date.now()}-${safe}`);
      fs.writeFileSync(tmpPath, buf);
      if (target.kind === "buddy") {
        await sendFileToBuddy(target.handle, target.service, tmpPath);
      } else {
        await sendFileToChat(target.guid, tmpPath);
      }
    }

    if (text.trim()) {
      if (target.kind === "buddy") {
        await sendToBuddy(target.handle, target.service, text);
      } else {
        await sendToChat(target.guid, text);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FullDiskAccessError) {
      return NextResponse.json({ error: err.message, code: "FDA" }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
