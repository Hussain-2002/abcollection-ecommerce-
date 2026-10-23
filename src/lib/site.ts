import { CANONICAL_SITE_ORIGIN } from "@/lib/canonical-url";

export const SITE_NAME = "AB Collection";
export const SITE_TAGLINE = "Premium Everyday Essentials";
export const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "") || "https://abcollection.co.in";
export const PRODUCTION_SITE_URL = CANONICAL_SITE_ORIGIN;
export const WHOLESALE_STORE_URL =
  process.env["NEXT_PUBLIC_WHOLESALE_URL"]?.replace(/\/$/, "") || "https://abcollection.mrch.in";
export const WHOLESALE_PATH = "/wholesale";
export const WHOLESALE_REDIRECT_HOSTS = [
  "abcollection.mrch.in",
  "www.abcollection.mrch.in",
] as const;
export const SITE_EMAIL = "abcollection.co.in@gmail.com";
export const SITE_INSTAGRAM = "https://instagram.com/abcollection.co.in";
export const SITE_LOCALE = "en_IN";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/collection", label: "Collection" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const FAQS = [
  {
    question: "Can I order now?",
    answer:
      "Yes. Choose a colour and an in-stock size, add it to your cart, and check out. The order is confirmed after payment succeeds.",
  },
  {
    question: "How do I pay?",
    answer:
      "Checkout is prepaid through Cashfree. You can pay by UPI, card, or netbanking. Cash on delivery is not available.",
  },
  {
    question: "When am I charged?",
    answer:
      "Only after you finish payment. Closing the payment window does not charge you, and stock is held only once the payment succeeds.",
  },
  {
    question: "Can I order more than one product?",
    answer:
      "Yes. Add each piece to your cart. If your cart includes a bundle set, that bundle saving is applied once at checkout.",
  },
  {
    question: "How do I know my size is in stock?",
    answer:
      "Each product shows the colours and sizes that can be bought. A size that is out of stock cannot be added to the cart.",
  },
  {
    question: "How much is shipping?",
    answer: "Shipping is free. The delivery window is shown on the product page and again with your order.",
  },
  {
    question: "How will you use my details?",
    answer:
      "To create your account, deliver the order, and send order updates. We never sell your data.",
  },
] as const;
