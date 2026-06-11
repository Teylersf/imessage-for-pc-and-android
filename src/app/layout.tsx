import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://imessage-web.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "iMessage for PC & Android — Free Open-Source Web Client",
    template: "%s · iMessage Web",
  },
  description:
    "Use iMessage on your PC, Windows, Android, or Linux. A free, open-source, self-hosted web client to read and send iMessages and texts from any browser using your own Mac.",
  keywords: [
    "imessage on pc",
    "imessage for pc",
    "imessage for windows",
    "imessage on android",
    "imessage for android",
    "imessage web",
    "imessage web client",
    "use imessage on pc",
    "imessage on windows",
    "imessage linux",
    "self-hosted imessage",
    "open source imessage",
    "text from computer",
  ],
  authors: [{ name: "Taylor Kalin" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "iMessage Web",
    title: "Use iMessage on PC & Android — Free, Open Source",
    description:
      "Read and send iMessages and texts from Windows, Android, Linux, or any browser. Free, private, self-hosted.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Use iMessage on PC & Android — Free, Open Source",
    description:
      "Read and send iMessages from any browser using your own Mac. Free and self-hosted.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
