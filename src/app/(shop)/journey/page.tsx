import Link from "next/link";

import { FollowButton, ReelGrid, ReelRail } from "@/components/journey/Journey";
import { Reveal } from "@/components/Reveal";
import { FOUNDER_HANDLE, FOUNDER_INSTAGRAM, compactCount, mostViewed } from "@/lib/founder-journey";
import { getFounderReels } from "@/lib/instagram.server";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "Founder's journey",
  description:
    "Follow Abbas building AB Collection in public: the fabric hunts, the pricing calls and the first orders, one reel at a time.",
  path: "/journey",
  image: "/journey/Db4zobRvJo2.webp",
});

export default async function JourneyPage() {
  const { reels } = await getFounderReels();
  const origin = reels.find((reel) => reel.kind === "story") ?? mostViewed(reels, 1)[0];
  const latest = [...reels]
    .filter((reel) => reel.id !== origin?.id)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Founder's journey", path: "/journey" },
        ])}
      />

      <section className="page-wrap grid items-center gap-12 py-[clamp(3rem,8vw,6rem)] min-[900px]:min-h-[calc(100svh-var(--header-h)-var(--announce-h))] min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div>
          <p className="eyebrow mb-5">Founder&apos;s journey</p>
          <h1 className="editorial text-[clamp(3.4rem,10vw,8.5rem)] leading-[0.9]">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="animate-line-up inline-block">Built in</span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="animate-line-up inline-block [animation-delay:120ms]">
                <em>public.</em>
              </span>
            </span>
          </h1>
          <p className="mt-7 max-w-[38ch] text-[1.05rem] leading-relaxed text-charcoal">
            Abbas is building AB Collection from scratch, and sharing every step of it on Instagram.
          </p>
          <div className="mt-9 flex flex-wrap gap-2.5">
            <Link
              href="#reels"
              className="inline-flex min-h-12 items-center bg-ink px-7 text-[0.74rem] tracking-[0.18em] text-white uppercase transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#333] active:scale-[0.97]"
            >
              Watch the reels
            </Link>
            <FollowButton />
          </div>
        </div>

        {origin ? (
          <Reveal delay={150} className="mx-auto w-full max-w-[300px] min-[900px]:max-w-[360px]">
            <ReelRail
              reels={[origin]}
              className="auto-cols-[100%] sm:auto-cols-[100%] min-[1000px]:auto-cols-[100%]"
            />
            <p className="mt-3 text-center text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
              Where it started · {compactCount(origin.views)} views
            </p>
          </Reveal>
        ) : null}
      </section>

      {latest.length ? (
        <section
          id="reels"
          className="scroll-mt-[calc(var(--header-h)+1rem)] border-t border-border py-[clamp(3.5rem,8vw,6rem)]"
          aria-labelledby="reels-heading"
        >
          <div className="page-wrap">
            <div className="mb-[clamp(1.5rem,3vw,2.5rem)] flex flex-wrap items-end justify-between gap-6">
              <h2 id="reels-heading" className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.05]">
                Latest reels
              </h2>
              <a
                href={FOUNDER_INSTAGRAM}
                target="_blank"
                rel="noreferrer noopener"
                className="border-b border-current pb-0.5 text-[0.74rem] tracking-[0.18em] uppercase"
              >
                See all on Instagram
              </a>
            </div>
            <ReelGrid reels={latest} />
          </div>
        </section>
      ) : null}

      <section className="page-wrap pb-[clamp(4rem,9vw,7rem)] text-center">
        <Reveal>
          <h2 className="editorial text-[clamp(2.4rem,6vw,4.5rem)] leading-none">Follow along.</h2>
          <p className="mt-4 text-muted-foreground">New reels most days at @{FOUNDER_HANDLE}</p>
          <FollowButton className="mt-8" />
        </Reveal>
      </section>
    </>
  );
}
