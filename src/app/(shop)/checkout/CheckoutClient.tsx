"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, RefreshCw, Truck } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useMemberPricing } from "@/components/membership/MembershipProvider";
import { OrderProcessingScreen } from "@/components/commerce/OrderProcessingScreen";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bestQualifyingBundle,
  buildDisplayCartLines,
  displayLineFromInput,
  formatCartIssue,
  validateDisplayCartLines,
  type CartIssue,
} from "@/lib/cart-display";
import { loadCashfreeCheckout } from "@/lib/cashfree-checkout";
import { BUY_NOW_KEY, CHECKOUT_DRAFT_KEY } from "@/lib/commerce-constants";
import type { CartItemInput, CheckoutInput, CustomerAddress, Order } from "@/lib/commerce-types";
import { cdnImageUrl } from "@/lib/media";
import { formatInr } from "@/lib/price";
import { META_CURRENCY, fbqTrack, fbqTrackPurchase } from "@/lib/meta-pixel";
import { istefadaUnitOff, resolveIstefadaDiscount } from "@/lib/istefada-offer";
import type { BundleOfferView } from "@/lib/store-offers";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";

const ADDRESS_FIELDS = ["label", "line1", "city", "state", "pincode"] as const;
type AddressField = (typeof ADDRESS_FIELDS)[number];

const ADDRESS_FIELD_NAME: Record<AddressField, string> = {
  label: "address label",
  line1: "street address",
  city: "city",
  state: "state",
  pincode: "PIN code",
};

function addressFieldErrors(values: Record<AddressField, string>) {
  const errors: Partial<Record<AddressField, string>> = {};
  if (!values.label.trim()) errors.label = "Add a name for this address, such as Home.";
  if (values.line1.trim().length < 3) errors.line1 = "Enter your street address.";
  if (values.city.trim().length < 2) errors.city = "Enter your city.";
  if (values.state.trim().length < 2) errors.state = "Enter your state.";
  if (!/^\d{6}$/.test(values.pincode.trim())) {
    errors.pincode = "Enter a valid 6-digit PIN code.";
  }
  return errors;
}

function addressAlert(errors: Partial<Record<AddressField, string>>) {
  const missing = ADDRESS_FIELDS.filter((field) => errors[field]).map(
    (field) => ADDRESS_FIELD_NAME[field],
  );
  if (missing.length === 1) return `Please fill in your ${missing[0]}.`;
  const last = missing[missing.length - 1];
  return `Please fill in your ${missing.slice(0, -1).join(", ")} and ${last}.`;
}

const GUEST_CONTACT_KEY = "ab_guest_contact";
type GuestField = "fullName" | "phone" | "email";

function guestFieldErrors(values: Record<GuestField, string>) {
  const errors: Partial<Record<GuestField, string>> = {};
  if (values.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!/^(\+?91)?[6-9]\d{9}$/.test(values.phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Enter a 10-digit mobile number.";
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email, or leave it blank.";
  }
  return errors;
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[0.78rem] font-medium tracking-[0.18em] uppercase">
      <span className="grid size-6 place-items-center rounded-full bg-ink text-[0.66rem] tracking-normal text-white">
        {n}
      </span>
      {children}
    </h2>
  );
}

