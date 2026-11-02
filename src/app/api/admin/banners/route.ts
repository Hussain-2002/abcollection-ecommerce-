import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { heroBannersSchema } from "@/lib/home-banners";
import { getHeroBanners, saveHeroBanners } from "@/lib/home-banners.server";

export async function GET() {
  try {
    await requireAdminSession();
    const banners = await getHeroBanners();
    return NextResponse.json({ banners });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as { banners?: unknown };
    const banners = await saveHeroBanners(heroBannersSchema.parse(body.banners ?? []));
    return NextResponse.json({ banners });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid banners" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Could not save banners";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
