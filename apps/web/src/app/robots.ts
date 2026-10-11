import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Next.js prefetch (RSC) URLs return full pages; keep them from being crawled as duplicates.
      disallow: ["/*_rsc=", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