function FieldAlert({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") === "buy_now" ? "buy_now" : "cart";
  const { customer, cart, guestCart, openAuth, loading, applySuccessfulOrder, openCart } =
    useCommerce();
  const { products } = useCatalog();
  const { hasOffer, promoCode } = useIstefadaOffer();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [alternatePhone, setAlternatePhone] = useState("");
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [buyNow, setBuyNow] = useState<CartItemInput | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AddressField, string>>>({});
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestErrors, setGuestErrors] = useState<Partial<Record<GuestField, string>>>({});
  const [issues, setIssues] = useState<CartIssue[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponQuote, setCouponQuote] = useState<{
    ok: boolean;
    code: string;
    discount: number;
    error?: string;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [bundles, setBundles] = useState<BundleOfferView[]>([]);
  const [serverQuote, setServerQuote] = useState<{
    totalAmount: number;
    couponDiscount: number;
    bundleDiscount: number;
    memberDiscount: number;
  } | null>(null);
  /** Server total the shopper must confirm after a price change (e.g. membership expired). */
  const [priceNotice, setPriceNotice] = useState<{ total: number } | null>(null);
  const checkoutIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "",
  );
  const submittingRef = useRef(false);

  useEffect(() => {
    if (mode === "buy_now") {
      try {
        const raw = sessionStorage.getItem(BUY_NOW_KEY);
        setBuyNow(raw ? (JSON.parse(raw) as CartItemInput) : null);
      } catch {
        setBuyNow(null);
      }
    }
  }, [mode]);

  useEffect(() => {
    router.prefetch("/checkout/success");
    router.prefetch("/checkout/return");
    const mode =
      process.env["NEXT_PUBLIC_CASHFREE_MODE"] === "production" ? "production" : "sandbox";
    void loadCashfreeCheckout(mode).catch(() => undefined);
  }, [router]);

  useEffect(() => {
    if (customer) return;
    try {
      const saved = JSON.parse(localStorage.getItem(GUEST_CONTACT_KEY) || "null") as {
        fullName?: string;
        phone?: string;
        email?: string;
      } | null;
      if (!saved) return;
      setGuestName((value) => value || saved.fullName || "");
      setGuestPhone((value) => value || saved.phone || "");
      setGuestEmail((value) => value || saved.email || "");
    } catch {
      // Ignore a corrupt saved contact.
    }
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    setAlternatePhone(customer.alternatePhone ?? "");
    void (async () => {
      const res = await fetch("/api/customer/addresses");
      if (!res.ok) return;
      const data = (await res.json()) as { addresses: CustomerAddress[] };
      setAddresses(data.addresses);
      const def = data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
      if (def) {
        setSelectedAddressId(def.id);
        setUseNewAddress(false);
      } else {
        setUseNewAddress(true);
      }
    })();
  }, [customer]);

  const payRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void fetch("/api/bundles")
      .then((res) => res.json())
      .then((data: { bundles?: BundleOfferView[] }) => setBundles(data.bundles ?? []))
      .catch(() => setBundles([]));
  }, []);
  const lines = useMemo(() => {
    if (mode === "buy_now" && buyNow) {
      return [displayLineFromInput(buyNow, products)];
    }
    return buildDisplayCartLines({
      customer: Boolean(customer),
      cart,
      guestCart,
      products,
    });
  }, [mode, buyNow, customer, cart, guestCart, products]);

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  // AB Insider prices for display; the server quote below is the real total.
  const member = useMemberPricing(lines);
  const istefadaDiscount = hasOffer ? resolveIstefadaDiscount(promoCode, member.offerLines) : 0;
  const previewDiscount = couponQuote?.ok ? couponQuote.discount : istefadaDiscount;
  const previewCode = couponQuote?.ok ? couponQuote.code : hasOffer ? promoCode : "";
  const appliedBundle = bestQualifyingBundle(bundles, member.bundleLines);
  const bundleSavings = serverQuote?.bundleDiscount ?? appliedBundle?.savings ?? 0;
  const couponSavings = serverQuote?.couponDiscount ?? previewDiscount;
  const memberSavings = serverQuote?.memberDiscount ?? member.memberSavings;
  const total =
    serverQuote?.totalAmount ??
    Math.max(0, subtotal - member.memberSavings - previewDiscount - (appliedBundle?.savings ?? 0));

  const payLabel = priceNotice
    ? `Confirm & pay ${formatInr(priceNotice.total)}`
    : `Pay ${formatInr(total)}`;

  // Any change to the cart or code means the shopper is looking at a fresh total.
  useEffect(() => {
    setPriceNotice(null);
  }, [lines, couponInput, couponQuote]);

  useEffect(() => {
    if (!customer || lines.length === 0) {
      setServerQuote(null);
      return;
    }
    setServerQuote(null);
    const promo = couponQuote?.ok
      ? couponQuote.code
      : couponInput.trim() || (hasOffer ? promoCode : "");
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          ...(mode === "buy_now" && buyNow ? { buyNow } : {}),
          ...(promo ? { promoCode: promo } : {}),
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (
            data: {
              totalAmount?: number;
              couponDiscount?: number;
              bundleDiscount?: number;
              memberDiscount?: number;
            } | null,
          ) => {
            if (cancelled || !data || typeof data.totalAmount !== "number") return;
            setServerQuote({
              totalAmount: data.totalAmount,
              couponDiscount: data.couponDiscount ?? 0,
              bundleDiscount: data.bundleDiscount ?? 0,
              memberDiscount: data.memberDiscount ?? 0,
            });
          },
        )
        .catch(() => undefined);
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [buyNow, couponInput, couponQuote, customer, hasOffer, lines, mode, promoCode]);
  const initiateTracked = useRef(false);

  useEffect(() => {
    if (initiateTracked.current || loading || lines.length === 0) return;
    initiateTracked.current = true;
    fbqTrack("InitiateCheckout", {
      value: total,
      currency: META_CURRENCY,
      num_items: lines.reduce((sum, line) => sum + line.quantity, 0),
      content_ids: lines.map((line) => line.productId),
      contents: lines.map((line) => ({ id: line.productId, quantity: line.quantity })),
      content_type: "product",
    });
  }, [loading, lines, total]);

  const showPay = lines.length > 0 && !loading && !(submitting && !paying);
  const payInView = useInView(payRef, showPay);

  const applyCoupon = async () => {
    if (couponBusy) return;
    setCouponBusy(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput,
          lines: lines.map((line) => ({
            productId: line.productId,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await readJsonBody<{
        ok: boolean;
        code: string;
        discount: number;
        error?: string;
      }>(res);
      if (!res.ok) {
        setCouponQuote({
          ok: false,
          code: couponInput,
          discount: 0,
          error: apiErrorMessage(data, "Could not validate coupon."),
        });
        return;
      }
      setCouponQuote(data);
    } catch {
      setCouponQuote({
        ok: false,
        code: couponInput,
        discount: 0,
        error: "Could not validate coupon.",
      });
    } finally {
      setCouponBusy(false);
    }
  };

  const clearGuestError = (field: GuestField) => {
    setGuestErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearFieldError = (field: AddressField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || submittingRef.current) return;
    if (!customer) {
      const nextGuestErrors = guestFieldErrors({
        fullName: guestName,
        phone: guestPhone,
        email: guestEmail,
      });
      const firstGuestInvalid = (["fullName", "phone", "email"] as const).find(
        (field) => nextGuestErrors[field],
      );
      if (firstGuestInvalid) {
        setGuestErrors(nextGuestErrors);
        setError("Please check your contact details.");
        const field = document.getElementById(`guest-${firstGuestInvalid}`);
        field?.focus();
        field?.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      setGuestErrors({});
    }
    if (useNewAddress || !selectedAddressId) {
      const nextErrors = addressFieldErrors({ label, line1, city, state, pincode });
      const firstInvalid = ADDRESS_FIELDS.find((field) => nextErrors[field]);
      if (firstInvalid) {
        setFieldErrors(nextErrors);
        setError(addressAlert(nextErrors));
        setIssues([]);
        const field = document.getElementById(firstInvalid);
        field?.focus();
        field?.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
    }
    setFieldErrors({});
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setIssues([]);
    let placed = false;
    try {
      const foundIssues = validateDisplayCartLines(lines, products);
      if (foundIssues.length) {
        setIssues(foundIssues);
        setError(
          foundIssues.some((issue) => issue.type !== "price")
            ? "Some items in your cart are no longer available."
            : "Please review the updated prices before continuing.",
        );
        return;
      }
      const submittedPromo = couponQuote?.ok
        ? couponQuote.code
        : couponInput.trim() || (hasOffer ? promoCode : undefined);
      const checkoutId = checkoutIdRef.current || undefined;
      const payload: CheckoutInput =
        useNewAddress || !selectedAddressId
          ? {
              mode,
              ...(mode === "buy_now" && buyNow ? { buyNow } : {}),
              alternatePhone,
              ...(submittedPromo ? { promoCode: submittedPromo } : {}),
              ...(checkoutId ? { checkoutId } : {}),
              expectedTotal: priceNotice?.total ?? total,
              address: {
                label: label.trim(),
                line1,
                line2,
                city,
                state,
                pincode,
                isDefault: addresses.length === 0,
              },
            }
          : {
              mode,
              ...(mode === "buy_now" && buyNow ? { buyNow } : {}),
              alternatePhone,
              addressId: selectedAddressId,
              ...(submittedPromo ? { promoCode: submittedPromo } : {}),
              ...(checkoutId ? { checkoutId } : {}),
              expectedTotal: priceNotice?.total ?? total,
            };

      if (!customer) {
        const contact = {
          fullName: guestName.trim(),
          phone: guestPhone.trim(),
          email: guestEmail.trim(),
        };
        localStorage.setItem(GUEST_CONTACT_KEY, JSON.stringify(contact));
        const guestRes = await fetch("/api/checkout/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...contact,
            items: mode === "cart" ? guestCart : [],
          }),
        });
        if (!guestRes.ok) {
          const guestData = await readJsonBody<{ error?: string }>(guestRes);
          setError(apiErrorMessage(guestData, "Could not save your details. Please try again."));
          return;
        }
      }

      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(payload));

      const payRes = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const payData = await readJsonBody<{
        skipPayment?: boolean;
        alreadyPaid?: boolean;
        paymentSessionId?: string;
        cashfreeOrderId?: string;
        checkoutId?: string;
        mode?: "sandbox" | "production";
        error?: string;
        code?: string;
        totalAmount?: number;
      }>(payRes);
      if (
        payRes.status === 409 &&
        payData.code === "price_changed" &&
        typeof payData.totalAmount === "number"
      ) {
        // Show the new total and wait for the shopper to confirm it.
        setPriceNotice({ total: payData.totalAmount });
        setError("");
        return;
      }
      if (!payRes.ok) {
        setError(apiErrorMessage(payData, "Could not start payment. Your cart is unchanged."));
        return;
      }
      if (payData.checkoutId) {
        checkoutIdRef.current = payData.checkoutId;
        sessionStorage.setItem(
          CHECKOUT_DRAFT_KEY,
          JSON.stringify({ ...payload, checkoutId: payData.checkoutId }),
        );
      }

      const place = async () => {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await readJsonBody<{ order?: Order; error?: string }>(res);
        if (!res.ok || !data.order) {
          if (res.status === 409 && typeof crypto !== "undefined" && "randomUUID" in crypto) {
            checkoutIdRef.current = crypto.randomUUID();
          }
          throw Object.assign(
            new Error(apiErrorMessage(data, "Could not place order. Your cart is unchanged.")),
            { status: res.status },
          );
        }
        setPlacing(true);
        fbqTrackPurchase(data.order);
        sessionStorage.removeItem(BUY_NOW_KEY);
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        void applySuccessfulOrder(data.order, mode);
        router.replace(`/checkout/success?order=${encodeURIComponent(data.order.orderNumber)}`);
      };

      // The return page verifies the payment with Cashfree, waits for slow UPI
      // confirmations and then opens the order confirmation page.
      const confirmPayment = (cashfreeOrderId: string) => {
        setPlacing(true);
        router.replace(`/checkout/return?order_id=${encodeURIComponent(cashfreeOrderId)}`);
      };

      if (payData.skipPayment) {
        await place();
        placed = true;
        return;
      }

      if (payData.alreadyPaid && payData.cashfreeOrderId) {
        confirmPayment(payData.cashfreeOrderId);
        placed = true;
        return;
      }

      if (!payData.paymentSessionId || !payData.cashfreeOrderId) {
        setError("Could not start Cashfree checkout. Try again.");
        return;
      }

      setPaying(true);
      fbqTrack("AddPaymentInfo", {
        value: total,
        currency: META_CURRENCY,
        content_ids: lines.map((line) => line.productId),
        content_type: "product",
      });
      const cashfree = await loadCashfreeCheckout(
        payData.mode === "production" ? "production" : "sandbox",
      );
      const result = await cashfree.checkout({
        paymentSessionId: payData.paymentSessionId,
        redirectTarget: "_modal",
      });
      setPaying(false);
      const cashfreeMessage = result?.error?.message?.trim() ?? "";
      const paymentAborted = /abort|cancelled|canceled|closed|dismiss/i.test(cashfreeMessage);
      if (paymentAborted) {
        setError("Payment was cancelled.");
        return;
      }
      confirmPayment(payData.cashfreeOrderId);
      placed = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
      if (!placed) {
        setPlacing(false);
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  if (submitting && !paying) {
    return (
      <OrderProcessingScreen
        title={placing ? "Placing your order" : "Opening secure payment"}
        subtitle={
          placing
            ? "Confirming your payment and order."
            : "Please wait — Cashfree checkout is starting."
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-normal">Nothing to checkout</h1>
        <Button
          asChild
          className="mt-6 h-11 bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          <Link href="/collection">Browse Collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="page-wrap max-w-6xl py-[clamp(2rem,5vw,3.5rem)] pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-16">
      <nav
        aria-label="Checkout steps"
        className="flex items-center gap-2 text-[0.68rem] tracking-[0.16em] uppercase"
      >
        <button
          type="button"
          onClick={openCart}
          className="text-muted-foreground hover:text-foreground"
        >
          Bag
        </button>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="step">Details</span>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span className="text-muted-foreground">Payment</span>
      </nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="editorial text-[clamp(2.4rem,6vw,3.6rem)] leading-none">Checkout</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4" strokeWidth={1.4} aria-hidden />
          Secure payment with Cashfree
        </p>
      </div>

      <form
        onSubmit={submit}
        noValidate
        aria-busy={submitting}
        className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-12"
      >
        <div className="min-w-0 space-y-4">
          {!customer ? (
            <section className="min-w-0 border border-border bg-paper p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StepTitle n={1}>Contact</StepTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Checking out as a guest. No account needed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    mode === "buy_now" && buyNow
                      ? openAuth({
                          type: "buy_now",
                          item: buyNow,
                          redirect: "/checkout?mode=buy_now",
                        })
                      : openAuth({ type: "checkout" })
                  }
                  className="min-h-11 text-[0.72rem] tracking-[0.16em] underline underline-offset-4 uppercase"
                >
                  Have an account? Log in
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="guest-fullName">Full name</Label>
                  <Input
                    id="guest-fullName"
                    autoComplete="name"
                    required
                    value={guestName}
                    aria-invalid={Boolean(guestErrors.fullName)}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      clearGuestError("fullName");
                    }}
                    className={cn("mt-1.5 h-11", guestErrors.fullName && "border-destructive")}
                  />
                  <FieldAlert message={guestErrors.fullName} />
                </div>
                <div>
                  <Label htmlFor="guest-phone">Mobile number</Label>
                  <Input
                    id="guest-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    required
                    value={guestPhone}
                    aria-invalid={Boolean(guestErrors.phone)}
                    onChange={(e) => {
                      setGuestPhone(e.target.value);
                      clearGuestError("phone");
                    }}
                    placeholder="10-digit mobile"
                    className={cn("mt-1.5 h-11", guestErrors.phone && "border-destructive")}
                  />
                  <FieldAlert message={guestErrors.phone} />
                </div>
                <div>
                  <Label htmlFor="guest-email">Email (optional)</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={guestEmail}
                    aria-invalid={Boolean(guestErrors.email)}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      clearGuestError("email");
                    }}
                    placeholder="For your order confirmation"
                    className={cn("mt-1.5 h-11", guestErrors.email && "border-destructive")}
                  />
                  <FieldAlert message={guestErrors.email} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="alt-phone">Alternate contact number (optional)</Label>
                  <Input
                    id="alt-phone"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    className="mt-1.5 h-11"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
                <span aria-hidden className="mt-0.5 text-foreground">
                  ✦
                </span>
                <p>
                  Want to track every order in one place?{" "}
                  <button
                    type="button"
                    onClick={() => openAuth({ type: "checkout" })}
                    className="text-foreground underline underline-offset-4"
                  >
                    Create an account
                  </button>{" "}
                  — it&apos;s optional. You can still track this order with your order number.
                </p>
              </div>
            </section>
          ) : (
            <section className="min-w-0 border border-border bg-paper p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <StepTitle n={1}>Contact</StepTitle>
                <Link
                  href="/account/settings"
                  className="text-[0.72rem] tracking-[0.14em] text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline"
                >
                  Edit
                </Link>
              </div>
              <div className="mt-4 text-sm">
                <p className="font-medium">{customer.fullName}</p>
                <p className="mt-0.5 break-all text-muted-foreground">
                  {customer.email} · {customer.phone}
                </p>
              </div>
              <div className="mt-5">
                <Label htmlFor="alt-phone">Alternate contact number (optional)</Label>
                <Input
                  id="alt-phone"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  className="mt-1.5"
                  inputMode="tel"
                  placeholder="In case we can't reach you"
                />
              </div>
            </section>
          )}

          <section className="min-w-0 border border-border bg-paper p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <StepTitle n={2}>Delivery</StepTitle>
              {addresses.length ? (
                <button
                  type="button"
                  className="text-[0.72rem] tracking-[0.14em] text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setUseNewAddress((v) => !v)}
                >
                  {useNewAddress ? "Use a saved address" : "+ New address"}
                </button>
              ) : null}
            </div>

            {!useNewAddress && addresses.length ? (
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {addresses.map((address) => {
                  const selected = selectedAddressId === address.id;
                  return (
                    <label
                      key={address.id}
                      className={cn(
                        "flex cursor-pointer gap-3 border p-4 text-sm transition-colors duration-200",
                        selected
                          ? "border-ink bg-background"
                          : "border-border hover:border-foreground/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        className="sr-only"
                        checked={selected}
                        onChange={() => setSelectedAddressId(address.id)}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                          selected ? "border-ink" : "border-input",
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full bg-ink transition-transform duration-200",
                            selected ? "scale-100" : "scale-0",
                          )}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{address.label}</span>
                        <span className="mt-1 block text-muted-foreground">
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""}
                        </span>
                        <span className="block text-muted-foreground">
                          {address.city}, {address.state} {address.pincode}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {Object.keys(fieldErrors).length ? (
                  <p className="text-sm text-destructive sm:col-span-2" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="sm:col-span-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    required
                    value={label}
                    aria-invalid={Boolean(fieldErrors.label)}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      clearFieldError("label");
                    }}
                    placeholder="Home"
                    className={`mt-1.5 h-11 ${fieldErrors.label ? "border-destructive" : ""}`}
                  />
                  <FieldAlert message={fieldErrors.label} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line1">Address line 1</Label>
                  <Input
                    id="line1"
                    required
                    value={line1}
                    aria-invalid={Boolean(fieldErrors.line1)}
                    onChange={(e) => {
                      setLine1(e.target.value);
                      clearFieldError("line1");
                    }}
                    className={`mt-1.5 h-11 ${fieldErrors.line1 ? "border-destructive" : ""}`}
                  />
                  <FieldAlert message={fieldErrors.line1} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line2">Address line 2 (optional)</Label>
                  <Input
                    id="line2"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="mt-1.5 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    required
                    value={city}
                    aria-invalid={Boolean(fieldErrors.city)}
                    onChange={(e) => {
                      setCity(e.target.value);
                      clearFieldError("city");
                    }}
                    className={`mt-1.5 h-11 ${fieldErrors.city ? "border-destructive" : ""}`}
                  />
                  <FieldAlert message={fieldErrors.city} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    required
                    value={state}
                    aria-invalid={Boolean(fieldErrors.state)}
                    onChange={(e) => {
                      setState(e.target.value);
                      clearFieldError("state");
                    }}
                    className={`mt-1.5 h-11 ${fieldErrors.state ? "border-destructive" : ""}`}
                  />
                  <FieldAlert message={fieldErrors.state} />
                </div>
                <div>
                  <Label htmlFor="pincode">PIN code</Label>
                  <Input
                    id="pincode"
                    required
                    inputMode="numeric"
                    value={pincode}
                    aria-invalid={Boolean(fieldErrors.pincode)}
                    onChange={(e) => {
                      setPincode(e.target.value);
                      clearFieldError("pincode");
                    }}
                    className={`mt-1.5 h-11 ${fieldErrors.pincode ? "border-destructive" : ""}`}
                  />
                  <FieldAlert message={fieldErrors.pincode} />
                </div>
              </div>
            )}
          </section>

          <section className="min-w-0 border border-border bg-paper p-5 sm:p-7">
            <StepTitle n={3}>Payment</StepTitle>
            <div className="mt-4 flex items-start gap-3 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0" strokeWidth={1.4} aria-hidden />
              <p className="text-muted-foreground">
                Pay by <span className="text-foreground">UPI, card or netbanking</span> in
                Cashfree&apos;s secure window. Your order is confirmed and stock is held only once
                payment succeeds.
              </p>
            </div>
          </section>
        </div>

        <aside className="h-fit min-w-0 border border-border bg-paper p-5 sm:p-7 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 className="flex items-baseline justify-between gap-3">
            <span className="text-[0.74rem] font-medium tracking-[0.18em] uppercase">
              Order summary
            </span>
            <span className="text-sm text-muted-foreground">
              {lines.reduce((sum, line) => sum + line.quantity, 0)} item
              {lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"}
            </span>
          </h2>
          <ul className="mt-5 space-y-4">
            {member.lines.map((line) => (
              <li key={line.key} className="flex gap-3.5 text-sm">
                <span className="relative shrink-0">
                  <img
                    src={cdnImageUrl(line.image)}
                    alt=""
                    className="aspect-[2/3] w-14 bg-muted object-cover"
                  />
                  <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-ink text-[0.62rem] text-white">
                    {line.quantity}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8rem] font-medium tracking-[0.08em] uppercase">
                    {line.name}
                  </p>
                  <p className="text-muted-foreground">
                    {line.color} · {line.size}
                  </p>
                  <p className="mt-1 font-semibold text-teal">
                    {line.isMemberPriced ? (
                      <span className="flex flex-col">
                        <span className="text-xs font-normal text-muted-foreground line-through">
                          {formatInr(line.regularUnitPrice * line.quantity)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {formatInr(line.lineTotal)}
                          <span className="bg-ink px-1 py-0.5 text-[0.52rem] font-normal tracking-[0.14em] text-white uppercase">
                            Insider
                          </span>
                        </span>
                      </span>
                    ) : hasOffer && !couponQuote?.ok ? (
                      <span className="flex flex-col">
                        <span className="text-xs font-normal text-muted-foreground line-through">
                          {formatInr(line.lineTotal)}
                        </span>
                        <span>
                          {formatInr(
                            (line.unitPrice - istefadaUnitOff(line.unitPrice)) * line.quantity,
                          )}
                        </span>
                      </span>
                    ) : (
                      formatInr(line.lineTotal)
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            {!couponOpen && !couponInput ? (
              <button
                type="button"
                onClick={() => setCouponOpen(true)}
                className="pb-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Have a coupon code?
              </button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    setCouponQuote(null);
                  }}
                  placeholder="Coupon code"
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={couponBusy || !couponInput.trim()}
                  onClick={() => void applyCoupon()}
                  className="h-11 shrink-0"
                >
                  {couponBusy ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {couponQuote && !couponQuote.ok ? (
              <p className="text-xs text-destructive">
                {couponQuote.error || "This coupon is not valid."}
              </p>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>Free</span>
            </div>
            {memberSavings > 0 ? (
              <div className="flex justify-between">
                <span>AB Insider prices</span>
                <span>-{formatInr(memberSavings)}</span>
              </div>
            ) : null}
            {couponSavings > 0 ? (
              <div className="flex justify-between text-teal">
                <span>{previewCode || "Discount"}</span>
                <span>-{formatInr(couponSavings)}</span>
              </div>
            ) : null}
            {bundleSavings > 0 ? (
              <div className="flex justify-between text-teal">
                <span>{appliedBundle?.title || "Bundle"}</span>
                <span>-{formatInr(bundleSavings)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-teal">{formatInr(priceNotice?.total ?? total)}</span>
            </div>
          </div>
          {priceNotice ? (
            <div className="mt-4 border border-ink bg-paper p-4 text-sm" role="alert">
              <p className="font-medium">Your total has changed</p>
              <p className="mt-1 text-muted-foreground">
                Prices were updated since you opened checkout (for example, a membership ended or a
                price changed). The new total is{" "}
                <b className="font-medium text-foreground">{formatInr(priceNotice.total)}</b>. Pay
                below to continue at this price.
              </p>
            </div>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {issues.length ? (
            <>
              <ul className="mt-3 space-y-2 text-sm text-destructive" role="alert">
                {issues.map((issue) => (
                  <li
                    key={`${issue.key}-${issue.type}`}
                    className="border border-destructive/30 bg-background px-3 py-2"
                  >
                    <p className="font-medium">{formatCartIssue(issue)}</p>
                    <p className="mt-1 text-xs leading-relaxed">{issue.message}</p>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                onClick={openCart}
                className="mt-3 h-11 w-full text-xs font-semibold tracking-[0.12em] uppercase"
              >
                Review cart
              </Button>
            </>
          ) : null}
          <Button
            ref={payRef}
            type="submit"
            disabled={submitting}
            className="mt-6 h-13 w-full bg-ink text-[0.78rem] font-normal tracking-[0.18em] text-white uppercase hover:bg-[#333]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {paying ? "Waiting for payment..." : "Confirming payment..."}
              </>
            ) : total > 0 ? (
              payLabel
            ) : (
              "Place order"
            )}
          </Button>
          <ul className="mt-5 grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-2.5">
              <Lock className="size-3.5 shrink-0" strokeWidth={1.4} aria-hidden />
              Secure prepaid checkout by Cashfree
            </li>
            <li className="flex items-center gap-2.5">
              <Truck className="size-3.5 shrink-0" strokeWidth={1.4} aria-hidden />
              Free shipping · dispatch in 2–3 business days
            </li>
            <li className="flex items-center gap-2.5">
              <RefreshCw className="size-3.5 shrink-0" strokeWidth={1.4} aria-hidden />
              Exchange on defects or wrong items within 2 days
            </li>
          </ul>
        </aside>
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md transition-transform duration-200 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden",
            payInView ? "pointer-events-none translate-y-full" : "translate-y-0",
          )}
          aria-hidden={payInView}
        >
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full bg-teal text-sm font-semibold tracking-[0.08em] text-teal-foreground uppercase"
          >
            {submitting
              ? paying
                ? "Waiting for payment..."
                : "Confirming payment..."
              : total > 0
                ? payLabel
                : "Place order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
