/**
 * Branded transactional email HTML, styled after the storefront:
 * ink #111111 on bone #F6F5F2, white cards, Bodoni headlines, Jost body, square corners.
 * Table layout + inline styles only, so it renders in Gmail, Outlook and Apple Mail.
 */
import { CANONICAL_SITE_ORIGIN } from "@/lib/canonical-url";
import type { Order } from "@/lib/commerce-types";
import { LEGAL_CONTACT } from "@/lib/legal/contact";
import type { NotificationEventType } from "@/lib/notifications";
import { formatInr } from "@/lib/price";
import { SITE_EMAIL, SITE_INSTAGRAM, SITE_NAME, SITE_URL } from "@/lib/site";

const C = {
  ink: "#111111",
  charcoal: "#3b3935",
  bone: "#f6f5f2",
  paper: "#ffffff",
  sand: "#ebe6dd",
  muted: "#6b6862",
  line: "#e4e0d9",
  gold: "#b8975a",
};
const SERIF = "'Bodoni Moda', Didot, 'Bodoni 72', Georgia, 'Times New Roman', serif";
const SANS = "Jost, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// Images must be publicly reachable from the inbox, so always use production.
const LOGO_URL = `${CANONICAL_SITE_ORIGIN}/brand/ab-lockup-md.png`;
const MONOGRAM_LIGHT_URL = `${CANONICAL_SITE_ORIGIN}/brand/ab-monogram-light-sm.png`;

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function siteLink(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function absoluteImage(src: string | null | undefined) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  return `${CANONICAL_SITE_ORIGIN}${src.startsWith("/") ? src : `/${src}`}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

/* ───────────────────────── building blocks ───────────────────────── */

function eyebrow(text: string) {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:11px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;color:${C.muted};">${escapeHtml(text)}</p>`;
}

function heading(text: string) {
  return `<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:32px;line-height:1.15;font-weight:400;letter-spacing:-0.01em;color:${C.ink};">${escapeHtml(text)}</h1>`;
}

function paragraph(html: string) {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.charcoal};">${html}</p>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr><td bgcolor="${C.ink}" style="background:${C.ink};">
    <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:12px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

function sectionTitle(text: string) {
  return `<p style="margin:0 0 12px;font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink};">${escapeHtml(text)}</p>`;
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:1px;line-height:1px;font-size:0;background:${C.line};">&nbsp;</td></tr></table>`;
}

function spacer(px: number) {
  return `<div style="height:${px}px;line-height:${px}px;font-size:0;">&nbsp;</div>`;
}

