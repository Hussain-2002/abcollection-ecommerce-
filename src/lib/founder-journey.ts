/**
 * Founder's journey: Abbas documents AB Collection on Instagram (@build.with.ab).
 * The curated list below is what the site shows when no Instagram API token is
 * configured. Numbers are a snapshot from 1 Nov 2026; the live API replaces them.
 */

export const FOUNDER_HANDLE = "build.with.ab";
export const FOUNDER_INSTAGRAM = `https://www.instagram.com/${FOUNDER_HANDLE}/`;
export const FOUNDER_NAME = "Abbas Badwahwala";

export type ReelKind = "story" | "journey" | "drop";

export type Reel = {
  /** Instagram shortcode, e.g. instagram.com/reel/<id>/ */
  id: string;
  kind: ReelKind;
  /** First line of the caption: the hook. */
  title: string;
  /** One or two lines that carry the story. */
  excerpt: string;
  day: number | null;
  postedAt: string;
  cover: string;
  views: number;
  likes: number;
  comments: number;
  productId?: string;
};

export const CURATED_REELS: Reel[] = [
  {
    id: "Db4zobRvJo2",
    kind: "story",
    title: "40 years ago, my father started selling garments from a handcart.",
    excerpt:
      "Today, I opened the doors to AB Collection. What started with an idea, a few samples and an empty room has finally become something real.",
    day: null,
    postedAt: "2026-08-10",
    cover: "/journey/Db4zobRvJo2.webp",
    views: 154_000,
    likes: 3953,
    comments: 240,
  },
  {
    id: "DfJqKMYPuW6",
    kind: "journey",
    title: "A whole day of no, then late at night, one yes.",
    excerpt:
      "Our first order. Not for the hype, but for the idea: fewer clothes, made better. Folded it carefully, because that's what a yes deserves.",
    day: 12,
    postedAt: "2026-10-31",
    cover: "/journey/DfJqKMYPuW6.webp",
    views: 876,
    likes: 28,
    comments: 0,
  },
  {
    id: "DfEUezwv_wz",
    kind: "journey",
    title: "Searched all day for the right winter fabric. Came back empty-handed.",
    excerpt:
      "Wholesale markets, factories, more units. I'd rather come back with nothing than sell you something I don't believe in.",
    day: 11,
    postedAt: "2026-10-28",
    cover: "/journey/DfEUezwv_wz.webp",
    views: 3075,
    likes: 52,
    comments: 2,
  },
  {
    id: "DfAI33VNw3T",
    kind: "journey",
    title: "The hardest part of building a brand isn't the product. It's the price.",
    excerpt:
      "Too low and the quality suffers. Too high and the people who want to try us never get to. Going through every cost, line by line.",
    day: 10,
    postedAt: "2026-10-27",
    cover: "/journey/DfAI33VNw3T.webp",
    views: 2326,
    likes: 43,
    comments: 8,
  },
  {
    id: "De9jFqRtfqI",
    kind: "journey",
    title: "Where are our customers?",
    excerpt: "Nine days in. Time to find out where the people who'd love this actually are.",
    day: 9,
    postedAt: "2026-10-26",
    cover: "/journey/De9jFqRtfqI.webp",
    views: 3928,
    likes: 59,
    comments: 0,
  },
  {
    id: "De66RaivCCd",
    kind: "journey",
    title: "Turned off COD. Half the orders, same profit.",
    excerpt: "One returned order cancels out one delivered order. Would you do the same?",
    day: 8,
    postedAt: "2026-10-25",
    cover: "/journey/De66RaivCCd.webp",
    views: 3125,
    likes: 44,
    comments: 0,
  },
  {
    id: "De-seQVP073",
    kind: "journey",
    title: "Day one of building in public.",
    excerpt:
      "Most business content only shows the highlight reel. From today, documenting the real work: every order packed, every mistake, every lesson.",
    day: 1,
    postedAt: "2026-10-26",
    cover: "/journey/De-seQVP073.webp",
    views: 1308,
    likes: 15,
    comments: 2,
  },
  {
    id: "De4OOyFPNVS",
    kind: "journey",
    title: "Not everyone who asks about a product ends up buying it.",
    excerpt:
      "Instead of guessing why, I'm going straight to the people who showed interest. Is it the fit? The price? Shipping?",
    day: null,
    postedAt: "2026-10-24",
    cover: "/journey/De4OOyFPNVS.webp",
    views: 1646,
    likes: 28,
    comments: 4,
  },
  {
    id: "DeyqEkevU9a",
    kind: "journey",
    title: "A T-shirt is more than its colour or fit.",
    excerpt:
      "The collar, fabric weight, stitching and finishing all decide how a garment feels and wears over time. 240 GSM is only one part of the story.",
    day: null,
    postedAt: "2026-10-22",
    cover: "/journey/DeyqEkevU9a.webp",
    views: 2080,
    likes: 27,
    comments: 2,
  },
  {
    id: "DfG6cIrv_pL",
    kind: "drop",
    title: "The limited-edition lava-sprayed acid wash.",
    excerpt: "Our statement piece, in a small run.",
    day: null,
    postedAt: "2026-10-29",
    cover: "/journey/DfG6cIrv_pL.webp",
    views: 3581,
    likes: 57,
    comments: 4,
    productId: "acid-wash",
  },
  {
    id: "DfHS3ZyvR5T",
    kind: "drop",
    title: "Sun-Fades, now live.",
    excerpt: "Made to look lived in. Made to be lived in.",
    day: null,
    postedAt: "2026-10-30",
    cover: "/journey/DfHS3ZyvR5T.webp",
    views: 1337,
    likes: 15,
    comments: 6,
    productId: "sun-faded-240",
  },
];

export function reelUrl(id: string) {
  return `https://www.instagram.com/reel/${id}/`;
}

export function reelEmbedUrl(id: string) {
  return `https://www.instagram.com/reel/${id}/embed/`;
}

export function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

export function mostViewed(reels: Reel[], limit = reels.length) {
  return [...reels].sort((a, b) => b.views - a.views).slice(0, limit);
}

/** Reads the hook, excerpt and "Day 12/60" out of a caption from the live API. */
export function parseCaption(caption: string) {
  const text = caption.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const dayMatch = text.match(/Day\s*(\d{1,2})\s*\/\s*60/i);
  const first = (lines[0] ?? "").replace(/^Day\s*\d{1,2}\s*\/\s*60\s*[:—–-]?\s*/i, "").trim();
  const title = first || lines[1] || "";
  const excerpt = lines
    .slice(first ? 1 : 2)
    .filter((line) => !/^Day\s*\d/i.test(line) && !/^₹[\d,]+\s*\//.test(line))
    .slice(0, 2)
    .join(" ");
  return {
    title: title.slice(0, 140),
    excerpt: excerpt.slice(0, 240),
    day: dayMatch ? Number(dayMatch[1]) : null,
  };
}
