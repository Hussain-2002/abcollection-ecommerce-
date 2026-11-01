import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: `${SITE_TAGLINE}. Premium heavyweight cotton tees for men.`,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4f0",
    theme_color: "#111111",
    lang: "en-IN",
    categories: ["shopping", "fashion"],
    icons: [
      {
        src: "/brand/ab-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/ab-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
