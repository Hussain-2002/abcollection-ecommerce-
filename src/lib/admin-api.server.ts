import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";

/** Runs an admin handler with auth and consistent error responses. */
export async function adminRoute<T>(handler: (admin: string) => Promise<T>, fallback: string) {
  try {
    const session = await requireAdminSession();
    return NextResponse.json(await handler(session.username), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? fallback }, { status: 400 });
    }
    const status = (error as { status?: number }).status;
    console.error("[admin]", fallback, error);
    return NextResponse.json(
      { error: error instanceof Error && status ? error.message : fallback },
      { status: status ?? 500 },
    );
  }
}
