import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://imessage-web.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep the private messenger and APIs out of search indexes.
      disallow: ["/app", "/api/", "/login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
