# iMessage for PC & Android

**A free, open-source, self-hosted web client to use iMessage on your PC, Windows, Android, Linux — or any device with a browser.**

Apple never shipped iMessage for PC or Android. But if you own a Mac, you can bridge it. This app reads your Messages database and uses your Mac to send and receive, giving you a real iMessage experience — blue bubbles, your own phone number, contact names, and photos — on any device.

> 🔒 100% self-hosted. Your messages stay on **your** Mac and never touch anyone else's servers. No account, no subscription, no tracking.

---

## Features

- 📥 **Read every conversation** — full iMessage + SMS history, synced live, searchable.
- 📤 **Send & receive** — reply from your PC or phone; messages send as you, from your number.
- 🖼️ **Photos & images** — view image attachments inline (HEIC auto-converted to JPEG) and send pictures from any device.
- 👤 **Contact names** — resolves numbers to real names from your macOS Contacts.
- 👥 **Group chats** — with per-sender names and avatars.
- 🔑 **Password-protected** — a login gate guards the app before it's exposed to the web.
- 🆓 **Free & open source** — MIT licensed.

## Requirements

- A **Mac that stays on and signed into iMessage** (a Mac mini is ideal — it becomes your always-on bridge).
- macOS with **Full Disk Access** granted to the app running the server.
- [Node.js](https://nodejs.org) 20+.

## Quick start

```bash
git clone https://github.com/Teylersf/imessage-for-pc-and-android.git
cd imessage-for-pc-and-android
npm install
```

### 1. Grant Full Disk Access

The server reads `~/Library/Messages/chat.db`, which macOS protects.

1. **System Settings → Privacy & Security → Full Disk Access**
2. Enable the app you'll run the server from (Terminal, iTerm, or VS Code).
3. **Quit and reopen** that app (the permission only applies to newly launched processes).

### 2. Set a password

Create `.env.local`:

```bash
APP_PASSWORD=your-strong-password
APP_SECRET=$(openssl rand -hex 24)
```

### 3. Run it

```bash
npm run build
npm start          # serves on http://localhost:3000 and your LAN
```

Open `http://localhost:3000` on the Mac, or `http://<mac-lan-ip>:3000` from another device on your network.

### 4. Access it from anywhere (optional)

Expose your local server over the internet with a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
brew install cloudflared
npm run tunnel     # prints a public https URL
```

Open the printed URL on Windows, Android, Linux — anywhere. The password gate keeps strangers out.

> For a **permanent** URL (instead of a new one each restart), set up a [named Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/) with a free Cloudflare account, or use [Tailscale](https://tailscale.com) for a private device-only network.

## Sending messages

Sending uses AppleScript to drive Messages.app. The first time you send, macOS asks to allow your terminal app to control Messages — click **Allow** (or enable it later under **Privacy & Security → Automation**).

## How it works

```
Your phone / PC ──▶ Cloudflare Tunnel ──▶ Next.js server on your Mac
                                              ├─ reads ~/Library/Messages/chat.db (history, contacts, attachments)
                                              └─ sends via AppleScript → Messages.app
```

## Tech

Next.js (App Router) · React · TypeScript · Tailwind CSS · better-sqlite3 · AppleScript · Cloudflare Tunnel.

## Privacy & security

- Everything runs locally on your Mac. No third party ever receives your messages.
- The app is gated behind a password before any internet exposure.
- `.env.local` (your password and secret) is gitignored and never committed.
- Read access is **read-only** against the Messages database.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Full Disk Access required" | Grant FDA to your terminal app, then **restart the server** (permissions apply only at launch). |
| No contact names | The numbers aren't in your macOS Contacts, same as Messages.app. |
| Can't send | Allow your terminal app to control Messages under Privacy & Security → Automation. |
| HEIC images not loading | The app converts them with `sips`; ensure you're on macOS. |

## Disclaimer

Not affiliated with Apple. iMessage is a trademark of Apple Inc. Use with your own account and data.

## License

[MIT](LICENSE) © Taylor Kalin
