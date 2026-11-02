import { z } from "zod";

/** Recommended upload sizes for the homepage hero. Phones are screens under 700px wide. */
export const HERO_BANNER_SIZES = {
  desktop: { width: 1920, height: 1080, ratio: "16:9", label: "Desktop & tablet" },
  mobile: { width: 1080, height: 1920, ratio: "9:16", label: "Phone" },
} as const;

export const MAX_HERO_BANNERS = 8;

export const heroBannerSchema = z.object({
  id: z.string().trim().min(1).max(40),
  desktopImage: z.string().trim().min(1, "Every banner needs a desktop image.").max(500),
  /** Optional portrait crop for phones; the desktop image is used when empty. */
  mobileImage: z.string().trim().max(500).default(""),
  alt: z.string().trim().min(2, "Describe every banner in a few words.").max(160),
  active: z.boolean().default(true),
});

export const heroBannersSchema = z.array(heroBannerSchema).max(MAX_HERO_BANNERS);

export type HeroBanner = z.infer<typeof heroBannerSchema>;
