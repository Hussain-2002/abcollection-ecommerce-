"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Search, ShoppingBag, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { BrandLogo } from "@/components/site/Brand";
import { useCatalog } from "@/components/site/CatalogProvider";
import { ProductImage } from "@/components/site/ProductImage";
import { SearchOverlay } from "@/components/site/SearchOverlay";
import { SITE_EMAIL, SITE_INSTAGRAM } from "@/lib/site";
import {
  HELP_LINKS,
  bestsellers,
  productHref,
  productModelImage,
  titleCase,
} from "@/lib/storefront";
import { cn } from "@/lib/utils";

const iconButton =
  "relative inline-grid size-11 place-items-center transition-opacity hover:opacity-70";

export function SiteHeader() {
  const pathname = usePathname();
  const { customer, cartCount, openAuth, wishlist, openCart } = useCommerce();
  const { products } = useCatalog();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overHero = pathname === "/";
  const solid = !overHero || scrolled || menuOpen || megaOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const locked = menuOpen || searchOpen;
    document.documentElement.style.overflow = locked ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (!megaOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMegaOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [megaOpen, menuOpen]);

  const openMega = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setMegaOpen(true);
  };
  const closeMegaSoon = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => setMegaOpen(false), 120);
  };

  /** Account pages need a login: logged-out shoppers get the login panel in place. */
  const goAccount = (redirect: string) => (event: React.MouseEvent) => {
    setMegaOpen(false);
    if (customer) return;
    event.preventDefault();
    setMenuOpen(false);
    openAuth({ type: "generic", redirect });
  };

  const featured = bestsellers(products).slice(0, 2);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 h-[var(--header-h)] border-b transition-[background-color,border-color,color] duration-300",
          solid
            ? "border-border bg-background/95 text-foreground backdrop-blur-md"
            : "border-transparent bg-transparent text-white",
        )}
        onMouseLeave={closeMegaSoon}
      >
        <div className="page-wrap grid h-full grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(iconButton, "-ml-2.5 lg:hidden")}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Burger open={menuOpen} />
            </button>
            <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
              <NavLink href="/collection" active={pathname === "/collection"}>
                New in
              </NavLink>
              <button
                type="button"
                className="nav-underline relative py-2.5 text-[0.76rem] tracking-[0.16em] uppercase"
                aria-expanded={megaOpen}
                aria-controls="mega-menu"
                onMouseEnter={openMega}
                onFocus={openMega}
                onClick={() => setMegaOpen((open) => !open)}
              >
                Shop
              </button>
              <NavLink href="/about" active={pathname === "/about"}>
                Our story
              </NavLink>
              <NavLink href="/journey" active={pathname === "/journey"}>
                Journey
              </NavLink>
            </nav>
          </div>

          <Link href="/" aria-label="AB Collection home" className="flex justify-center">
            <BrandLogo light={!solid} />
          </Link>

          <div className="-mr-2.5 flex items-center justify-end">
            <button
              type="button"
              className={iconButton}
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" strokeWidth={1.4} />
            </button>
            <Link
              href="/account"
              aria-label="Account"
              onClick={goAccount("/account")}
              className={cn(iconButton, "hidden lg:inline-grid")}
            >
              <User className="size-5" strokeWidth={1.4} />
            </Link>
            <Link
              href="/account/wishlist"
              aria-label={wishlist.length ? `Wishlist, ${wishlist.length} saved` : "Wishlist"}
              onClick={goAccount("/account/wishlist")}
              className={cn(iconButton, "hidden sm:inline-grid")}
            >
              <Heart className="size-5" strokeWidth={1.4} />
              {wishlist.length ? <Count value={wishlist.length} inverted={!solid} /> : null}
            </Link>
            <button
              type="button"
              aria-label={cartCount ? `Open bag, ${cartCount} items` : "Open bag"}
              onClick={openCart}
              className={iconButton}
            >
              <ShoppingBag className="size-5" strokeWidth={1.4} />
              {cartCount ? <Count value={cartCount} inverted={!solid} /> : null}
            </button>
          </div>
        </div>

        <div
          id="mega-menu"
          onMouseEnter={openMega}
          onMouseLeave={closeMegaSoon}
          className={cn(
            "absolute inset-x-0 top-full hidden border-b border-border bg-background text-foreground transition-[opacity,transform,visibility] duration-300 ease-[var(--ease-brand)] lg:block",
            megaOpen
              ? "visible translate-y-0 opacity-100"
              : "pointer-events-none invisible -translate-y-2 opacity-0",
          )}
        >
          <div className="page-wrap grid grid-cols-[1fr_1fr_1fr_1.4fr] gap-10 pt-9 pb-10">
            <MegaColumn title="Shop">
              <MegaLink href="/collection" onClick={() => setMegaOpen(false)}>
                All products
              </MegaLink>
              {products.map((product) => (
                <MegaLink
                  key={product.id}
                  href={productHref(product)}
                  onClick={() => setMegaOpen(false)}
                >
                  {titleCase(product.name)}
                </MegaLink>
              ))}
            </MegaColumn>
            <MegaColumn title="Help">
              {HELP_LINKS.map((link) => (
                <MegaLink key={link.href} href={link.href} onClick={() => setMegaOpen(false)}>
                  {link.label}
                </MegaLink>
              ))}
            </MegaColumn>
            <MegaColumn title="Account">
              <MegaLink href="/account" onClick={goAccount("/account")}>
                {customer ? "My account" : "Login / Sign up"}
              </MegaLink>
              <MegaLink href="/account/orders" onClick={goAccount("/account/orders")}>
                My orders
              </MegaLink>
              <MegaLink href="/account/wishlist" onClick={goAccount("/account/wishlist")}>
                Wishlist
              </MegaLink>
              <MegaLink href="/membership" onClick={() => setMegaOpen(false)}>
                AB Insider membership
              </MegaLink>
              <MegaLink href="/about" onClick={() => setMegaOpen(false)}>
                Our story
              </MegaLink>
              <MegaLink href="/journey" onClick={() => setMegaOpen(false)}>
                Founder&apos;s journey
              </MegaLink>
            </MegaColumn>
            <div className="grid grid-cols-2 gap-3">
              {featured.map((product) => (
                <Link
                  key={product.id}
                  href={productHref(product)}
                  onClick={() => setMegaOpen(false)}
                  className="group block"
                >
                  <div className="aspect-[2/3] overflow-hidden bg-sand">
                    <ProductImage
                      src={productModelImage(product, product.colors[0] ?? "")}
                      alt={titleCase(product.name)}
                      width={600}
                      height={900}
                      sizes="200px"
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <span className="mt-2 block text-[0.72rem] tracking-[0.14em] uppercase">
                    {product.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-x-0 top-[var(--header-h)] bottom-0 z-[39] flex flex-col overflow-y-auto bg-background px-[var(--page-pad)] pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] transition-[opacity,visibility] duration-200 lg:hidden",
          menuOpen ? "visible opacity-100" : "pointer-events-none invisible opacity-0",
        )}
        aria-hidden={!menuOpen}
      >
        <nav aria-label="Mobile">
          <BigLink href="/collection" note={`${products.length} pieces`}>
            New in
          </BigLink>
          <BigLink href="/collection">Shop all</BigLink>
          <BigLink href="/about">Our story</BigLink>
          <BigLink href="/membership" note="Member prices">
            AB Insider
          </BigLink>
          <BigLink href="/journey" note="Built in public">
            Journey
          </BigLink>
          <BigLink href="/track-order">Track order</BigLink>
          <BigLink href="/account" onClick={goAccount("/account")}>
            {customer ? "Account" : "Login"}
          </BigLink>
          <BigLink href="/account/wishlist" onClick={goAccount("/account/wishlist")}>
            Wishlist
          </BigLink>
        </nav>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {HELP_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="py-1.5">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="mt-auto grid gap-1.5 pt-8 text-sm text-muted-foreground">
          <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>
          <a href={SITE_INSTAGRAM} target="_blank" rel="noreferrer noopener">
            Instagram · @abcollection.co.in
          </a>
        </div>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="nav-underline relative py-2.5 text-[0.76rem] tracking-[0.16em] uppercase"
    >
      {children}
    </Link>
  );
}

function MegaColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="grid gap-1.5">{children}</ul>
    </div>
  );
}

function MegaLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="text-[0.95rem] underline-offset-4 hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}

function BigLink({
  href,
  note,
  onClick,
  children,
}: {
  href: string;
  note?: string;
  onClick?: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className="flex items-center justify-between border-b border-border py-2.5 text-[clamp(1.8rem,8vw,2.4rem)] leading-tight font-light"
    >
      {children}
      {note ? (
        <small className="text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
          {note}
        </small>
      ) : null}
    </Link>
  );
}

function Count({ value, inverted }: { value: number; inverted: boolean }) {
  return (
    <span
      className={cn(
        "absolute top-1.5 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.6rem] leading-none",
        inverted ? "bg-white text-ink" : "bg-ink text-white",
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function Burger({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3.5 w-5" aria-hidden>
      <span
        className={cn(
          "absolute left-0 h-[1.4px] w-5 bg-current transition-transform duration-300",
          open ? "top-1.5 rotate-45" : "top-0",
        )}
      />
      <span
        className={cn(
          "absolute top-1.5 left-0 h-[1.4px] w-5 bg-current transition-opacity",
          open ? "opacity-0" : "opacity-100",
        )}
      />
      <span
        className={cn(
          "absolute left-0 h-[1.4px] w-5 bg-current transition-transform duration-300",
          open ? "top-1.5 -rotate-45" : "top-3",
        )}
      />
    </span>
  );
}
