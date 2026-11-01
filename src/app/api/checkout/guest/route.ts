import { NextResponse } from "next/server";

import { getCustomerSession } from "@/lib/customer-auth.server";
import { actionErrorMessage } from "@/lib/form-request";
import { guestCheckoutSchema, startGuestCheckout } from "@/lib/guest-checkout.server";

export const dynamic = "force-dynamic";

/** Starts checkout without an account: name, mobile, optional email and the browser cart. */
export async function POST(request: Request) {
  try {
    if (await getCustomerSession()) {
      return NextResponse.json(
        { error: "You're signed in. Refresh checkout to continue." },
        { status: 409 },
      );
    }
    const body = guestCheckoutSchema.parse(await request.json());
    const guest = await startGuestCheckout(body);
    return NextResponse.json({ ok: true, guest });
  } catch (error) {
    const { status, message } = actionErrorMessage(error, "Could not start guest checkout.");
    return NextResponse.json({ error: message }, { status });
  }
}
