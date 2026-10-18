import { NextResponse } from "next/server";

import { attachCustomerSessionCookie } from "@/lib/customer-auth.server";
import { getCart, getWishlist } from "@/lib/commerce.server";
import { passwordResetConfirmSchema, passwordResetSendSchema } from "@/lib/commerce-types";
import { resetPasswordWithOtp, sendPasswordResetCode } from "@/lib/password-reset.server";
import { actionErrorMessage } from "@/lib/form-request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { step?: string };
    if (body.step === "confirm") {
      const input = passwordResetConfirmSchema.parse(body);
      const customer = await resetPasswordWithOtp(input);
      const [cart, wishlist] = await Promise.all([getCart(customer.id), getWishlist(customer.id)]);
      const response = NextResponse.json({ customer, cart, wishlist });
      attachCustomerSessionCookie(response, customer.id);
      return response;
    }

    const input = passwordResetSendSchema.parse(body);
    const { resetToken } = await sendPasswordResetCode(input.email);
    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, we sent a 6-digit code.",
      ...(resetToken ? { resetToken } : {}),
    });
  } catch (error) {
    const { status, message } = actionErrorMessage(error, "Could not reset the password.");
    return NextResponse.json({ error: message }, { status });
  }
}
