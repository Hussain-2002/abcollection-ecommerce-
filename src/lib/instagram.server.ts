import "server-only";

import { CURATED_REELS, parseCaption, type Reel } from "@/lib/founder-journey";

/**
 * Live reels from the Instagram API (Instagram Login, professional account).
 * Set INSTAGRAM_ACCESS_TOKEN to a long-lived token for @build.with.ab and the
 * journey sections update themselves. Without it, the curated list is used.
 */
const GRAPH = "https://graph.instagram.com/v22.0";
const REVALIDATE_SECONDS = 60 * 60;
const MAX_REELS = 30;

type ApiMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

function shortcode(permalink: string | undefined) {
  return permalink?.match(/\/(?:reel|p)\/([^/?#]+)/)?.[1] ?? "";
}

async function graph<T>(path: string, token: string): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}${path}${separator}access_token=${encodeURIComponent(token)}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["instagram-reels"] },
  });
  if (!res.ok) throw new Error(`Instagram API ${res.status}`);
  return (await res.json()) as T;
}

async function views(mediaId: string, token: string) {
  try {
    const data = await graph<{ data?: { name: string; values?: { value: number }[] }[] }>(
      `/${mediaId}/insights?metric=views`,
      token,
    );
    return data.data?.find((row) => row.name === "views")?.values?.[0]?.value ?? 0;
  } catch {
    return 0;
  }
}

async function liveReels(token: string): Promise<Reel[]> {
  const page = await graph<{ data?: ApiMedia[] }>(
    `/me/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=${MAX_REELS}`,
    token,
  );
  const reels = (page.data ?? []).filter(
    (row) => row.media_product_type === "REELS" || row.media_type === "VIDEO",
  );
  const curated = new Map(CURATED_REELS.map((reel) => [reel.id, reel]));

  return Promise.all(
    reels.map(async (row): Promise<Reel> => {
      const id = shortcode(row.permalink) || row.id;
      const known = curated.get(id);
      const parsed = parseCaption(row.caption ?? "");
      const isDrop = /shop (now|the)|link in bio/i.test(row.caption ?? "") && parsed.day === null;
      return {
        id,
        kind: known?.kind ?? (parsed.day !== null ? "journey" : isDrop ? "drop" : "journey"),
        // Hand-written titles read better than raw captions when we have them.
        title: known?.title ?? parsed.title,
        excerpt: known?.excerpt ?? parsed.excerpt,
        day: parsed.day ?? known?.day ?? null,
        postedAt: (row.timestamp ?? known?.postedAt ?? "").slice(0, 10),
        // Instagram thumbnail URLs expire; prefer our saved cover when we have one.
        cover: known?.cover ?? row.thumbnail_url ?? "",
        views: Math.max(await views(row.id, token), known?.views ?? 0),
        likes: row.like_count ?? known?.likes ?? 0,
        comments: row.comments_count ?? known?.comments ?? 0,
        ...(known?.productId ? { productId: known.productId } : {}),
      };
    }),
  );
}

/** Reels for the journey sections: live when configured, curated otherwise. */
export async function getFounderReels(): Promise<{ reels: Reel[]; live: boolean }> {
  const token = process.env["INSTAGRAM_ACCESS_TOKEN"]?.trim();
  if (!token) return { reels: CURATED_REELS, live: false };
  try {
    const reels = (await liveReels(token)).filter((reel) => reel.cover);
    return reels.length ? { reels, live: true } : { reels: CURATED_REELS, live: false };
  } catch (error) {
    console.error("[instagram] falling back to curated reels", error);
    return { reels: CURATED_REELS, live: false };
  }
}
