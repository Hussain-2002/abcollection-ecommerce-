import {
  MEMBERSHIP_SOURCE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  daysLeft,
  formatIstDate,
  type PublicMembership,
} from "@/lib/membership";
import { cn } from "@/lib/utils";

/** The membership "card": ID, status, source and dates (shown in IST). */
export function MembershipCard({
  membership,
  className,
}: {
  membership: PublicMembership;
  className?: string;
}) {
  const active = membership.status === "active";
  return (
    <div
      className={cn(
        "relative overflow-hidden p-6 sm:p-8",
        active ? "bg-ink text-white" : "border border-border bg-paper",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              "text-[0.7rem] tracking-[0.2em] uppercase",
              active ? "text-white/60" : "text-muted-foreground",
            )}
          >
            {membership.planName}
          </p>
          <p className="editorial mt-2 text-[clamp(1.6rem,4vw,2.2rem)] leading-none">
            {membership.membershipNumber}
          </p>
        </div>
        <span
          className={cn(
            "px-2 py-1 text-[0.62rem] tracking-[0.16em] uppercase",
            active ? "bg-white text-ink" : "border border-border text-muted-foreground",
          )}
        >
          {MEMBERSHIP_STATUS_LABELS[membership.status]}
        </span>
      </div>
      <dl
        className={cn(
          "mt-8 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4",
          active ? "text-white" : "",
        )}
      >
        {[
          ["Starts", formatIstDate(membership.startsAt)],
          ["Expires", formatIstDate(membership.expiresAt)],
          ["Source", MEMBERSHIP_SOURCE_LABELS[membership.source]],
          [
            active ? "Days left" : "Purchased",
            active ? String(daysLeft(membership.expiresAt)) : formatIstDate(membership.purchasedAt),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt
              className={cn(
                "text-[0.66rem] tracking-[0.16em] uppercase",
                active ? "text-white/55" : "text-muted-foreground",
              )}
            >
              {label}
            </dt>
            <dd className="mt-1">{value}</dd>
          </div>
        ))}
      </dl>
      {active ? (
        <img
          src="/brand/ab-monogram-light-sm.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-4 -bottom-6 h-28 w-auto opacity-[0.08]"
        />
      ) : null}
    </div>
  );
}
