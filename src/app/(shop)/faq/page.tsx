import { FaqContent } from "./FaqContent";
import { FAQS } from "@/lib/site";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata, faqJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "FAQ",
  description:
    "Answers about ordering, payment, stock, shipping, and how AB Collection uses your details.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
          faqJsonLd(FAQS),
        ]}
      />
      <FaqContent />
    </>
  );
}
