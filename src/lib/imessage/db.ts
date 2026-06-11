import Database from "better-sqlite3";
import os from "node:os";
import path from "node:path";
import { resolveContact } from "./contacts";

const DB_PATH = path.join(os.homedir(), "Library", "Messages", "chat.db");

// Apple's Core Data epoch: 2001-01-01 00:00:00 UTC.
const APPLE_EPOCH_OFFSET = 978307200; // seconds between 1970 and 2001

let _db: Database.Database | null = null;

export class FullDiskAccessError extends Error {
  constructor() {
    super(
      "Cannot read ~/Library/Messages/chat.db. Grant Full Disk Access to the terminal/app running `npm run dev`."
    );
    this.name = "FullDiskAccessError";
  }
}

function db(): Database.Database {
  if (_db) return _db;
  try {
    _db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    // Verify we can actually read (TCC / Full Disk Access gate).
    _db.prepare("SELECT 1 FROM message LIMIT 1").get();
    return _db;
  } catch (err: unknown) {
    _db = null;
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("authorization denied") ||
      msg.includes("operation not permitted") ||
      msg.includes("unable to open database")
    ) {
      throw new FullDiskAccessError();
    }
    throw err;
  }
}

/** Convert an Apple-epoch timestamp (ns or s) to a JS millisecond timestamp. */
function appleDateToMs(raw: number | bigint | null): number {
  if (raw == null) return 0;
  let n = typeof raw === "bigint" ? Number(raw) : raw;
  // Modern macOS stores nanoseconds; older stored seconds.
  if (n > 1e11) n = n / 1e9;
  return Math.round((n + APPLE_EPOCH_OFFSET) * 1000);
}

/**
 * Decode the `attributedBody` BLOB (a serialized NSAttributedString /
 * typedstream) that holds the message text on macOS Ventura+ where the plain
 * `text` column is often NULL.
 */
function decodeAttributedBody(blob: Buffer | null): string | null {
  if (!blob || blob.length === 0) return null;
  const marker = blob.indexOf("NSString");
  if (marker === -1) return null;
  // After the NSString class marker the string is introduced by a '+' (0x2B),
  // followed by a length and then UTF-8 bytes.
  let i = blob.indexOf(0x2b, marker);
  if (i === -1) return null;
  i += 1;
  let len: number;
  let start: number;
  if (blob[i] === 0x81) {
    len = blob.readUInt16LE(i + 1);
    start = i + 3;
  } else if (blob[i] === 0x82) {
    len = blob.readUInt32LE(i + 1);
    start = i + 4;
  } else {
    len = blob[i];
    start = i + 1;
  }
  if (start + len > blob.length) len = blob.length - start;
  const text = blob.toString("utf8", start, start + len);
  return text.length ? text : null;
}

export interface ChatSummary {
  chatId: number;
  guid: string;
  identifier: string;
  displayName: string;
  isGroup: boolean;
  service: string;
  participants: string[];
  lastText: string;
  lastDate: number;
  lastIsFromMe: boolean;
}

export function getChats(limit = 200): ChatSummary[] {
  const rows = db()
    .prepare(
      `
      SELECT
        c.ROWID            AS chatId,
        c.guid             AS guid,
        c.chat_identifier  AS identifier,
        c.display_name     AS displayName,
        c.style            AS style,
        c.service_name     AS service,
        MAX(m.date)        AS lastDate
      FROM chat c
      JOIN chat_message_join cmj ON cmj.chat_id = c.ROWID
      JOIN message m ON m.ROWID = cmj.message_id
      GROUP BY c.ROWID
      ORDER BY lastDate DESC
      LIMIT ?
    `
    )
    .all(limit) as Array<{
    chatId: number;
    guid: string;
    identifier: string;
    displayName: string | null;
    style: number;
    service: string | null;
    lastDate: number | bigint;
  }>;

  const partStmt = db().prepare(
    `SELECT h.id AS id
       FROM chat_handle_join chj
       JOIN handle h ON h.ROWID = chj.handle_id
      WHERE chj.chat_id = ?`
  );

  const lastMsgStmt = db().prepare(
    `SELECT text, attributedBody, is_from_me
       FROM message m
       JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
      WHERE cmj.chat_id = ?
      ORDER BY m.date DESC
      LIMIT 1`
  );

  return rows.map((r) => {
    const participants = (partStmt.all(r.chatId) as Array<{ id: string }>).map(
      (p) => p.id
    );
    const last = lastMsgStmt.get(r.chatId) as
      | { text: string | null; attributedBody: Buffer | null; is_from_me: number }
      | undefined;
    const lastText =
      last?.text || decodeAttributedBody(last?.attributedBody ?? null) || "";
    const isGroup = r.style === 43 || participants.length > 1;
    const named = (h: string) => resolveContact(h) || h;
    const displayName =
      r.displayName ||
      (isGroup
        ? participants.map(named).join(", ")
        : named(participants[0]) || r.identifier);
    return {
      chatId: r.chatId,
      guid: r.guid,
      identifier: r.identifier,
      displayName,
      isGroup,
      service: r.service || "iMessage",
      participants,
      lastText,
      lastDate: appleDateToMs(r.lastDate),
      lastIsFromMe: last?.is_from_me === 1,
    };
  });
}

