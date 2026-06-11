import { NextRequest, NextResponse } from "next/server";
import { getMessages, FullDiskAccessError } from "@/lib/imessage/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const chatId = Number(req.nextUrl.searchParams.get("chatId"));
  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }
  try {
    return NextResponse.json({ messages: getMessages(chatId) });
  } catch (err) {
    if (err instanceof FullDiskAccessError) {
      return NextResponse.json({ error: err.message, code: "FDA" }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
