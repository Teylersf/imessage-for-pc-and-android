"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface AttachmentRef {
  id: number;
  name: string;
  mime: string;
  kind: "image" | "video" | "audio" | "file";
}

interface Chat {
  chatId: number;
  displayName: string;
  isGroup: boolean;
  service: string;
  participants: string[];
  lastText: string;
  lastDate: number;
  lastIsFromMe: boolean;
}

interface Message {
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

const AVATAR_GRADIENTS = [
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-fuchsia-400 to-pink-600",
  "from-cyan-400 to-sky-600",
  "from-lime-400 to-green-600",
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  if (!clean) return "#";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const grad = AVATAR_GRADIENTS[hashStr(name) % AVATAR_GRADIENTS.length];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad} font-semibold text-white shadow-sm`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}

function timeLabel(ms: number) {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (now.getTime() - ms < 6 * 864e5)
    return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
}

function dayLabel(ms: number) {
  const d = new Date(ms);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: now.getFullYear() === d.getFullYear() ? undefined : "numeric",
  });
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fda, setFda] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const prevChatRef = useRef<number | null>(null);
  const router = useRouter();

  const handleAuth = useCallback(
    (res: Response) => {
      if (res.status === 401) {
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const loadChats = useCallback(async () => {
    const res = await fetch("/api/chats");
    if (handleAuth(res)) return;
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setFda(data.code === "FDA");
      return;
    }
    setError(null);
    setFda(false);
    setChats(data.chats);
  }, [handleAuth]);

  const loadMessages = useCallback(
    async (chatId: number) => {
      const res = await fetch(`/api/messages?chatId=${chatId}`);
      if (handleAuth(res)) return;
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setFda(data.code === "FDA");
        return;
      }
      setMessages(data.messages);
    },
    [handleAuth]
  );

  useEffect(() => {
    loadChats();
    const t = setInterval(loadChats, 5000);
    return () => clearInterval(t);
  }, [loadChats]);

  useEffect(() => {
    if (activeId == null) return;
    loadMessages(activeId);
    const t = setInterval(() => loadMessages(activeId), 3000);
    return () => clearInterval(t);
  }, [activeId, loadMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prevChatRef.current !== activeId) {
      prevChatRef.current = activeId;
      atBottomRef.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  function onListScroll() {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function pickFile(f: File | null) {
    setFile(f);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  async function send() {
    if ((!draft.trim() && !file) || activeId == null) return;
    setSending(true);
    const text = draft;
    const sendFile = file;
    setDraft("");
    pickFile(null);

    let res: Response;
    if (sendFile) {
      const fd = new FormData();
      fd.append("chatId", String(activeId));
      if (text.trim()) fd.append("text", text);
      fd.append("file", sendFile);
      res = await fetch("/api/send", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeId, text }),
      });
    }

    setSending(false);
    if (handleAuth(res)) return;
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setDraft(text);
      return;
    }
    setError(null);
    setTimeout(() => loadMessages(activeId), 900);
  }

  const active = chats.find((c) => c.chatId === activeId);
  const filtered = chats.filter(
    (c) =>
      !search ||
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.participants.some((p) => p.includes(search))
  );

  if (fda) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-8 text-neutral-100">
        <div className="max-w-lg space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
          <h1 className="text-xl font-semibold">Full Disk Access required</h1>
          <p className="text-sm text-neutral-400">
            macOS is blocking access to your Messages database. Grant Full Disk
            Access to the app running the server, then reload.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-300">
            <li>System Settings → Privacy &amp; Security → Full Disk Access</li>
            <li>Enable your terminal app (Terminal, iTerm, or VS Code)</li>
            <li>Quit and reopen it, then restart the server</li>
          </ol>
          <button
            onClick={loadChats}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-neutral-800/80 bg-neutral-900/40 backdrop-blur-xl">
        <div className="border-b border-neutral-800/80 px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Messages</h1>
            <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
              {chats.length}
            </span>
          </div>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-xl bg-neutral-800/80 py-2 pl-9 pr-3 text-sm outline-none ring-blue-500/50 transition focus:ring-2 placeholder:text-neutral-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.map((c) => (
            <button
              key={c.chatId}
              onClick={() => setActiveId(c.chatId)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                c.chatId === activeId
                  ? "bg-blue-600/90 shadow-lg shadow-blue-600/20"
                  : "hover:bg-neutral-800/60"
              }`}
            >
              <Avatar name={c.displayName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{c.displayName}</span>
                  <span
                    className={`shrink-0 text-[11px] ${
                      c.chatId === activeId ? "text-blue-100" : "text-neutral-500"
                    }`}
                  >
                    {timeLabel(c.lastDate)}
                  </span>
                </div>
                <span
                  className={`block truncate text-sm ${
                    c.chatId === activeId ? "text-blue-50/90" : "text-neutral-400"
                  }`}
                >
                  {c.lastIsFromMe ? "You: " : ""}
                  {c.lastText || "Attachment"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex flex-1 flex-col bg-gradient-to-b from-neutral-950 to-neutral-900">
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-neutral-800/80 bg-neutral-900/60 px-5 py-3 backdrop-blur-xl">
              <Avatar name={active.displayName} size={36} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{active.displayName}</div>
                <div className="truncate text-xs text-neutral-500">
                  {active.isGroup
                    ? `${active.participants.length} people`
                    : active.participants[0] || active.service}
                </div>
              </div>
            </header>

            <div
              ref={listRef}
              onScroll={onListScroll}
              className="flex-1 space-y-0.5 overflow-y-auto px-4 py-4 sm:px-8"
            >
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay =
                  !prev || new Date(prev.date).toDateString() !== new Date(m.date).toDateString();
                const showSender =
                  active.isGroup && !m.isFromMe && m.sender !== prev?.sender;
                const grouped = prev && prev.isFromMe === m.isFromMe && !newDay && !showSender;
                return (
                  <div key={m.guid || m.id}>
                    {newDay && (
                      <div className="my-4 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                        {dayLabel(m.date)}
                      </div>
                    )}
                    <div
                      className={`flex flex-col ${
                        m.isFromMe ? "items-end" : "items-start"
                      } ${grouped ? "mt-0.5" : "mt-2"}`}
                    >
                      {showSender && (
                        <span className="mb-1 ml-3 text-xs font-medium text-neutral-400">
                          {m.sender}
                        </span>
                      )}

                      {/* Attachments */}
                      {m.attachments.map((a) =>
                        a.kind === "image" ? (
                          <a
                            key={a.id}
                            href={`/api/attachment?id=${a.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-1 block max-w-[min(20rem,75%)] overflow-hidden rounded-2xl border border-neutral-800"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/attachment?id=${a.id}`}
                              alt={a.name}
                              loading="lazy"
                              className="h-auto w-full object-cover"
                            />
                          </a>
                        ) : a.kind === "video" ? (
                          <video
                            key={a.id}
                            controls
                            src={`/api/attachment?id=${a.id}`}
                            className="mb-1 max-w-[min(20rem,75%)] rounded-2xl border border-neutral-800"
                          />
                        ) : a.kind === "audio" ? (
                          <audio
                            key={a.id}
                            controls
                            src={`/api/attachment?id=${a.id}`}
                            className="mb-1 w-64"
                          />
                        ) : (
                          <a
                            key={a.id}
                            href={`/api/attachment?id=${a.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-1 flex items-center gap-2 rounded-xl bg-neutral-800 px-3 py-2 text-sm text-blue-300 hover:bg-neutral-700"
                          >
                            📎 {a.name}
                          </a>
                        )
                      )}

                      {/* Text bubble */}
                      {m.text && (
                        <div
                          className={`max-w-[75%] px-3.5 py-2 text-[15px] leading-snug shadow-sm ${
                            m.isFromMe
                              ? "rounded-3xl rounded-br-md bg-gradient-to-b from-blue-500 to-blue-600 text-white"
                              : "rounded-3xl rounded-bl-md bg-neutral-800 text-neutral-100"
                          }`}
                        >
                          {m.text}
                        </div>
                      )}
                      {!grouped && (
                        <span className="mt-1 px-2 text-[10px] text-neutral-600">
                          {new Date(m.date).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            <div className="border-t border-neutral-800/80 bg-neutral-900/60 px-4 py-3 backdrop-blur-xl">
              {error && (
                <div className="mb-2 rounded-lg bg-red-950/80 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}
              {file && (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-neutral-800 px-3 py-2 text-sm">
                  {filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreview}
                      alt="preview"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <span>📎</span>
                  )}
                  <span className="flex-1 truncate text-neutral-300">{file.name}</span>
                  <button
                    onClick={() => pickFile(null)}
                    className="text-neutral-500 hover:text-neutral-300"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-800 text-neutral-300 transition hover:bg-neutral-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={`Message ${active.displayName}`}
                  className="flex-1 rounded-full bg-neutral-800 px-4 py-2.5 text-[15px] outline-none ring-blue-500/50 transition focus:ring-2 placeholder:text-neutral-500"
                />
                <button
                  onClick={send}
                  disabled={sending || (!draft.trim() && !file)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-400 hover:to-blue-500 disabled:opacity-30"
                >
                  {sending ? (
                    <span className="text-xs">…</span>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12h14M13 6l6 6-6 6"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-neutral-600">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-neutral-800/60">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm">Select a conversation to start</p>
          </div>
        )}
      </section>
    </main>
  );
}