export type AttachmentKind = "image" | "video" | "audio" | "file";

export interface AttachmentRef {
  id: number;
  name: string;
  mime: string;
  kind: AttachmentKind;
}

export interface MessageRow {
  id: number;
  guid: string;
  text: string;
  date: number;
  isFromMe: boolean;
  sender: string | null;
  service: string;
  hasAttachment: boolean;
  attachments: AttachmentRef[];
}

function kindForMime(mime: string | null, uti: string | null): AttachmentKind {
  const m = (mime || uti || "").toLowerCase();
  if (m.includes("image") || m.includes("heic") || m.includes("png") || m.includes("jpeg"))
    return "image";
  if (m.includes("video") || m.includes("mp4") || m.includes("quicktime")) return "video";
  if (m.includes("audio") || m.includes("mpeg")) return "audio";
  return "file";
}

export function getMessages(chatId: number, limit = 200): MessageRow[] {
  const rows = db()
    .prepare(
      `
      SELECT
        m.ROWID               AS id,
        m.guid                AS guid,
        m.text                AS text,
        m.attributedBody      AS attributedBody,
        m.date                AS date,
        m.is_from_me          AS isFromMe,
        m.service             AS service,
        m.cache_has_attachments AS hasAttachment,
        h.id                  AS sender
      FROM message m
      JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
      LEFT JOIN handle h ON h.ROWID = m.handle_id
      WHERE cmj.chat_id = ?
        AND m.item_type = 0
      ORDER BY m.date DESC
      LIMIT ?
    `
    )
    .all(chatId, limit) as Array<{
    id: number;
    guid: string;
    text: string | null;
    attributedBody: Buffer | null;
    date: number | bigint;
    isFromMe: number;
    service: string | null;
    hasAttachment: number;
    sender: string | null;
  }>;

  const attachStmt = db().prepare(
    `SELECT a.ROWID AS id, a.filename AS filename, a.mime_type AS mime, a.uti AS uti
       FROM message_attachment_join maj
       JOIN attachment a ON a.ROWID = maj.attachment_id
      WHERE maj.message_id = ?`
  );

  return rows
    .map((r) => {
      const attachments: AttachmentRef[] = r.hasAttachment
        ? (
            attachStmt.all(r.id) as Array<{
              id: number;
              filename: string | null;
              mime: string | null;
              uti: string | null;
            }>
          ).map((a) => ({
            id: a.id,
            name: a.filename?.split("/").pop() || a.mime || "attachment",
            mime: a.mime || "application/octet-stream",
            kind: kindForMime(a.mime, a.uti),
          }))
        : [];
      return {
        id: r.id,
        guid: r.guid,
        text: r.text || decodeAttributedBody(r.attributedBody) || "",
        date: appleDateToMs(r.date),
        isFromMe: r.isFromMe === 1,
        sender: resolveContact(r.sender) || r.sender,
        service: r.service || "iMessage",
        hasAttachment: r.hasAttachment === 1,
        attachments,
      };
    })
    .reverse(); // chronological ascending
}

/** Resolve how to address a chat for sending: a single handle, or group guid. */
export function getSendTarget(
  chatId: number
): { kind: "buddy"; handle: string; service: string } | { kind: "chat"; guid: string } {
  const chat = db()
    .prepare(
      `SELECT guid, chat_identifier, style, service_name FROM chat WHERE ROWID = ?`
    )
    .get(chatId) as
    | { guid: string; chat_identifier: string; style: number; service_name: string | null }
    | undefined;
  if (!chat) throw new Error(`No chat with id ${chatId}`);

  const participants = (
    db()
      .prepare(
        `SELECT h.id AS id FROM chat_handle_join chj
           JOIN handle h ON h.ROWID = chj.handle_id WHERE chj.chat_id = ?`
      )
      .all(chatId) as Array<{ id: string }>
  ).map((p) => p.id);

  if (chat.style !== 43 && participants.length <= 1) {
    return {
      kind: "buddy",
      handle: participants[0] || chat.chat_identifier,
      service: chat.service_name || "iMessage",
    };
  }
  return { kind: "chat", guid: chat.guid };
}

export interface AttachmentFile {
  path: string;
  mime: string;
  uti: string | null;
  name: string;
}

/** Resolve an attachment ROWID to an absolute file path on disk. */
export function getAttachment(id: number): AttachmentFile | null {
  const row = db()
    .prepare(
      `SELECT filename, mime_type AS mime, uti FROM attachment WHERE ROWID = ?`
    )
    .get(id) as
    | { filename: string | null; mime: string | null; uti: string | null }
    | undefined;
  if (!row?.filename) return null;
  const expanded = row.filename.startsWith("~")
    ? path.join(os.homedir(), row.filename.slice(1))
    : row.filename;
  return {
    path: expanded,
    mime: row.mime || "application/octet-stream",
    uti: row.uti,
    name: expanded.split("/").pop() || "attachment",
  };
}
