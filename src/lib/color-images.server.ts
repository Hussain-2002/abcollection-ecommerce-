import "server-only";

import type { Product, ProductColorImages } from "@/lib/catalog-types";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/media";
import { parseColorImages, resolveColorImages } from "@/lib/product-colors";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

function colorImagesPath(productId: string) {
  return `meta/color-images/${productId}.json`;
}

export async function readStoredColorImages(productId: string): Promise<ProductColorImages[]> {
  try {
    const { data, error } = await getSupabaseWriteClient()
      .storage.from(PRODUCT_IMAGES_BUCKET)
      .download(colorImagesPath(productId));
    if (error || !data) return [];
    return parseColorImages(JSON.parse(await data.text()));
  } catch {
    return [];
  }
}

export async function writeStoredColorImages(productId: string, colorImages: ProductColorImages[]) {
  const path = colorImagesPath(productId);
  const bucket = getSupabaseWriteClient().storage.from(PRODUCT_IMAGES_BUCKET);
  const body = new Blob([JSON.stringify(colorImages)], { type: "application/json" });
  await bucket.remove([path]);
  const { error } = await bucket.upload(path, body, {
    contentType: "application/json",
    cacheControl: "0",
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

/** Drop colour-photo links that are no longer in the saved gallery. */
function colorImagesInGallery(images: string[], colorImages: ProductColorImages[]) {
  const allowed = new Set(images.map((src) => src.trim()).filter(Boolean));
  const used = new Set<string>();
  return colorImages.flatMap((entry) => {
    const color = entry.color.trim();
    if (!color) return [];
    const kept = entry.images
      .map((src) => src.trim())
      .filter((src) => src && allowed.has(src) && !used.has(src));
    kept.forEach((src) => used.add(src));
    return [{ color, images: kept }];
  });
}

export async function attachStoredColorImages(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;
  return Promise.all(
    products.map(async (product) => {
      const gallery = (product.images.length ? product.images : [product.image])
        .map((src) => src.trim())
        .filter(Boolean);
      const fromRow = colorImagesInGallery(gallery, product.colorImages ?? []);
      const grouped = fromRow.some((entry) => entry.images.length)
        ? fromRow
        : colorImagesInGallery(gallery, await readStoredColorImages(product.id));
      return {
        ...product,
        image: gallery[0] ?? product.image,
        images: gallery,
        colorImages: resolveColorImages(product.colors, gallery, grouped),
      };
    }),
  );
}
