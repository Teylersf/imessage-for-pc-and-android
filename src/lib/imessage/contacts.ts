import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AB_DIR = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "AddressBook"
);

/** Normalize a phone number to its last 10 digits for matching. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function findContactDbs(): string[] {
  const dbs: string[] = [];
  const top = path.join(AB_DIR, "AddressBook-v22.abcddb");
  if (fs.existsSync(top)) dbs.push(top);
  const sources = path.join(AB_DIR, "Sources");
  if (fs.existsSync(sources)) {
    for (const entry of fs.readdirSync(sources)) {
      const f = path.join(sources, entry, "AddressBook-v22.abcddb");
      if (fs.existsSync(f)) dbs.push(f);
    }
  }
  return dbs;
}

let _map: Map<string, string> | null = null;

/** Build (and cache) a map from normalized phone / lowercased email → display name. */
function contactMap(): Map<string, string> {
  if (_map) return _map;
  const map = new Map<string, string>();

  for (const dbPath of findContactDbs()) {
    let db: Database.Database;
    try {
      db = new Database(dbPath, { readonly: true, fileMustExist: true });
    } catch {
      continue; // skip unreadable source
    }
    try {
      const nameOf = (r: {
        first: string | null;
        last: string | null;
        org: string | null;
      }) => {
        const full = [r.first, r.last].filter(Boolean).join(" ").trim();
        return full || r.org?.trim() || "";
      };

      const phones = db
        .prepare(
          `SELECT r.ZFIRSTNAME AS first, r.ZLASTNAME AS last,
                  r.ZORGANIZATION AS org, p.ZFULLNUMBER AS value
             FROM ZABCDRECORD r
             JOIN ZABCDPHONENUMBER p ON p.ZOWNER = r.Z_PK
            WHERE p.ZFULLNUMBER IS NOT NULL`
        )
        .all() as Array<{
        first: string | null;
        last: string | null;
        org: string | null;
        value: string;
      }>;
      for (const r of phones) {
        const name = nameOf(r);
        const key = normalizePhone(r.value);
        if (name && key && !map.has(key)) map.set(key, name);
      }

      const emails = db
        .prepare(
          `SELECT r.ZFIRSTNAME AS first, r.ZLASTNAME AS last,
                  r.ZORGANIZATION AS org, e.ZADDRESS AS value
             FROM ZABCDRECORD r
             JOIN ZABCDEMAILADDRESS e ON e.ZOWNER = r.Z_PK
            WHERE e.ZADDRESS IS NOT NULL`
        )
        .all() as Array<{
        first: string | null;
        last: string | null;
        org: string | null;
        value: string;
      }>;
      for (const r of emails) {
        const name = nameOf(r);
        const key = r.value.toLowerCase().trim();
        if (name && key && !map.has(key)) map.set(key, name);
      }
    } catch {
      // schema mismatch on this source — ignore and continue
    } finally {
      db.close();
    }
  }

  _map = map;
  return map;
}

/** Resolve a handle (phone or email) to a contact name, or null if unknown. */
export function resolveContact(handle: string | null): string | null {
  if (!handle) return null;
  const map = contactMap();
  if (handle.includes("@")) {
    return map.get(handle.toLowerCase().trim()) ?? null;
  }
  return map.get(normalizePhone(handle)) ?? null;
}
