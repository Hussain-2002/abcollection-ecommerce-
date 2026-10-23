import { NextResponse } from "next/server";

import { quoteCheckout } from "@/lib/commerce.server";
import { checkoutSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { actionErrorMessage } from "@/lib/form-request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = checkoutSchema.parse(await request.json());
    const quote = await quoteCheckout(session, body);
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const { status, message } = actionErrorMessage(error, "Could not price this checkout.");
    return NextResponse.json({ error: message }, { status });
  }
}
