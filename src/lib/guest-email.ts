/** Placeholder domain for guests who skip email; `.invalid` can never receive mail. */
export const GUEST_NO_EMAIL_DOMAIN = "guest.abcollection.invalid";

export function isPlaceholderEmail(email: string | null | undefined) {
  return !email || email.toLowerCase().endsWith(`@${GUEST_NO_EMAIL_DOMAIN}`);
}
