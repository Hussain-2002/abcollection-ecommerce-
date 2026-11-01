"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { BrandLockup } from "@/components/site/Brand";
import { FormAlert } from "@/components/site/FormAlert";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";
import { LEGAL_NAV_LINKS } from "@/lib/legal/content";
import { fbqTrack } from "@/lib/meta-pixel";
import { SITE_EMAIL, SITE_INSTAGRAM } from "@/lib/site";
import { HELP_LINKS } from "@/lib/storefront";

const SHOP_LINKS = [
  { href: "/collection", label: "New arrivals" },
  { href: "/collection", label: "Shop all" },
  { href: "/about", label: "Our story" },
  { href: "/journey", label: "Founder's journey" },
  { href: "/membership", label: "AB Insider membership" },
  { href: "/account/orders", label: "My orders" },
  { href: "/account/wishlist", label: "Wishlist" },
];

const ACCOUNT_PATH = /^\/account(\/|$)/;

export function SiteFooter() {
  const { customer, openAuth } = useCommerce();
  // Account pages need a login: logged-out shoppers get the login panel in place.
  const guardAccount = (href: string) =>
    !customer && ACCOUNT_PATH.test(href)
      ? (event: React.MouseEvent) => {
          event.preventDefault();
          openAuth({ type: "generic", redirect: href });
        }
      : undefined;

  return (
    <footer>
      <Newsletter />
      <div className="page-wrap pt-[clamp(3rem,6vw,5rem)] pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <BrandLockup className="w-36" />
            <p className="mt-5 max-w-[36ch] text-sm text-muted-foreground">
              Premium everyday essentials. Heavyweight cotton, timeless cuts, honest pricing. Made
              in India.
            </p>
          </div>
          <FooterColumn title="Shop">
            {SHOP_LINKS.map((link) => (
              <FooterLink key={link.label} href={link.href} onClick={guardAccount(link.href)}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>
          <FooterColumn title="Help">
            {HELP_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>
          <FooterColumn title="Contact">
            <a
              href={`mailto:${SITE_EMAIL}`}
              className="block py-1 text-sm break-all text-charcoal underline-offset-4 hover:text-foreground hover:underline"
            >
              {SITE_EMAIL}
            </a>
            <a
              href={SITE_INSTAGRAM}
              target="_blank"
              rel="noreferrer noopener"
              className="block py-1 text-sm text-charcoal underline-offset-4 hover:text-foreground hover:underline"
            >
              Instagram
            </a>
            <div className="mt-4 grid">
              {LEGAL_NAV_LINKS.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </FooterColumn>
        </div>

        <p
          aria-hidden
          className="editorial mt-12 mb-6 overflow-hidden text-[clamp(3.4rem,15vw,14rem)] leading-[0.85] tracking-[-0.03em] whitespace-nowrap text-ink"
        >
          AB Collection
        </p>

        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} AB Collection · Made in India</span>
          <span>
            Designed and developed by{" "}
            <a
              href="https://hussainiitservices.com"
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Hussainiitservices.com
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-[0.7rem] font-medium tracking-[0.2em] uppercase">{title}</p>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: ((event: React.MouseEvent) => void) | undefined;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className="block py-1 text-sm text-charcoal underline-offset-4 hover:text-foreground hover:underline"
    >
      {children}
    </Link>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await readJsonBody<{ error?: string }>(res);
      if (!res.ok) {
        const nextError = apiErrorMessage(payload, "Could not subscribe. Please try again.");
        setError(nextError);
        toast.error(nextError);
        return;
      }
      fbqTrack("Lead", { content_name: "Footer newsletter" });
      setDone(true);
      setEmail("");
    } catch {
      const nextError = "Could not subscribe. Please try again.";
      setError(nextError);
      toast.error(nextError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="bg-ink py-[clamp(3.5rem,8vw,7rem)] text-center text-ink-foreground"
      aria-labelledby="newsletter-heading"
    >
      <div className="page-wrap">
        <p className="text-[0.72rem] tracking-[0.22em] text-[#bdb7ad] uppercase">The list</p>
        <h2
          id="newsletter-heading"
          className="editorial mt-3 text-[clamp(2rem,4.5vw,3.8rem)] leading-none"
        >
          Join the first wave.
        </h2>
        <p className="mx-auto mt-4 mb-7 max-w-[48ch] text-[#bdb7ad]">
          New drops and restocks by email, before anyone else hears about them.
        </p>
        {done ? (
          <p className="text-white" role="status">
            You&apos;re on the list. Watch your inbox.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            aria-busy={loading}
            className="mx-auto flex max-w-[520px] border-b border-ink-foreground"
          >
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="min-h-12 min-w-0 flex-1 bg-transparent py-4 text-base font-light text-white outline-none placeholder:text-[#8f897f]"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center gap-2 px-1.5 text-[0.74rem] tracking-[0.2em] text-white uppercase disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Subscribe →
            </button>
          </form>
        )}
        <div className="mx-auto mt-3 max-w-[520px]">
          <FormAlert error={error} />
        </div>
      </div>
    </section>
  );
}
