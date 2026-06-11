import Link from "next/link";

const REPO = "https://github.com/Teylersf/imessage-for-pc-and-android";

const features = [
  {
    title: "Read every conversation",
    body: "Your full iMessage and SMS history, synced live from your Mac — searchable from any browser.",
  },
  {
    title: "Send & receive",
    body: "Reply to texts and iMessages right from your PC or Android phone. Messages send as you, from your number.",
  },
  {
    title: "Photos & images",
    body: "View image attachments inline (HEIC auto-converted) and send pictures from any device.",
  },
  {
    title: "Contact names",
    body: "Resolves numbers to real names from your macOS Contacts, just like Messages on your Mac.",
  },
  {
    title: "Private & self-hosted",
    body: "Runs entirely on your own Mac. Your messages never touch anyone else's servers. Password-protected.",
  },
  {
    title: "Free & open source",
    body: "MIT licensed. No subscription, no account, no tracking. Fork it, audit it, host it yourself.",
  },
];

const steps = [
  {
    n: "1",
    title: "Keep a Mac running",
    body: "A Mac mini (or any Mac) left on and signed into iMessage acts as your always-on bridge.",
  },
  {
    n: "2",
    title: "Run the app",
    body: "Clone the repo, grant Full Disk Access, and start the server with two commands.",
  },
  {
    n: "3",
    title: "Open it anywhere",
    body: "A secure tunnel gives you a private URL. Open it on Windows, Android, Linux, or any browser.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "iMessage Web — iMessage for PC & Android",
  applicationCategory: "CommunicationApplication",
  operatingSystem: "Windows, Android, Linux, macOS, Web",
  description:
    "Free, open-source, self-hosted web client to use iMessage on PC, Windows, and Android. Read and send iMessages and texts from any browser using your own Mac.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  license: "https://opensource.org/licenses/MIT",
  url: REPO,
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight">iMessage Web</span>
        <nav className="flex items-center gap-5 text-sm">
          <a href={REPO} className="text-neutral-300 hover:text-white">
            GitHub
          </a>
          <Link
            href="/app"
            className="rounded-full bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
          >
            Open app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6">
        <section className="py-16 text-center sm:py-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-1.5 text-xs text-neutral-400">
            Free · Open source · Self-hosted
          </div>
          <h1 className="mx-auto max-w-3xl bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent sm:text-6xl">
            Use iMessage on your PC and Android
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
            A free, open-source web client that lets you read and send iMessages
            and texts from Windows, Android, Linux, or any browser — powered by a
            Mac you already own.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app"
              className="rounded-full bg-blue-600 px-6 py-3 font-semibold shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              Open the app
            </Link>
            <a
              href={REPO}
              className="rounded-full border border-neutral-700 px-6 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-900"
            >
              View on GitHub
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
            >
              <h2 className="mb-2 text-lg font-semibold">{f.title}</h2>
              <p className="text-sm leading-relaxed text-neutral-400">{f.body}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="py-16">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-neutral-800 p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-blue-600 font-bold">
                  {s.n}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-neutral-500">
            Requirement: a Mac (a Mac mini is ideal) left running and signed into
            iMessage. That Mac is the bridge — everything else just connects to it.
          </p>
        </section>

        {/* SEO content */}
        <section className="prose-invert mx-auto max-w-3xl py-12 text-neutral-400">
          <h2 className="mb-4 text-2xl font-bold text-neutral-200">
            Can you use iMessage on Windows or Android?
          </h2>
          <p className="leading-relaxed">
            Apple doesn&apos;t make iMessage for PC, Windows, or Android — but if you
            own a Mac, you can bridge it. This open-source iMessage web client reads
            your Messages database and uses your Mac to send and receive, so you get
            a real iMessage experience on any device with a browser. It&apos;s the
            free, private, self-hosted way to text from your computer using your own
            phone number, blue bubbles included.
          </p>
        </section>
      </main>

      <footer className="border-t border-neutral-900 py-10 text-center text-sm text-neutral-600">
        <p>
          Open source under the MIT license ·{" "}
          <a href={REPO} className="text-neutral-400 hover:text-white">
            Source on GitHub
          </a>
        </p>
        <p className="mt-2 text-xs">
          Not affiliated with Apple. iMessage is a trademark of Apple Inc.
        </p>
      </footer>
    </div>
  );
}
