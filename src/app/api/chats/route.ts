import { NextResponse } from "next/server";
import { getChats, FullDiskAccessError } from "@/lib/imessage/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ chats: getChats() });
  } catch (err) {
    if (err instanceof FullDiskAccessError) {
      return NextResponse.json({ error: err.message, code: "FDA" }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
