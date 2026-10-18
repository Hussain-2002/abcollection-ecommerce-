"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";
import { fbqTrack } from "@/lib/meta-pixel";
import type { CartItemInput, CartLine, CustomerPublic, WishlistItem } from "@/lib/commerce-types";

export type AuthSuccessPayload = {
  customer: CustomerPublic;
  cart: CartLine[];
  wishlist: WishlistItem[];
};

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  guestCart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (payload: AuthSuccessPayload) => void | Promise<void>;
  guestCart: CartItemInput[];
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  const sendResetCode = async () => {
    const res = await fetch("/api/customer/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "send", email }),
    });
    const data = await readJsonBody<{ resetToken?: string; message?: string; error?: string }>(res);
    if (!res.ok) {
      setError(apiErrorMessage(data, "Could not send the code."));
      return;
    }
    if (data.resetToken) setResetToken(data.resetToken);
    setNotice(data.message || "If an account exists for that email, we sent a 6-digit code.");
    setMode("reset");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "forgot") {
        await sendResetCode();
        return;
      }
      if (mode === "reset") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const res = await fetch("/api/customer/password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "confirm", email, otp, password, resetToken }),
        });
        const data = await readJsonBody<AuthSuccessPayload & { error?: string }>(res);
        if (!res.ok || !data.customer) {
          setError(apiErrorMessage(data, "Could not reset the password."));
          return;
        }
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        onOpenChange(false);
        void onSuccess({
          customer: data.customer,
          cart: data.cart ?? [],
          wishlist: data.wishlist ?? [],
        });
        return;
      }

      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          fullName,
          email,
          phone,
          password,
          guestCart,
        }),
      });
      const data = await readJsonBody<AuthSuccessPayload & { error?: string }>(res);
      if (!res.ok || !data.customer) {
        setError(apiErrorMessage(data, "Authentication failed."));
        return;
      }
      setPassword("");
      if (mode === "signup") {
        fbqTrack("CompleteRegistration", { status: true, content_name: "Customer signup" });
      }
      onOpenChange(false);
      void onSuccess({
        customer: data.customer,
        cart: data.cart ?? [],
        wishlist: data.wishlist ?? [],
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%,calc(100vw-1.5rem))] max-w-md rounded-3xl border-border p-0 sm:max-w-md">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Forgot password"
                  : mode === "reset"
                    ? "Reset password"
                    : "Welcome back"}
            </DialogTitle>
            <DialogDescription>
              {mode === "signup"
                ? "Sign up to checkout, track orders, and save your wishlist."
                : mode === "forgot"
                  ? "Enter your email and we will send a 6-digit code."
                  : mode === "reset"
                    ? "Enter the code from your email and choose a new password."
                    : "Log in to continue to checkout and your account."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={submit} aria-busy={loading} className="space-y-4 px-6 pb-6">
          {mode === "signup" ? (
            <>
              <div>
                <Label htmlFor="auth-name">Full name</Label>
                <Input
                  id="auth-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1.5 h-11 rounded-full"
                />
              </div>
              <div>
                <Label htmlFor="auth-phone">Primary contact number</Label>
                <Input
                  id="auth-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  className="mt-1.5 h-11 rounded-full"
                />
              </div>
            </>
          ) : null}

          <div>
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 h-11 rounded-full"
            />
          </div>

          {mode === "reset" ? (
            <div>
              <Label htmlFor="auth-otp">Email code</Label>
              <Input
                id="auth-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                minLength={6}
                maxLength={6}
                placeholder="6-digit code"
                className="mt-1.5 h-11 rounded-full tracking-[0.2em]"
              />
            </div>
          ) : null}

          {mode === "forgot" ? null : (
            <div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="auth-password">
                  {mode === "reset" ? "New password" : "Password"}
                </Label>
                {mode === "login" ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-teal underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                      setNotice("");
                    }}
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "login" ? 1 : 8}
                className="mt-1.5 h-11 rounded-full"
              />
            </div>
          )}

          {mode === "reset" ? (
            <div>
              <Label htmlFor="auth-confirm">Confirm password</Label>
              <Input
                id="auth-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1.5 h-11 rounded-full"
              />
            </div>
          ) : null}

          {notice ? (
            <p className="text-sm text-teal" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase hover:bg-teal/90"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "signup" ? (
              "Create account"
            ) : mode === "forgot" ? (
              "Send code"
            ) : mode === "reset" ? (
              "Reset password"
            ) : (
              "Log in"
            )}
          </Button>

          {mode === "reset" ? (
            <button
              type="button"
              className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
              disabled={loading}
              onClick={() => {
                if (loading) return;
                setLoading(true);
                setError("");
                void sendResetCode().finally(() => setLoading(false));
              }}
            >
              Resend code
            </button>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "forgot" || mode === "reset" ? (
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setNotice("");
                }}
              >
                Back to log in
              </button>
            ) : (
              <>
                {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode(mode === "signup" ? "login" : "signup");
                    setError("");
                    setNotice("");
                  }}
                >
                  {mode === "signup" ? "Log in" : "Create account"}
                </button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