/** Label / value rows, e.g. carrier + tracking number. */
function detailTable(rows: [string, string][]) {
  const body = rows
    .map(
      ([label, value]) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:13px;color:${C.muted};vertical-align:top;width:42%;">${escapeHtml(label)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;color:${C.ink};text-align:right;vertical-align:top;word-break:break-word;">${value}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table>`;
}

/** A sand-tinted panel used for codes and key facts. */
function panel(inner: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px;">
  <tr><td bgcolor="${C.bone}" style="background:${C.bone};border:1px solid ${C.line};padding:22px 24px;">${inner}</td></tr>
</table>`;
}

/* ───────────────────────── page shell ───────────────────────── */

type LayoutInput = {
  /** Hidden inbox preview line. */
  preheader: string;
  /** Main card content (already HTML). */
  content: string;
  /** Optional extra card below the main one, e.g. the order summary. */
  after?: string;
  /** Small print under the footer links. */
  footnote?: string;
};

export function emailLayout({ preheader, content, after = "", footnote }: LayoutInput) {
  const year = new Date().getFullYear();
  const footerLink = (label: string, href: string) =>
    `<a href="${escapeHtml(href)}" target="_blank" style="color:${C.ink};text-decoration:underline;text-underline-offset:3px;">${escapeHtml(label)}</a>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(SITE_NAME)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500&family=Jost:wght@300;400;500&display=swap');
  body { margin:0; padding:0; background:${C.bone}; }
  a { color:${C.ink}; }
  @media only screen and (max-width:620px) {
    .ab-container { width:100% !important; }
    .ab-pad { padding-left:24px !important; padding-right:24px !important; }
    .ab-h1 h1 { font-size:27px !important; }
    .ab-wordmark { font-size:40px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.bone};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.bone};">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bone}" style="background:${C.bone};">
<tr><td align="center" style="padding:0;">

  <!-- announcement bar -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ink}" style="background:${C.ink};">
    <tr><td align="center" style="padding:10px 16px;font-family:${SANS};font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#f1efea;">Free shipping across India &nbsp;·&nbsp; Made in India</td></tr>
  </table>

  <table role="presentation" class="ab-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
    <!-- logo -->
    <tr><td align="center" style="padding:36px 24px 28px;">
      <a href="${escapeHtml(SITE_URL)}" target="_blank" style="text-decoration:none;">
        <img src="${LOGO_URL}" width="132" alt="AB Collection · Comfort everyday" style="display:block;width:132px;height:auto;border:0;outline:none;font-family:${SERIF};font-size:22px;color:${C.ink};" />
      </a>
    </td></tr>

    <!-- main card -->
    <tr><td class="ab-pad ab-h1" bgcolor="${C.paper}" style="background:${C.paper};border:1px solid ${C.line};padding:44px 48px 40px;">
      ${content}
    </td></tr>
    ${after ? `<tr><td style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>\n    <tr><td class="ab-pad" bgcolor="${C.paper}" style="background:${C.paper};border:1px solid ${C.line};padding:36px 48px;">${after}</td></tr>` : ""}

    <!-- promise strip -->
    <tr><td style="padding:28px 8px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${["Free shipping", "Exchange assurance", "Secure checkout"]
            .map(
              (label) =>
                `<td align="center" width="33%" style="font-family:${SANS};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.muted};padding:6px 4px;">${label}</td>`,
            )
            .join("")}
        </tr>
      </table>
    </td></tr>

    <!-- footer -->
    <tr><td class="ab-pad" align="center" style="padding:28px 48px 8px;font-family:${SANS};font-size:13px;line-height:1.7;color:${C.charcoal};">
      Questions? Reply to this email or write to ${footerLink(SITE_EMAIL, `mailto:${SITE_EMAIL}`)}<br />
      Call / WhatsApp ${footerLink(LEGAL_CONTACT.phone, `tel:${LEGAL_CONTACT.phone.replace(/\s/g, "")}`)}
    </td></tr>
    <tr><td align="center" style="padding:10px 24px 0;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
      ${footerLink("Shop", siteLink("/collection"))} &nbsp;&nbsp;·&nbsp;&nbsp;
      ${footerLink("Track order", siteLink("/track-order"))} &nbsp;&nbsp;·&nbsp;&nbsp;
      ${footerLink("Returns", siteLink("/returns"))} &nbsp;&nbsp;·&nbsp;&nbsp;
      ${footerLink("Instagram", SITE_INSTAGRAM)}
    </td></tr>
    <tr><td align="center" class="ab-wordmark" style="padding:34px 12px 6px;font-family:${SERIF};font-size:52px;line-height:1;letter-spacing:-0.03em;color:${C.ink};white-space:nowrap;">AB Collection</td></tr>
    <tr><td align="center" style="padding:0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="48" style="border-top:1px solid ${C.gold};font-size:0;line-height:0;">&nbsp;</td>
        <td style="padding:0 12px;font-family:${SANS};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${C.muted};">Comfort everyday</td>
        <td width="48" style="border-top:1px solid ${C.gold};font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:24px 24px 40px;font-family:${SANS};font-size:11px;line-height:1.6;color:${C.muted};">
      ${footnote ? `${footnote}<br />` : ""}© ${year} ${escapeHtml(SITE_NAME)} · Premium everyday essentials · Made in India
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

/* ───────────────────────── order emails ───────────────────────── */

const ORDER_STEPS = ["Placed", "Confirmed", "Dispatched", "Delivered"] as const;

const STEP_FOR_EVENT: Record<NotificationEventType, number> = {
  order_placed: 0,
  payment_confirmed: 1,
  order_confirmed: 1,
  order_processing: 1,
  order_dispatched: 2,
  tracking_available: 2,
  out_for_delivery: 2,
  delivered: 3,
};

/** Four-step progress bar: filled ink up to the current step. */
function progressTracker(activeIndex: number) {
  const cells = ORDER_STEPS.map((label, index) => {
    const done = index <= activeIndex;
    return `<td width="25%" valign="top" style="padding:0 2px;">
  <div style="height:3px;line-height:3px;font-size:0;background:${done ? C.ink : C.line};">&nbsp;</div>
  <p style="margin:10px 0 0;font-family:${SANS};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${done ? C.ink : C.muted};${index === activeIndex ? "font-weight:500;" : ""}">${label}</p>
</td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;"><tr>${cells}</tr></table>`;
}

function itemRows(order: Order) {
  return order.items
    .map((item) => {
      const image = absoluteImage(item.productImage);
      const thumb = image
        ? `<img src="${escapeHtml(image)}" width="72" height="90" alt="" style="display:block;width:72px;height:90px;object-fit:cover;border:0;background:${C.sand};" />`
        : `<div style="width:72px;height:90px;background:${C.sand};"></div>`;
      const meta = [item.color, item.size ? `Size ${item.size}` : "", `Qty ${item.quantity}`]
        .filter(Boolean)
        .map(escapeHtml)
        .join(" &nbsp;·&nbsp; ");
      return `<tr>
  <td width="84" valign="top" style="padding:16px 0;border-bottom:1px solid ${C.line};">${thumb}</td>
  <td valign="top" style="padding:16px 12px;border-bottom:1px solid ${C.line};">
    <p style="margin:0 0 6px;font-family:${SERIF};font-size:17px;line-height:1.3;color:${C.ink};">${escapeHtml(item.productName)}</p>
    <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:0.04em;color:${C.muted};">${meta}</p>
  </td>
  <td valign="top" align="right" style="padding:16px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;color:${C.ink};white-space:nowrap;">${formatInr(item.lineTotal)}</td>
</tr>`;
    })
    .join("");
}

function totalsRows(order: Order) {
  const row = (label: string, value: string, strong = false) =>
    `<tr>
  <td style="padding:6px 0;font-family:${SANS};font-size:${strong ? 15 : 13}px;color:${strong ? C.ink : C.muted};${strong ? "font-weight:500;letter-spacing:0.06em;text-transform:uppercase;" : ""}">${label}</td>
  <td align="right" style="padding:6px 0;font-family:${strong ? SERIF : SANS};font-size:${strong ? 22 : 14}px;color:${C.ink};">${value}</td>
</tr>`;
  const discount = order.discount || (order.couponDiscount ?? 0) + (order.bundleDiscount ?? 0);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
${row("Subtotal", formatInr(order.subtotal))}
${discount > 0 ? row(order.promoCode ? `Discount (${escapeHtml(order.promoCode)})` : "Discount", `−${formatInr(discount)}`) : ""}
${row("Shipping", order.shippingCost > 0 ? formatInr(order.shippingCost) : "Free")}
<tr><td colspan="2" style="padding:8px 0 4px;"><div style="height:1px;line-height:1px;font-size:0;background:${C.ink};">&nbsp;</div></td></tr>
${row("Total", formatInr(order.totalAmount), true)}
</table>`;
}

function addressBlock(order: Order) {
  const lines = [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    `${order.addressCity}, ${order.addressState} ${order.addressPincode}`.trim(),
    order.customerPhone,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .map(escapeHtml)
    .join("<br />");
  return `<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${C.charcoal};">${lines}</p>`;
}

function orderSummary(order: Order) {
  const placed = new Date(order.createdAt);
  const placedLabel = Number.isNaN(placed.getTime())
    ? ""
    : placed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const payment =
    order.paymentStatus === "paid"
      ? `Paid${order.paymentMethod ? ` · ${escapeHtml(order.paymentMethod)}` : ""}`
      : escapeHtml(order.paymentStatus.replaceAll("_", " "));
  const hasAddress = Boolean(order.addressLine1?.trim());

  return `${sectionTitle("Order summary")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="font-family:${SANS};font-size:13px;color:${C.muted};padding-bottom:4px;">Order <span style="color:${C.ink};">${escapeHtml(order.orderNumber)}</span></td>
    <td align="right" style="font-family:${SANS};font-size:13px;color:${C.muted};padding-bottom:4px;">${escapeHtml(placedLabel)}</td>
  </tr>
</table>
${divider()}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${itemRows(order)}</table>
${totalsRows(order)}
${spacer(28)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    ${hasAddress ? `<td valign="top" width="55%" style="padding-right:16px;">${sectionTitle("Delivering to")}${addressBlock(order)}</td>` : ""}
    <td valign="top">${sectionTitle("Payment")}<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${C.charcoal};text-transform:capitalize;">${payment}</p>${
      order.expectedDelivery
        ? `${spacer(14)}${sectionTitle("Estimated delivery")}<p style="margin:0;font-family:${SANS};font-size:14px;color:${C.charcoal};">${escapeHtml(order.expectedDelivery)}</p>`
        : ""
    }</td>
  </tr>
</table>`;
}

function trackingPanel(order: Order) {
  const number = order.trackingNumber?.trim();
  const url = order.trackingUrl?.trim();
  if (!number && !url) return "";
  const rows: [string, string][] = [];
  if (order.carrier?.trim()) rows.push(["Carrier", escapeHtml(order.carrier.trim())]);
  if (number) rows.push(["Tracking number", escapeHtml(number)]);
  return panel(
    `${sectionTitle("Shipment")}${detailTable(rows)}${
      url
        ? `<p style="margin:16px 0 0;font-family:${SANS};font-size:13px;"><a href="${escapeHtml(url)}" target="_blank" style="color:${C.ink};text-decoration:underline;text-underline-offset:3px;">Follow your parcel with ${escapeHtml(order.carrier?.trim() || "the carrier")} →</a></p>`
        : ""
    }`,
  );
}

type OrderCopy = { eyebrow: string; heading: string; intro: string; preheader: string };

function orderCopy(event: NotificationEventType, order: Order): OrderCopy {
  const name = escapeHtml(firstName(order.customerName));
  const num = `<strong style="color:${C.ink};font-weight:500;">${escapeHtml(order.orderNumber)}</strong>`;
  switch (event) {
    case "order_placed":
      return {
        eyebrow: "Order received",
        heading: "Thank you for your order",
        intro: `Hi ${name}, we've received your order ${num}. We're getting it ready and will email you again the moment it leaves our studio.`,
        preheader: `Order ${order.orderNumber} received — total ${formatInr(order.totalAmount)}.`,
      };
    case "payment_confirmed":
      return {
        eyebrow: "Payment received",
        heading: "Your payment is confirmed",
        intro: `Hi ${name}, we've received ${formatInr(order.totalAmount)} for order ${num}. Nothing more to do — we'll take it from here.`,
        preheader: `We've received your payment for order ${order.orderNumber}.`,
      };
    case "order_confirmed":
      return {
        eyebrow: "Order confirmed",
        heading: "Your order is confirmed",
        intro: `Hi ${name}, order ${num} is confirmed and in line to be packed. Most orders are dispatched within 2–3 business days.`,
        preheader: `Order ${order.orderNumber} is confirmed.`,
      };
    case "order_processing":
      return {
        eyebrow: "Being prepared",
        heading: "We're packing your order",
        intro: `Hi ${name}, order ${num} is being checked, folded and packed by hand. We'll share tracking as soon as it ships.`,
        preheader: `Order ${order.orderNumber} is being packed.`,
      };
    case "order_dispatched":
      return {
        eyebrow: "On its way",
        heading: "Your order has shipped",
        intro: `Hi ${name}, good news — order ${num} has left our studio and is on its way to you. Delivery usually takes 5–7 business days.`,
        preheader: `Order ${order.orderNumber} has been dispatched.`,
      };
    case "tracking_available":
      return {
        eyebrow: "Tracking ready",
        heading: "Track your parcel",
        intro: `Hi ${name}, tracking is now live for order ${num}. Use the details below to follow it all the way to your door.`,
        preheader: `Tracking is live for order ${order.orderNumber}.`,
      };
    case "out_for_delivery":
      return {
        eyebrow: "Arriving today",
        heading: "Out for delivery",
        intro: `Hi ${name}, order ${num} is out for delivery and should reach you today. Please keep your phone handy for the courier.`,
        preheader: `Order ${order.orderNumber} arrives today.`,
      };
    case "delivered":
      return {
        eyebrow: "Delivered",
        heading: "Your order has arrived",
        intro: `Hi ${name}, order ${num} has been delivered. We hope it becomes a favourite — and if anything isn't right, we're here to help with an exchange.`,
        preheader: `Order ${order.orderNumber} has been delivered.`,
      };
  }
}

// Works for guests (prefills the order number) and signed-in shoppers alike.
function orderLink(order: Order) {
  return siteLink(`/track-order?order=${encodeURIComponent(order.orderNumber)}`);
}

export function renderOrderEmailHtml(event: NotificationEventType, order: Order) {
  const copy = orderCopy(event, order);
  const showTracking = ["order_dispatched", "tracking_available", "out_for_delivery"].includes(
    event,
  );
  const cta =
    event === "delivered"
      ? button("Write a review", siteLink("/account/orders"))
      : showTracking && order.trackingUrl?.trim()
        ? button("Track your parcel", order.trackingUrl.trim())
        : button("View your order", orderLink(order));

  const content = [
    eyebrow(copy.eyebrow),
    heading(copy.heading),
    paragraph(copy.intro),
    progressTracker(STEP_FOR_EVENT[event]),
    showTracking ? `${spacer(12)}${trackingPanel(order)}` : "",
    cta,
    event === "delivered"
      ? paragraph(
          `<span style="font-size:13px;color:${C.muted};">Need a different size? See our <a href="${siteLink("/returns")}" style="color:${C.ink};">exchange policy</a>.</span>`,
        )
      : "",
  ].join("\n");

  return emailLayout({
    preheader: copy.preheader,
    content,
    after: orderSummary(order),
    footnote: `You're receiving this because you placed order ${escapeHtml(order.orderNumber)} on ${escapeHtml(SITE_NAME)}.`,
  });
}

/* ───────────────────────── account emails ───────────────────────── */

export function renderWelcomeEmail(customer: { fullName: string; email: string }) {
  const name = firstName(customer.fullName);
  const subject = `Welcome to ${SITE_NAME}`;
  const text = [
    `Hi ${name},`,
    "",
    `Welcome to ${SITE_NAME}. Your account is ready — sign in with ${customer.email} to check out faster, save your addresses, keep a wishlist and follow every order.`,
    "",
    `Shop the collection: ${siteLink("/collection")}`,
    "",
    SITE_NAME,
    `${LEGAL_CONTACT.email} · ${LEGAL_CONTACT.phone}`,
  ].join("\n");

  const perks: [string, string][] = [
    ["Faster checkout", "Saved addresses and details, ready when you are."],
    ["Order tracking", "Every order and shipment, in one place."],
    ["Wishlist", "Keep the pieces you love for later."],
  ];
  const perkRows = perks
    .map(
      ([title, body]) => `<tr>
  <td valign="top" width="28" style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:${SERIF};font-size:18px;color:${C.ink};">—</td>
  <td valign="top" style="padding:12px 0;border-bottom:1px solid ${C.line};">
    <p style="margin:0 0 2px;font-family:${SANS};font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:${C.ink};">${title}</p>
    <p style="margin:0;font-family:${SANS};font-size:14px;color:${C.charcoal};">${body}</p>
  </td>
</tr>`,
    )
    .join("");

  const html = emailLayout({
    preheader: "Your AB Collection account is ready.",
    content: [
      eyebrow("Account created"),
      heading(`Welcome, ${name}`),
      paragraph(
        "Thank you for joining AB Collection — premium everyday essentials in heavyweight cotton, timeless cuts and honest pricing, made in India.",
      ),
      paragraph(
        `Your account is ready. Sign in with <strong style="color:${C.ink};font-weight:500;">${escapeHtml(customer.email)}</strong> to enjoy:`,
      ),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0;border-top:1px solid ${C.line};">${perkRows}</table>`,
      button("Shop the collection", siteLink("/collection")),
    ].join("\n"),
    footnote: `You're receiving this because an account was created with ${escapeHtml(customer.email)}. If this wasn't you, please contact us.`,
  });

  return { subject, text, html };
}

export function renderPasswordResetEmail(code: string) {
  const subject = `${SITE_NAME} password reset code`;
  const text = [
    `Your ${SITE_NAME} password reset code is ${code}.`,
    "",
    "It expires in 10 minutes. If you did not ask to reset your password, you can ignore this email.",
  ].join("\n");

  const html = emailLayout({
    preheader: `Your password reset code is ${code}. It expires in 10 minutes.`,
    content: [
      eyebrow("Password reset"),
      heading("Your verification code"),
      paragraph(
        "Use this code to reset your AB Collection password. Enter it on the reset screen to choose a new password.",
      ),
      panel(
        `<p style="margin:0;text-align:center;font-family:${SERIF};font-size:38px;line-height:1.2;letter-spacing:0.32em;color:${C.ink};">${escapeHtml(code)}</p>
<p style="margin:10px 0 0;text-align:center;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.muted};">Expires in 10 minutes</p>`,
      ),
      spacer(12),
      paragraph(
        `<span style="font-size:13px;color:${C.muted};">If you didn't ask to reset your password, you can safely ignore this email — your password won't change. Never share this code with anyone, including our team.</span>`,
      ),
    ].join("\n"),
  });

  return { subject, text, html };
}

/* ───────────────────────── store (internal) emails ───────────────────────── */

/** Internal notification to the store inbox: a clean key/value sheet of the submission. */
export function renderStoreInquiryHtml(input: { type: string; subject: string; lines: string[] }) {
  const rows: string[] = [];
  for (const line of input.lines) {
    const match = /^([^:]{1,40}):\s(.*)$/.exec(line);
    if (!line.trim()) {
      rows.push(spacer(10));
    } else if (match) {
      rows.push(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td valign="top" width="36%" style="padding:8px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:13px;color:${C.muted};">${escapeHtml(match[1] ?? "")}</td>
  <td valign="top" style="padding:8px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;color:${C.ink};word-break:break-word;">${escapeHtml(match[2] ?? "")}</td>
</tr></table>`,
      );
    } else {
      rows.push(
        `<p style="margin:8px 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.charcoal};white-space:pre-wrap;">${escapeHtml(line)}</p>`,
      );
    }
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${C.bone};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bone}"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
    <tr><td bgcolor="${C.ink}" style="background:${C.ink};padding:16px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td><img src="${MONOGRAM_LIGHT_URL}" width="40" alt="AB" style="display:block;width:40px;height:auto;border:0;" /></td>
        <td align="right" style="font-family:${SANS};font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#f1efea;">Store notification · ${escapeHtml(input.type)}</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${C.paper}" style="background:${C.paper};border:1px solid ${C.line};border-top:0;padding:30px 28px 34px;">
      <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:24px;line-height:1.25;font-weight:400;color:${C.ink};">${escapeHtml(input.subject)}</h1>
      ${rows.join("\n")}
    </td></tr>
    <tr><td align="center" style="padding:16px;font-family:${SANS};font-size:11px;color:${C.muted};">Sent from ${escapeHtml(SITE_URL)} · Reply to respond to the customer directly.</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
