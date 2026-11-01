"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Crown,
  Heart,
  LifeBuoy,
  LogOut,
  MapPin,
  Package,
  Settings,
} from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useMembership } from "@/components/membership/MembershipProvider";
import { Button } from "@/components/ui/button";
import { useLiveOrders } from "@/hooks/use-live-orders";
import { ORDER_STATUS_LABELS } from "@/lib/commerce-constants";
import { daysLeft, formatIstDate } from "@/lib/membership";
import { formatInr } from "@/lib/price";
import { cn } from "@/lib/utils";

const press =
  "transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "AB";
}

function memberSince(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function AccountPage() {
  const { customer, loading, openAuth, logout, wishlist, cartCount } = useCommerce();
  const { snapshot, open, isMember } = useMembership();
  const { orders, ready } = useLiveOrders(Boolean(customer));
  const router = useRouter();

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account" });
  }, [customer, loading, openAuth]);

  if (loading) {
    return (
      <div className="page-wrap mx-auto max-w-4xl py-[clamp(2.5rem,6vw,4rem)]">
        <div className="skeleton h-24 w-full max-w-md" />
        <div className="skeleton mt-8 h-28" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-24" />
          ))}
        </div>
      </div>
    );
  }
  if (!customer) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="editorial text-4xl">My account</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to view your profile and orders.
        </p>
        <Button
          onClick={() => openAuth({ type: "generic", redirect: "/account" })}
          className="mt-6 h-12 px-8 text-[0.74rem] font-normal tracking-[0.18em] uppercase"
        >
          Log in / Sign up
        </Button>
      </div>
    );
  }

  const latest = orders[0];
  const membership = snapshot?.membership ?? null;
  const showMembership = isMember || open || Boolean(membership);
  const planName = snapshot?.settings.planName ?? "AB Insider";

  const sections = [
    {
      href: "/account/orders",
      icon: Package,
      title: "Orders",
      body: orders.length
        ? `${orders.length} order${orders.length === 1 ? "" : "s"} · track, view and download invoices`
        : "Track and view your orders",
    },
    {
      href: "/account/wishlist",
      icon: Heart,
      title: "Wishlist",
      body: wishlist.length
        ? `${wishlist.length} saved piece${wishlist.length === 1 ? "" : "s"}`
        : "Save pieces for later",
    },
    {
      href: "/account/settings",
      icon: Settings,
      title: "Profile & addresses",
      body: "Name, phone and delivery addresses",
    },
    {
      href: "/account/membership",
      icon: Crown,
      title: `${planName} membership`,
      body: isMember ? "Your card, dates and benefits" : "Member prices on selected pieces",
    },
    {
      href: "/track-order",
      icon: MapPin,
      title: "Track an order",
      body: "Follow a delivery with your order number",
    },
    { href: "/contact", icon: LifeBuoy, title: "Help", body: "Sizing, delivery and exchanges" },
  ];

  return (
    <div className="page-wrap mx-auto max-w-4xl py-[clamp(2.5rem,6vw,4rem)]">
      <header className="flex flex-wrap items-center gap-5">
        <span
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-full bg-ink text-lg tracking-[0.06em] text-white sm:size-20 sm:text-xl"
        >
          {initials(customer.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            My account
            {customer.createdAt ? ` · member since ${memberSince(customer.createdAt)}` : ""}
          </p>
          <h1 className="editorial mt-2 truncate text-[clamp(2rem,5vw,3.2rem)] leading-none">
            {customer.fullName}
          </h1>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="break-all">{customer.email}</span>
            <span aria-hidden>·</span>
            <span>{customer.phone}</span>
            <Link href="/account/settings" className="text-foreground underline underline-offset-4">
              Edit
            </Link>
          </p>
        </div>
      </header>

      {showMembership ? (
        <Link
          href="/account/membership"
          className={cn(
            "group mt-8 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6",
            isMember ? "bg-ink text-white" : "border border-border bg-paper hover:border-ink",
            press,
          )}
        >
          <span className="flex items-center gap-4">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full",
                isMember ? "bg-white/10" : "bg-muted",
              )}
            >
              <Crown className="size-4" strokeWidth={1.5} />
            </span>
            <span>
              <span className="block text-[0.7rem] tracking-[0.18em] uppercase opacity-70">
                {planName}
              </span>
              <span className="mt-0.5 block">
                {isMember && membership
                  ? `Active until ${formatIstDate(membership.expiresAt)} · ${daysLeft(membership.expiresAt)} days left`
                  : membership?.status === "pending_payment"
                    ? "Payment being confirmed"
                    : "Join for member prices on selected pieces"}
              </span>
            </span>
          </span>
          <ArrowRight className="size-4 transition-transform duration-200 can-hover:group-hover:translate-x-1" />
        </Link>
      ) : null}

      <dl className="mt-6 grid grid-cols-3 border-t border-l border-border">
        {[
          ["Orders", ready ? String(orders.length) : "—", "/account/orders"],
          ["Wishlist", String(wishlist.length), "/account/wishlist"],
          ["In bag", String(cartCount), "/cart"],
        ].map(([label, value, href]) => (
          <Link
            key={label}
            href={href!}
            className="border-r border-b border-border p-4 transition-colors hover:bg-paper sm:p-5"
          >
            <dt className="text-[0.66rem] tracking-[0.16em] text-muted-foreground uppercase">
              {label}
            </dt>
            <dd className="editorial mt-1 text-[clamp(1.6rem,4vw,2.2rem)] leading-none">{value}</dd>
          </Link>
        ))}
      </dl>

      {latest ? (
        <section className="mt-8" aria-labelledby="recent-order">
          <h2
            id="recent-order"
            className="text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase"
          >
            Most recent order
          </h2>
          <Link
            href={`/account/orders/${encodeURIComponent(latest.orderNumber)}`}
            className={cn(
              "group mt-3 flex items-center gap-4 border border-border bg-paper p-4 hover:border-ink",
              press,
            )}
          >
            {latest.items[0]?.productImage ? (
              <img
                src={latest.items[0].productImage}
                alt=""
                className="aspect-[2/3] w-12 shrink-0 bg-muted object-cover"
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block font-medium">#{latest.orderNumber}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {formatIstDate(latest.createdAt)} · {latest.items.length} item
                {latest.items.length === 1 ? "" : "s"} · {formatInr(latest.totalAmount)}
              </span>
            </span>
            <span className="hidden border border-border px-2 py-1 text-[0.62rem] tracking-[0.14em] uppercase sm:inline">
              {ORDER_STATUS_LABELS[latest.orderStatus] ?? latest.orderStatus}
            </span>
            <ArrowRight className="size-4 shrink-0 transition-transform duration-200 can-hover:group-hover:translate-x-1" />
          </Link>
        </section>
      ) : null}

      <nav aria-label="Account sections" className="mt-8 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "group flex items-start gap-4 border border-border bg-paper p-5 hover:border-ink",
              press,
            )}
          >
            <section.icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.4} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{section.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{section.body}</span>
            </span>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 can-hover:group-hover:translate-x-1 can-hover:group-hover:text-foreground" />
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => {
          void logout();
          router.push("/");
        }}
        className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <LogOut className="size-4" strokeWidth={1.4} />
        Log out
      </button>
    </div>
  );
}
